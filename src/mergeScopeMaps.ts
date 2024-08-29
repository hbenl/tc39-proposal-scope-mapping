import { BindingRange, GeneratedRange, OriginalScope } from "./types";
import { collectGeneratedRangeParents, collectGeneratedRangesByLocation, rangeKey } from "./util";

export interface ScopeMap {
  originalScopes: OriginalScope[];
  generatedRanges: GeneratedRange;
}

// Merges the ScopeMaps of two consecutive transpilation steps, i.e. an original
// source was transpiled into an intermediate source which was then transpiled into
// the final generated source.
// scopeMap1 maps from the original to the intermediate source, scopeMap2 from the
// intermediate to the generated source
export function mergeScopeMaps(scopeMap1: ScopeMap, scopeMap2: ScopeMap): ScopeMap {
  return {
    originalScopes: scopeMap1.originalScopes,
    generatedRanges: applyScopeMapToGeneratedRanges(
      scopeMap2.generatedRanges,
      collectGeneratedRangeParents(scopeMap2.generatedRanges),
      collectGeneratedRangesByLocation(scopeMap1.generatedRanges)
    ),
  };
}

// generatedRange and generatedRangeParents contain GeneratedRanges in the generated
// source which reference OriginalScopes in the intermediate source.
// intermediateGeneratedRangesByLocation contains GeneratedRanges in the intermediate
// source which reference OriginalScopes in the original source.
function applyScopeMapToGeneratedRanges(
  generatedRange: GeneratedRange,
  generatedRangeParents: Map<GeneratedRange, GeneratedRange>,
  intermediateGeneratedRangesByLocation: Map<string, GeneratedRange>
): GeneratedRange {
  const { start, end, isScope } = generatedRange;

  let original: GeneratedRange["original"] | undefined = undefined;
  if (generatedRange.original) {
    // generatedRange.original is an original scope from the second scope map,
    // find the corresponding generated range from the first scope map
    const intermediateGeneratedRange = intermediateGeneratedRangesByLocation.get(rangeKey(generatedRange.original.scope));

    if (intermediateGeneratedRange?.original) {
      original = {
        scope: intermediateGeneratedRange.original.scope,
        bindings: intermediateGeneratedRange.original.bindings?.map(binding => 
          applyScopeMapToBinding(binding, generatedRange, generatedRangeParents)
        )
      };
    }
  }

  const children = generatedRange.children?.map(
    child => applyScopeMapToGeneratedRanges(child, generatedRangeParents, intermediateGeneratedRangesByLocation)
  );

  return { start, end, isScope, original, children };
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
