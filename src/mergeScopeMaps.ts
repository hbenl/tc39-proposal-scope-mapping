import { EncodedSourceMap, TraceMap, eachMapping, originalPositionFor, generatedPositionFor } from "@jridgewell/trace-mapping";
import { BindingRange, GeneratedRange, Location, OriginalScope } from "./types";
import { assert, collectGeneratedRangeParents, collectGeneratedRangesByLocation, compareLocations, isBefore, isEqual, isInRange, rangeKey } from "./util";

export interface ScopeMap {
  originalScopes: OriginalScope[];
  generatedRanges: GeneratedRange;
}

interface MergedRange {
  generatedRange: GeneratedRange;
  intermediateGeneratedRange: GeneratedRange;
  mergedGeneratedRange: GeneratedRange;
}

// Merges the ScopeMaps of two consecutive transpilation steps, i.e. an original
// source was transpiled into an intermediate source which was then transpiled into
// the final generated source.
// sourceMap1 maps from the original to the intermediate source,
// sourceMap2 from the intermediate to the generated source.
// Current limitations:
// - only simple binding expressions
export function mergeScopeMaps(
  sourceMaps1: (EncodedSourceMap & ScopeMap)[],
  sourceMap2: EncodedSourceMap & ScopeMap
): ScopeMap {
  // generatedRangeParents contains GeneratedRanges in the generated
  // source which reference OriginalScopes in the intermediate source.
  const generatedRangeParents = collectGeneratedRangeParents(sourceMap2.generatedRanges);
  // intermediateGeneratedRangesByLocation contains GeneratedRanges in the intermediate
  // source which reference OriginalScopes in the original source.
  const intermediateGeneratedRangesByLocation = sourceMaps1.map(
    sourceMap => collectGeneratedRangesByLocation(sourceMap.generatedRanges)
  );

  // sourceIndicesForOriginalScopes maps the OriginalScopes in the
  // intermediate sources to their sourceIndices
  const sourceIndicesForOriginalScopes = new Map<OriginalScope, number>();
  sourceMap2.originalScopes.forEach((originalScope, sourceIndex) => {
    function setSourceIndexForOriginalScope(originalScope: OriginalScope) {
      sourceIndicesForOriginalScopes.set(originalScope, sourceIndex);
      originalScope.children?.forEach(setSourceIndexForOriginalScope);
    }
    setSourceIndexForOriginalScope(originalScope);
  });

  const originalScopes: OriginalScope[] = [];
  const originalSourceOffsets: number[] = [];
  for (const sourceMap of sourceMaps1) {
    originalSourceOffsets.push(originalScopes.length);
    originalScopes.push(...sourceMap.originalScopes);
  }

  const traceMaps1 = sourceMaps1.map(sourceMap => new TraceMap(sourceMap));
  const traceMap2 = new TraceMap(sourceMap2);

  function applyScopeMapToGeneratedRange(
    generatedRange: GeneratedRange
  ): MergedRange[] {
    const { start, end, isScope } = generatedRange;

    const mergedChildren = generatedRange.children?.flatMap(applyScopeMapToGeneratedRange) ?? [];

    if (!generatedRange.original) {
      return mergedChildren;
    }

    // generatedRange.original is an original scope from the second scope map,
    // find the corresponding generated range from the first scope map
    const sourceIndex = sourceIndicesForOriginalScopes.get(generatedRange.original.scope)!;
    const intermediateGeneratedRange = intermediateGeneratedRangesByLocation[sourceIndex]
      .get(rangeKey(generatedRange.original.scope));

    if (!intermediateGeneratedRange) {
      return mergedChildren;
    }

    let original: GeneratedRange["original"] = undefined;
    if (intermediateGeneratedRange.original) {
      const { scope, bindings } = intermediateGeneratedRange.original;
      let callsite = intermediateGeneratedRange.original.callsite;
      if (generatedRange.original.callsite) {
        const mappedCallsite = originalPositionFor(traceMaps1[sourceIndex], {
          line: generatedRange.original.callsite.line + 1,
          column: generatedRange.original.callsite.column,
        });
        if (mappedCallsite.source != null && mappedCallsite.line != null && mappedCallsite.column != null) {
          callsite = {
            sourceIndex: sourceMaps1[sourceIndex].sources.indexOf(mappedCallsite.source) + originalSourceOffsets[sourceIndex],
            line: mappedCallsite.line - 1,
            column: mappedCallsite.column
          };
        } else {
          callsite = undefined;
        }
      }
      original = {
        scope,
        bindings: bindings?.map(binding => applyScopeMapToBinding(
          binding,
          generatedRange,
          generatedRangeParents,
          sourceMap2.sources[sourceIndex]!,
          traceMap2
        )),
        callsite,
      };
    }

    const mappedChildren: GeneratedRange[] = [];
    for (const child of intermediateGeneratedRange.children ?? []) {
      if (!mergedChildren.some(mergedChild => mergedChild.intermediateGeneratedRange === child)) {
        const mappedChild = mapIntermediateGeneratedRange(child, sourceIndex, generatedRange, mergedChildren);
        if (mappedChild) {
          mappedChildren.push(mappedChild);
        }
      }
    }
    sortByStartLocation(mappedChildren);

    const children = generatedRangesUnion(
      mappedChildren,
      mergedChildren.map(({ mergedGeneratedRange }) => mergedGeneratedRange)
    );

    return [{
      generatedRange,
      intermediateGeneratedRange,
      mergedGeneratedRange: { start, end, isScope, original, children },
    }];
  }

  function mapIntermediateGeneratedRange(
    intermediateGeneratedRange: GeneratedRange,
    intermediateSourceIndex: number,
    generatedRangeParent: GeneratedRange,
    mergedGeneratedRanges: MergedRange[]
  ): GeneratedRange | undefined {
    const children: GeneratedRange[] = [];
    for (const intermediateChild of intermediateGeneratedRange.children ?? []) {
      let child = mergedGeneratedRanges.find(merged =>
        merged.intermediateGeneratedRange === intermediateChild
      )?.mergedGeneratedRange;
      if (!child) {
        child = mapIntermediateGeneratedRange(
          intermediateChild,
          intermediateSourceIndex,
          generatedRangeParent,
          mergedGeneratedRanges
        );
      }
      if (child) {
        children.push(child);
      }
    }

    let inlinedRange = findInlinedRange(intermediateGeneratedRange, generatedRangeParent, traceMap2);
    if (!inlinedRange) {
      if (children.length === 0) {
        return undefined;
      }
      inlinedRange = { start: children[0].start, end: children[0].end };
    }
    for (const child of children) {
      if (isBefore(child.start, inlinedRange.start)) {
        inlinedRange.start = child.start;
      }
      if (isBefore(inlinedRange.end, child.end)) {
        inlinedRange.end = child.end;
      }
    }

    let original: GeneratedRange["original"] = undefined;
    if (intermediateGeneratedRange.original) {
      original = {
        scope: intermediateGeneratedRange.original.scope,
        bindings: intermediateGeneratedRange.original.bindings?.map(
          binding => applyScopeMapToBinding(
            binding,
            generatedRangeParent,
            generatedRangeParents,
            sourceMap2.sources[intermediateSourceIndex]!,
            traceMap2
          )
        ),
      };
      const intermediateCallsite = intermediateGeneratedRange.original.callsite;
      if (intermediateCallsite) {
        original.callsite = {
          ...intermediateCallsite,
          sourceIndex: intermediateCallsite.sourceIndex + originalSourceOffsets[intermediateSourceIndex]
        };
      }
    }

    return {
      ...inlinedRange,
      isScope: false,
      children,
      original,
    };
  }

  const mergedRanges = applyScopeMapToGeneratedRange(sourceMap2.generatedRanges);
  let generatedRanges = mergedRanges[0].mergedGeneratedRange;
  if (mergedRanges.length > 1) {
    generatedRanges = {
      start: mergedRanges[0].mergedGeneratedRange.start,
      end: mergedRanges[mergedRanges.length - 1].mergedGeneratedRange.end,
      isScope: false,
      children: mergedRanges.map(mergedRange => mergedRange.mergedGeneratedRange),
    }
  }

  return { originalScopes, generatedRanges };
}

