import { EncodedSourceMap, TraceMap, eachMapping, originalPositionFor, generatedPositionFor } from "@jridgewell/trace-mapping";
import { decode, Binding, SubRangeBinding } from "@chrome-devtools/source-map-scopes-codec";
import { GeneratedRange, Location, LocationRange, OriginalScope } from "./types";
import { assert, collectGeneratedRangeParents, collectGeneratedRangesByLocation, compareLocations, isBefore, isEqual, isInRange, isOverlapping, rangeKey } from "./util";

interface SourceMapWithScopes extends EncodedSourceMap {
  scopes: string;
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
  sourceMaps1: SourceMapWithScopes[],
  sourceMap2: SourceMapWithScopes
): { originalScopes: (OriginalScope | null)[], generatedRanges: GeneratedRange[] } {
  const { scopes: sourceMap2Scopes, ranges: sourceMap2Ranges } = decode(sourceMap2);
  // generatedRangeParents contains GeneratedRanges in the generated
  // source which reference OriginalScopes in the intermediate source.
  const generatedRangeParents = new Map<GeneratedRange, GeneratedRange>();
  sourceMap2Ranges.forEach(range => collectGeneratedRangeParents(range, generatedRangeParents));

  // sourceIndicesForOriginalScopes maps the OriginalScopes in the
  // intermediate sources to their sourceIndices
  const sourceIndicesForOriginalScopes = new Map<OriginalScope, number>();
  sourceMap2Scopes.forEach((originalScope, sourceIndex) => {
    function setSourceIndexForOriginalScope(originalScope: OriginalScope) {
      sourceIndicesForOriginalScopes.set(originalScope, sourceIndex);
      originalScope.children?.forEach(setSourceIndexForOriginalScope);
    }
    if (originalScope) {
      setSourceIndexForOriginalScope(originalScope);
    }
  });

  // intermediateGeneratedRangesByLocation contains GeneratedRanges in the intermediate
  // source which reference OriginalScopes in the original source.
  const intermediateGeneratedRangesByLocation: Map<string, GeneratedRange>[] = [];
  const originalScopes: (OriginalScope | null)[] = [];
  const originalSourceOffsets: number[] = [];
  for (const sourceMap of sourceMaps1) {
    const { scopes, ranges } = decode(sourceMap);
    intermediateGeneratedRangesByLocation.push(collectGeneratedRangesByLocation(ranges));
    originalSourceOffsets.push(originalScopes.length);
    originalScopes.push(...scopes);
  }

  const traceMaps1 = sourceMaps1.map(sourceMap => new TraceMap(sourceMap));
  const traceMap2 = new TraceMap(sourceMap2);

  function applyScopeMapToGeneratedRange(
    generatedRange: GeneratedRange
  ): MergedRange[] {
    const { start, end, isStackFrame, isHidden } = generatedRange;

    const mergedChildren = generatedRange.children?.flatMap(applyScopeMapToGeneratedRange) ?? [];

    if (!generatedRange.originalScope) {
      return mergedChildren;
    }

    // generatedRange.original is an original scope from the second scope map,
    // find the corresponding generated range from the first scope map
    const sourceIndex = sourceIndicesForOriginalScopes.get(generatedRange.originalScope)!;
    const intermediateGeneratedRange = intermediateGeneratedRangesByLocation[sourceIndex]
      .get(rangeKey(generatedRange.originalScope));

    if (!intermediateGeneratedRange) {
      return mergedChildren;
    }

    let originalScope = intermediateGeneratedRange.originalScope;
    let values: GeneratedRange["values"] = [];
    let callSite: GeneratedRange["callSite"] = undefined;
    if (originalScope) {
      values = intermediateGeneratedRange.values.map(binding => applyScopeMapToBinding(
        binding,
        generatedRange,
        generatedRangeParents,
        sourceMap2.sources[sourceIndex]!,
        traceMap2
      ));
      callSite = intermediateGeneratedRange.callSite;
      if (generatedRange.callSite) {
        const mappedCallsite = originalPositionFor(traceMaps1[sourceIndex], {
          line: generatedRange.callSite.line + 1,
          column: generatedRange.callSite.column,
        });
        if (mappedCallsite.source != null && mappedCallsite.line != null && mappedCallsite.column != null) {
          callSite = {
            sourceIndex: sourceMaps1[sourceIndex].sources.indexOf(mappedCallsite.source) + originalSourceOffsets[sourceIndex],
            line: mappedCallsite.line - 1,
            column: mappedCallsite.column
          };
        } else {
          callSite = undefined;
        }
      }
    }

    const mappedChildren: GeneratedRange[] = [];
    for (const child of intermediateGeneratedRange.children ?? []) {
      if (!mergedChildren.some(mergedChild => mergedChild.intermediateGeneratedRange === child)) {
        mappedChildren.push(...mapIntermediateGeneratedRange(child, sourceIndex, generatedRange, mergedChildren));
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
      mergedGeneratedRange: { start, end, isStackFrame, isHidden, originalScope, values, callSite, children },
    }];
  }

  function mapIntermediateGeneratedRange(
    intermediateGeneratedRange: GeneratedRange,
    intermediateSourceIndex: number,
    generatedRangeParent: GeneratedRange,
    mergedGeneratedRanges: MergedRange[]
  ): GeneratedRange[] {
    const { isHidden } = intermediateGeneratedRange;
    const children: GeneratedRange[] = [];
    for (const intermediateChild of intermediateGeneratedRange.children ?? []) {
      let child = mergedGeneratedRanges.find(merged =>
        merged.intermediateGeneratedRange === intermediateChild
      )?.mergedGeneratedRange;
      if (child) {
        children.push(child);
      } else {
        children.push(...mapIntermediateGeneratedRange(
          intermediateChild,
          intermediateSourceIndex,
          generatedRangeParent,
          mergedGeneratedRanges
        ));
      }
    }

    const inlinedRanges = findInlinedRanges(intermediateGeneratedRange, generatedRangeParent, traceMap2);
    return inlinedRanges.map(inlinedRange => {
      const rangeChildren: GeneratedRange[] = [];
      for (const child of children) {
        if (isOverlapping(child, inlinedRange)) {
          rangeChildren.push(child);
          if (isBefore(child.start, inlinedRange.start)) {
            inlinedRange.start = child.start;
          }
          if (isBefore(inlinedRange.end, child.end)) {
            inlinedRange.end = child.end;
          }
        }
      }

      let originalScope = intermediateGeneratedRange.originalScope;
      let values: GeneratedRange["values"] = [];
      let callSite: GeneratedRange["callSite"] = undefined;
      if (originalScope) {
        values = intermediateGeneratedRange.values.map(
          binding => applyScopeMapToBinding(
            binding,
            generatedRangeParent,
            generatedRangeParents,
            sourceMap2.sources[intermediateSourceIndex]!,
            traceMap2
          )
        );
        const intermediateCallsite = intermediateGeneratedRange.callSite;
        if (intermediateCallsite) {
          callSite = {
            ...intermediateCallsite,
            sourceIndex: intermediateCallsite.sourceIndex + originalSourceOffsets[intermediateSourceIndex]
          };
        }
      }

      return {
        ...inlinedRange,
        children: rangeChildren,
        originalScope,
        values,
        callSite,
        isStackFrame: false,
        isHidden,
      };
    });
  }

  const mergedRanges = sourceMap2Ranges.flatMap(range => applyScopeMapToGeneratedRange(range));

  return { originalScopes, generatedRanges: mergedRanges.map(mergedRange => mergedRange.mergedGeneratedRange) };
}

