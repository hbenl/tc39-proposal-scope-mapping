import { Location, DebuggerScope, UnavailableValue, DebuggerValue, DebuggerFrame, OriginalLocation, OriginalScope, GeneratedScope, DebuggerScopeBinding } from "./types";
import { assert, findLastIndex, isInRange } from "./util";

export function getOriginalFrames(
  location: Location,
  originalLocation: OriginalLocation,
  generatedScopes: GeneratedScope,
  originalScopes: OriginalScope[],
  debuggerScopeChain: DebuggerScope[]
): DebuggerFrame[] {

  const generatedScopeChain = getGeneratedScopeChain(location, generatedScopes);

  const originalFrames: DebuggerFrame[] = [getOriginalFrame(location, originalLocation, generatedScopeChain, originalScopes, debuggerScopeChain)];

  for (let i = generatedScopeChain.length - 1; i >= 0; i--) {
    const callsite = generatedScopeChain[i].original?.callsite;
    if (callsite) {
      originalFrames.push(getOriginalFrame(location, callsite, generatedScopeChain.slice(0, i + 1), originalScopes, debuggerScopeChain));
    }
  }

  return originalFrames;
}

function getOriginalFrame(
  generatedLocation: Location,
  originalLocation: OriginalLocation,
  generatedScopeChain: GeneratedScope[],
  originalScopes: OriginalScope[],
  debuggerScopeChain: DebuggerScope[]
): DebuggerFrame {

  const originalScopeChain = getOriginalScopeChain(originalLocation, originalScopes[originalLocation.sourceIndex]);
  const originalDebuggerScopeChain: DebuggerScope[] = originalScopeChain.map(originalScope => {
    const generatedScopeIndex = findLastIndex(generatedScopeChain, generatedScope => generatedScope.original?.scope === originalScope);
    if (generatedScopeIndex < 0) {
      return { bindings: [] };
    }
    const generatedScope = generatedScopeChain[generatedScopeIndex];
    assert(generatedScope.original);
    const debuggerScopeIndex = getCorrespondingDebuggerScopeIndex(generatedScopeChain, generatedScopeIndex);
    const debuggerScopeChainForLookup = debuggerScopeChain.slice(0, debuggerScopeIndex + 1);

    const originalBindings: DebuggerScopeBinding[] = [];
    assert(originalScope.variables.length === generatedScope.original.values.length);
    for (let j = 0; j < originalScope.variables.length; j++) {
      const varname = originalScope.variables[j];
      const expressions = generatedScope.original.values[j];
      let expression: string | undefined = expressions[0];
      for (const [loc, expr] of expressions.slice(1) as [Location, string | undefined][]) {
        if (loc.line > generatedLocation.line || (loc.line === generatedLocation.line && loc.column > generatedLocation.column)) {
          break;
        }
        expression = expr;
      }
      // We use `lookupScopeValue()`, which only works if `expression` is the name of a
      // generated variable or a string expression; to support arbitrary expressions we'd need to use `evaluateWithScopes()`
      const value = expression !== undefined ? lookupScopeValue(expression, debuggerScopeChainForLookup) : { unavailable: true } as UnavailableValue;
      originalBindings.push({ varname, value });
    }
    return { bindings: originalBindings };
  });

  originalDebuggerScopeChain.unshift(debuggerScopeChain[0]);

  return {
    location: originalLocation,
    name: originalScopeChain[originalScopeChain.length - 1].name,
    scopes: originalDebuggerScopeChain,
  };
}

function getGeneratedScopeChain(location: Location, generatedScope: GeneratedScope): GeneratedScope[] {
  assert(isInRange(location, generatedScope));
  for (const childScope of generatedScope.children ?? []) {
    if (isInRange(location, childScope)) {
      return [generatedScope, ...getGeneratedScopeChain(location, childScope)];
    }
  }
  return [generatedScope];
}

function getOriginalScopeChain(originalLocation: OriginalLocation, originalScope: OriginalScope): OriginalScope[] {
  assert(isInRange(originalLocation, originalScope));
  for (const childScope of originalScope.children ?? []) {
    if (isInRange(originalLocation, childScope)) {
      return [originalScope, ...getOriginalScopeChain(originalLocation, childScope)];
    }
  }
  return [originalScope];
}

function getCorrespondingDebuggerScopeIndex(
  generatedScopeChain: GeneratedScope[],
  generatedScopeIndex: number
): number {
  return generatedScopeChain.slice(0, generatedScopeIndex + 1).filter(scope => scope.kind !== "reference").length;
}

const numberRegex = /^\s*[+-]?(\d+|\d*\.\d+|\d+\.\d*)([Ee][+-]?\d+)?\s*$/;
function lookupScopeValue(expression: string, scopes: DebuggerScope[]): DebuggerValue {
  if (expression === "undefined") {
    return { value: undefined };
  }
  if (expression === "null") {
    return { value: null };
  }
  if (expression === "true") {
    return { value: true };
  }
  if (expression === "false") {
    return { value: false };
  }
  if (numberRegex.test(expression)) {
    return { value: +expression };
  }
  if (expression.startsWith('"') && expression.endsWith('"')) {
    return { value: expression.slice(1, -1) };
  }
  for (let i = scopes.length - 1; i >= 0; i--) {
    const binding = scopes[i].bindings.find(binding => binding.varname === expression);
    if (binding) {
      return binding.value;
    }
  }
  return { unavailable: true } as UnavailableValue;
}

// To emulate evaluating arbitrary expressions in a given scope chain we'd need a debugger
// command that evaluates a function expression in the global scope and applies it to
// the given debugger values, e.g. https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-callFunctionOn
function evaluateWithScopes(
  expression: string,
  scopes: DebuggerScope[],
  evaluateWithArguments: (functionDeclaration: string, args: DebuggerValue[]) => DebuggerValue
) {
  const nonGlobalScopes = scopes.slice(1);
  const varnames = nonGlobalScopes.flatMap(scope => scope.bindings.map(binding => binding.varname));
  const values = nonGlobalScopes.flatMap(scope => scope.bindings.map(binding => binding.value));
  return evaluateWithArguments(`(${varnames.join(",")}) => (${expression})`, values);
}