function findInlinedRange(
  intermediateGeneratedRange: GeneratedRange,
  generatedRangeParent: GeneratedRange,
  tracemap: TraceMap
) {
  let start: Location | undefined;
  let end: Location | undefined;
  let finished = false;
  eachMapping(tracemap, mapping => {
    if (finished) {
      return;
    }
    const { originalLine, originalColumn, generatedLine, generatedColumn } = mapping;
    if (
      originalLine != null &&
      originalColumn != null &&
      isInRange({ line: originalLine - 1, column: originalColumn }, intermediateGeneratedRange) &&
      isInRange({ line: generatedLine - 1, column: generatedColumn }, generatedRangeParent)
    ) {
      end = {
        line: mapping.generatedLine - 1,
        column: mapping.generatedColumn,
      };
      if (!start) {
        start = end;
      }
    } else {
      if (start && end) {
        finished = true;
      }
    }
  });
  if (start && end) {
    return { start, end };
  }
}

function sortByStartLocation(generatedRanges: GeneratedRange[]) {
  generatedRanges.sort((range1, range2) => compareLocations(range1.start, range2.start));
}

function findNextGeneratedRange(location: Location, generatedRanges: GeneratedRange[]): GeneratedRange | undefined {
  for (const generatedRange of generatedRanges) {
    if (!isBefore(generatedRange.start, location)) {
      return generatedRange;
    }
  }
}