function findInlinedRanges(
  intermediateGeneratedRange: GeneratedRange,
  generatedRangeParent: GeneratedRange,
  tracemap: TraceMap
): LocationRange[] {
  let start: Location | undefined;
  let end: Location | undefined;
  const ranges: LocationRange[] = [];
  function saveCurrentRange() {
    if (start && end) {
      ranges.push({ start, end });
      start = undefined;
      end = undefined;
    }
  }

  eachMapping(tracemap, mapping => {
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
      saveCurrentRange();
    }
  });
  saveCurrentRange();

  return ranges;
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
  binding: Binding,
  generatedRange: GeneratedRange,
  generatedRangeParents: Map<GeneratedRange, GeneratedRange>,
  source: string,
  traceMap: TraceMap
): Binding {
  if (Array.isArray(binding)) {
    return binding.flatMap(bindingRange => {
      const { from: originalStart, to: originalEnd, value: originalExpression } = bindingRange;

      const start = generatedPositionFor(traceMap, { ...originalStart, source });
      // TODO what if start/end couldn't be mapped?
      assert(start.line && start.column);
      const end = generatedPositionFor(traceMap, { ...originalEnd, source });
      assert(end.line && end.column);

      const binding = applyScopeMapToExpression(originalExpression ?? null, start, end, generatedRange, generatedRangeParents);
      return Array.isArray(binding) ? binding : [{ from: start, to: end, value: binding ?? undefined }];
    });
  }

  return applyScopeMapToExpression(binding, generatedRange.start, generatedRange.end, generatedRange, generatedRangeParents);
}

