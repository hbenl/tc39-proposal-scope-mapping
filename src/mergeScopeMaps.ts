import { EncodedSourceMap, TraceMap, eachMapping, originalPositionFor } from "@jridgewell/trace-mapping";
import { BindingRange, GeneratedRange, Location, OriginalScope } from "./types";
import { collectGeneratedRangeParents, collectGeneratedRangesByLocation, compareLocations, isBefore, isInRange, rangeKey } from "./util";

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
// - only one original source
// - only simple binding expressions
// - no binding ranges in sourceMap2
export function mergeScopeMaps(
  sourceMap1: EncodedSourceMap & ScopeMap,
  sourceMap2: EncodedSourceMap & ScopeMap
): ScopeMap {
  // generatedRangeParents contains GeneratedRanges in the generated
  // source which reference OriginalScopes in the intermediate source.
  const generatedRangeParents = collectGeneratedRangeParents(sourceMap2.generatedRanges);
  // intermediateGeneratedRangesByLocation contains GeneratedRanges in the intermediate
  // source which reference OriginalScopes in the original source.
  const intermediateGeneratedRangesByLocation = collectGeneratedRangesByLocation(sourceMap1.generatedRanges);

  const traceMap1 = new TraceMap(sourceMap1);
  const traceMap2 = new TraceMap(sourceMap2);

  function applyScopeMapToGeneratedRange(
    generatedRange: GeneratedRange,
  ): MergedRange[] {
    const { start, end, isScope } = generatedRange;

    const mergedChildren = generatedRange.children?.flatMap(applyScopeMapToGeneratedRange) ?? [];

    // generatedRange.original is an original scope from the second scope map,
    // find the corresponding generated range from the first scope map
    const intermediateGeneratedRange = intermediateGeneratedRangesByLocation.get(rangeKey(generatedRange.original.scope));

    if (intermediateGeneratedRange) {
      const { scope, bindings } = intermediateGeneratedRange.original;
      let callsite = intermediateGeneratedRange.original.callsite;
      if (generatedRange.original.callsite) {
        const mappedCallsite = originalPositionFor(traceMap1, {
          line: generatedRange.original.callsite.line + 1,
          column: generatedRange.original.callsite.column,
        });
        if (mappedCallsite.source != null && mappedCallsite.line != null && mappedCallsite.column != null) {
          //TODO sourceIndex!
          callsite = { sourceIndex: 0, line: mappedCallsite.line - 1, column: mappedCallsite.column };
        } else {
          callsite = undefined;
        }
      }
      const original: GeneratedRange["original"] = {
        scope,
        bindings: bindings?.map(binding => applyScopeMapToBinding(binding, generatedRange, generatedRangeParents)),
        callsite,
      };

      const mappedChildren: GeneratedRange[] = [];
      for (const child of intermediateGeneratedRange.children ?? []) {
        if (!mergedChildren.some(mergedChild => mergedChild.intermediateGeneratedRange === child)) {
          const mappedChild = mapIntermediateGeneratedRange(child, generatedRange, mergedChildren);
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

    return mergedChildren;
  }

  function mapIntermediateGeneratedRange(
    intermediateGeneratedRange: GeneratedRange,
    generatedRangeParent: GeneratedRange,
    mergedGeneratedRanges: MergedRange[]
  ): GeneratedRange | undefined {
    const children: GeneratedRange[] = [];
    for (const intermediateChild of intermediateGeneratedRange.children ?? []) {
      let child = mergedGeneratedRanges.find(merged => 
        merged.intermediateGeneratedRange === intermediateGeneratedRange && !merged.generatedRange.original.callsite
      )?.mergedGeneratedRange;
      if (!child) {
        child = mapIntermediateGeneratedRange(intermediateChild, generatedRangeParent, mergedGeneratedRanges);
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

    return {
      ...inlinedRange,
      isScope: false,
      children,
      original: {
        scope: intermediateGeneratedRange.original.scope,
        bindings: intermediateGeneratedRange.original.bindings?.map(
          binding => applyScopeMapToBinding(binding, generatedRangeParent, generatedRangeParents)
        ),
        callsite: intermediateGeneratedRange.original.callsite
      }
    };
  }

  return {
    originalScopes: sourceMap1.originalScopes,
    generatedRanges: applyScopeMapToGeneratedRange(sourceMap2.generatedRanges)[0].mergedGeneratedRange,
  };
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
        location = generatedRange1.end;
      } else {
        if (isBefore(generatedRange2.start, generatedRange1.start)) {
          union.push(generatedRange2);
          location = generatedRange2.end;
        } else {
          union.push(generatedRange1);
          location = generatedRange1.end;
        }
      }
    }
  }
}

// Substitute original variables in binding expressions with their corresponding generated expressions
function applyScopeMapToBinding(
  binding: string | BindingRange[] | undefined,
  generatedRange: GeneratedRange,
  generatedRangeParents: Map<GeneratedRange, GeneratedRange>
): string | BindingRange[] | undefined {
  if (Array.isArray(binding)) {
    return binding.map(bindingRange => {
      const { start, end, expression: originalExpression } = bindingRange;
      const expression = applyScopeMapToExpression(originalExpression, generatedRange, generatedRangeParents);
      return { start, end, expression };
    });
  }

  return applyScopeMapToExpression(binding, generatedRange, generatedRangeParents);
}

function applyScopeMapToExpression(
  expression: string | undefined,
  generatedRange: GeneratedRange,
  generatedRangeParents: Map<GeneratedRange, GeneratedRange>
): string | undefined {
  if (expression === undefined) {
    return undefined;
  }
  const substitutions = new Map<string, string>();
  for (const variable of getFreeVariables(expression)) {
    const binding = lookupBinding(variable, generatedRange, generatedRangeParents);
    // TODO check that the free variables in `expr` aren't shadowed
    if (binding) {
      substitutions.set(variable, binding);
    }
  }

  return substituteFreeVariables(expression, substitutions);
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

function substituteFreeVariables(expression: string, replacements: Map<string, string>): string {
  return replacements.get(expression) ?? expression;
}

function lookupBinding(
  expression: string,
  generatedRange: GeneratedRange,
  parentRanges: Map<GeneratedRange, GeneratedRange>
): string | undefined {
  if (["undefined", "null", "true", "false"].includes(expression)) {
    return expression;
  }
  if (numberRegex.test(expression)) {
    return expression;
  }
  if (expression.startsWith('"') && expression.endsWith('"')) {
    return expression;
  }
  let current: GeneratedRange | undefined = generatedRange;
  while (current) {
    if (current.original) {
      const index = current.original.scope.variables?.findIndex(variable => expression === variable);
      if (typeof index === "number" && index >= 0) {
        const binding = current.original.bindings?.[index];
        if (typeof binding === "string") {
          return binding;
        } else {
          // TODO handle binding ranges
          return undefined;
        }
      }
    }
    current = parentRanges.get(current);
  }
  return undefined;
}