function generatedRangesUnion(generatedRanges1: GeneratedRange[], generatedRanges2: GeneratedRange[]): GeneratedRange[] {
  if (generatedRanges1.length === 0) {
    return generatedRanges2;
  }
  if (generatedRanges2.length === 0) {
    return generatedRanges1;
  }
  const union: GeneratedRange[] = [];
  let location = isBefore(generatedRanges1[0].start, generatedRanges2[0].start) ?
    generatedRanges1[0].start :
    generatedRanges2[0].start;
  while (true) {
    const generatedRange1 = findNextGeneratedRange(location, generatedRanges1);
    const generatedRange2 = findNextGeneratedRange(location, generatedRanges2);
    if (!generatedRange1) {
      if (generatedRange2) {
        union.push(generatedRange2);
        location = generatedRange2.end;
      } else {
        return union;
      }
    } else {
      if (!generatedRange2) {
        union.push(generatedRange1);
        location = incrementLocation(generatedRange1.end);
      } else {
        if (isBefore(generatedRange2.start, generatedRange1.start)) {
          union.push(generatedRange2);
          location = incrementLocation(generatedRange2.end);
        } else {
          union.push(generatedRange1);
          location = incrementLocation(generatedRange1.end);
        }
      }
    }
  }
}

function incrementLocation(location: Location): Location {
  return { line: location.line, column: location.column + 1 };
}

// Substitute original variables in binding expressions with their corresponding generated expressions
function applyScopeMapToBinding(
  binding: string | BindingRange[] | undefined,
  generatedRange: GeneratedRange,
  generatedRangeParents: Map<GeneratedRange, GeneratedRange>,
  source: string,
  traceMap: TraceMap
): string | BindingRange[] | undefined {
  if (Array.isArray(binding)) {
    return binding.flatMap(bindingRange => {
      const { start: originalStart, end: originalEnd, expression: originalExpression } = bindingRange;

      const start = generatedPositionFor(traceMap, { ...originalStart, source });
      // TODO what if start/end couldn't be mapped?
      assert(start.line && start.column);
      const end = generatedPositionFor(traceMap, { ...originalEnd, source });
      assert(end.line && end.column);

      const binding = applyScopeMapToExpression(originalExpression, start, end, generatedRange, generatedRangeParents);
      return Array.isArray(binding) ? binding : [{ start, end, expression: binding }];
    });
  }

  return applyScopeMapToExpression(binding, generatedRange.start, generatedRange.end, generatedRange, generatedRangeParents);
}