function applyScopeMapToExpression(
  expression: string | null,
  start: Location,
  end: Location,
  generatedRange: GeneratedRange,
  generatedRangeParents: Map<GeneratedRange, GeneratedRange>
): Binding {
  if (expression === null) {
    return null;
  }
  const substitutions = new Map<string, SubRangeBinding[]>();
  for (const variable of getFreeVariables(expression)) {
    const binding = lookupBinding(variable, generatedRange, generatedRangeParents);
    // TODO check that the free variables in `expr` aren't shadowed
    if (binding) {
      if (Array.isArray(binding.value)) {
        substitutions.set(variable, binding.value);
      } else {
        substitutions.set(variable, [{ from: start, to: end, value: binding.value ?? undefined }]);
      }
    }
  }

  const substitutionRanges = createSubstitutionRanges(start, end, substitutions);

  const bindingRanges = substitutionRanges.map(substitutionRange => ({
    from: substitutionRange.start,
    to: substitutionRange.end,
    value: substituteFreeVariables(expression, substitutionRange.substitutions)
  }));
  mergeBindingRangesWithSameExpression(bindingRanges);

  return bindingRanges.length === 1 ? bindingRanges[0].value ?? null : bindingRanges;
}

function mergeBindingRangesWithSameExpression(bindingRanges: SubRangeBinding[]): void {
  let i = 0;
  while (i < bindingRanges.length - 1) {
    if (bindingRanges[i].value === bindingRanges[i + 1].value) {
      bindingRanges.splice(i, 2, {
        from: bindingRanges[i].from,
        to: bindingRanges[i + 1].to,
        value: bindingRanges[i].value
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
  substitutions: Map<string, SubRangeBinding[]>
): SubstitutionRange[] {
  if (substitutions.size === 0) {
    return [{ start, end, substitutions: new Map<string, string | undefined>() }];
  }

  const boundaries: Location[] = [...substitutions.values()]
    .flat()
    .flatMap(bindingRange => [bindingRange.from, bindingRange.to])
    .filter(location => isBefore(start, location) && isBefore(location, end));
  boundaries.push(start, end);
  boundaries.sort(compareLocations);
  removeDuplicateLocations(boundaries);

  const result: SubstitutionRange[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const substitutionsInThisRange = new Map<string, string | undefined>();
    for (const key of substitutions.keys()) {
      const bindingRange = substitutions.get(key)?.find(bindingRange => !isBefore(boundaries[i], bindingRange.from) && !isBefore(bindingRange.to, boundaries[i]));
      substitutionsInThisRange.set(key, bindingRange?.value);
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
): { value: Binding } | undefined {
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
    if (current.originalScope) {
      const index = current.originalScope.variables?.findIndex(variable => expression === variable);
      if (typeof index === "number" && index >= 0) {
        return { value: current.values![index] };
      }
    }
    current = parentRanges.get(current);
  }
  return undefined;
}