function applyScopeMapToExpression(
  expression: string | undefined,
  start: Location,
  end: Location,
  generatedRange: GeneratedRange,
  generatedRangeParents: Map<GeneratedRange, GeneratedRange>
): string | undefined | BindingRange[] {
  if (expression === undefined) {
    return undefined;
  }
  const substitutions = new Map<string, BindingRange[]>();
  for (const variable of getFreeVariables(expression)) {
    const binding = lookupBinding(variable, generatedRange, generatedRangeParents);
    // TODO check that the free variables in `expr` aren't shadowed
    if (binding) {
      if (Array.isArray(binding.value)) {
        substitutions.set(variable, binding.value);
      } else {
        substitutions.set(variable, [{ start, end, expression: binding.value }]);
      }
    }
  }

  const substitutionRanges = createSubstitutionRanges(start, end, substitutions);

  const bindingRanges = substitutionRanges.map(substitutionRange => ({
    start: substitutionRange.start,
    end: substitutionRange.end,
    expression: substituteFreeVariables(expression, substitutionRange.substitutions)
  }));
  mergeBindingRangesWithSameExpression(bindingRanges);

  return bindingRanges.length === 1 ? bindingRanges[0].expression : bindingRanges;
}

function mergeBindingRangesWithSameExpression(bindingRanges: BindingRange[]): void {
  let i = 0;
  while (i < bindingRanges.length - 1) {
    if (bindingRanges[i].expression === bindingRanges[i + 1].expression) {
      bindingRanges.splice(i, 2, {
        start: bindingRanges[i].start,
        end: bindingRanges[i + 1].end,
        expression: bindingRanges[i].expression
      });
    } else {
      i++;
    }
  }
}

interface SubstitutionRange {
  start: Location;
  end: Location;
  substitutions: Map<string, string | undefined>;
}

function createSubstitutionRanges(
  start: Location,
  end: Location,
  substitutions: Map<string, BindingRange[]>
): SubstitutionRange[] {
  if (substitutions.size === 0) {
    return [{ start, end, substitutions: new Map<string, string | undefined>() }];
  }

  const boundaries: Location[] = [...substitutions.values()]
    .flat()
    .flatMap(bindingRange => [bindingRange.start, bindingRange.end])
    .filter(location => isBefore(start, location) && isBefore(location, end));
  boundaries.push(start, end);
  boundaries.sort(compareLocations);
  removeDuplicateLocations(boundaries);

  const result: SubstitutionRange[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const substitutionsInThisRange = new Map<string, string | undefined>();
    for (const key of substitutions.keys()) {
      const bindingRange = substitutions.get(key)?.find(bindingRange => !isBefore(boundaries[i], bindingRange.start) && !isBefore(bindingRange.end, boundaries[i]));
      substitutionsInThisRange.set(key, bindingRange?.expression);
    }
    result.push({ start: boundaries[i], end: boundaries[i + 1], substitutions: substitutionsInThisRange });
  }  

  return result;
}

function removeDuplicateLocations(locations: Location[]) {
  let i = 0;
  while (i < locations.length - 1) {
    if (isEqual(locations[i], locations[i + 1])) {
      locations.splice(i, 1);
    } else {
      i++;
    }
  }
}

// TODO the following functions only handle some simple expressions
// but should handle arbitrary javascript expressions
const numberRegex = /^\s*[+-]?(\d+|\d*\.\d+|\d+\.\d*)([Ee][+-]?\d+)?\s*$/;
function getFreeVariables(expression: string): string[] {
  if (
    ["undefined", "null", "true", "false"].includes(expression) ||
    numberRegex.test(expression) ||
    (expression.startsWith('"') && expression.endsWith('"'))
  ) {
    return [];
  }
  return [expression];
}

function substituteFreeVariables(
  expression: string,
  substitutions: Map<string, string | undefined>
): string | undefined {
  return substitutions.has(expression) ? substitutions.get(expression) : expression;
}

function lookupBinding(
  expression: string,
  generatedRange: GeneratedRange,
  parentRanges: Map<GeneratedRange, GeneratedRange>
): { value: string | undefined | BindingRange[] } | undefined {
  if (["undefined", "null", "true", "false"].includes(expression)) {
    return { value: expression };
  }
  if (numberRegex.test(expression)) {
    return { value: expression };
  }
  if (expression.startsWith('"') && expression.endsWith('"')) {
    return { value: expression };
  }
  let current: GeneratedRange | undefined = generatedRange;
  while (current) {
    if (current.original) {
      const index = current.original.scope.variables?.findIndex(variable => expression === variable);
      if (typeof index === "number" && index >= 0) {
        return { value: current.original.bindings![index] };
      }
    }
    current = parentRanges.get(current);
  }
  return undefined;
}
