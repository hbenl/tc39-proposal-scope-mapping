import type { OriginalScope, GeneratedRange } from "@chrome-devtools/source-map-scopes-codec";
import { Location, OriginalDebuggerScope, GeneratedDebuggerScope, UnavailableValue, DebuggerValue, DebuggerFrame, OriginalLocation, DebuggerScopeBinding } from "./types";
import { assert, findLastIndex, isEnclosing, isInRange } from "./util";

export function getOriginalFrames(
  location: Location,
  originalLocation: OriginalLocation,
  generatedRanges: GeneratedRange[],
  originalScopes: OriginalScope[],
  debuggerScopeChain: GeneratedDebuggerScope[]
): DebuggerFrame[] {

  const generatedRangeChain = getGeneratedRangeChain(location, generatedRanges);
  assert(generatedRangeChain.length > 0);

  const originalFrames: DebuggerFrame[] = [getOriginalFrame(location, originalLocation, generatedRangeChain, originalScopes, debuggerScopeChain)];

  for (let i = generatedRangeChain.length - 1; i >= 0; i--) {
    const generatedRange = generatedRangeChain[i];
    const callsite = generatedRange.callSite;
    if (callsite) {
      assert(!generatedRange.isStackFrame);
      originalFrames.push(getOriginalFrame(location, callsite, generatedRangeChain.slice(0, i + 1), originalScopes, debuggerScopeChain));
    } else if (generatedRange.isStackFrame) {
      break;
    }
  }

  return originalFrames;
}

export function getOriginalFrame(
  generatedLocation: Location,
  originalLocation: OriginalLocation,
  generatedRangeChain: GeneratedRange[],
  originalScopes: OriginalScope[],
  debuggerScopeChain: GeneratedDebuggerScope[]
): DebuggerFrame {

  const originalScopeChain = getOriginalScopeChain(originalLocation, originalScopes[originalLocation.sourceIndex]);
  const originalDebuggerScopeChain: OriginalDebuggerScope[] = originalScopeChain.map(originalScope => {
    const generatedRangeIndex = findLastIndex(generatedRangeChain, generatedRange => generatedRange.originalScope === originalScope);
    if (generatedRangeIndex < 0) {
      return { bindings: [] };
    }
    const generatedRange = generatedRangeChain[generatedRangeIndex];
    assert(generatedRange.originalScope);
    const debuggerScopeIndex = debuggerScopeChain.findLastIndex(scope => isEnclosing(scope, generatedRange));
    assert(debuggerScopeIndex >= 0);
    const debuggerScopeChainForLookup = debuggerScopeChain.slice(0, debuggerScopeIndex + 1);

    const originalBindings: DebuggerScopeBinding[] = [];
    assert(originalScope.variables?.length === generatedRange.values?.length);
    if (originalScope.variables && generatedRange.values) {
      for (let j = 0; j < originalScope.variables.length; j++) {
        const varname = originalScope.variables[j];
        const expressionOrBindingRanges = generatedRange.values[j];
        let expression: string | undefined = undefined;
        if (typeof expressionOrBindingRanges === "string") {
          expression = expressionOrBindingRanges;
        } else if (Array.isArray(expressionOrBindingRanges)) {
          for (const bindingRange of expressionOrBindingRanges) {
            if (isInRange(generatedLocation, { start: bindingRange.from, end: bindingRange.to })) {
              expression = bindingRange.value;
            }
          }
        }
        // We use `lookupScopeValue()`, which only works if `expression` is the name of a
        // generated variable or a string expression; to support arbitrary expressions we'd need to use `evaluateWithScopes()`
        const value = expression !== undefined ? lookupScopeValue(expression, debuggerScopeChainForLookup) : { unavailable: true } as UnavailableValue;
        originalBindings.push({ varname, value });
      }
    }
    return { bindings: originalBindings };
  });

  originalDebuggerScopeChain.unshift({ bindings: debuggerScopeChain[0].bindings });

  return {
    location: originalLocation,
    name: originalScopeChain[originalScopeChain.length - 1].name,
    scopes: originalDebuggerScopeChain,
  };
}

export function getGeneratedRangeChain(location: Location, generatedRanges: GeneratedRange[]): GeneratedRange[] {
  for (const range of generatedRanges) {
    if (isInRange(location, range)) {
      return [range, ...getGeneratedRangeChain(location, range.children)];
    }
  }
  return [];
}

export function getOriginalScopeChain(originalLocation: OriginalLocation, originalScope: OriginalScope): OriginalScope[] {
  assert(isInRange(originalLocation, originalScope));
  for (const childScope of originalScope.children ?? []) {
    if (isInRange(originalLocation, childScope)) {
      return [originalScope, ...getOriginalScopeChain(originalLocation, childScope)];
    }
  }
  return [originalScope];
}

const numberRegex = /^\s*[+-]?(\d+|\d*\.\d+|\d+\.\d*)([Ee][+-]?\d+)?\s*$/;
export function lookupScopeValue(expression: string, scopes: GeneratedDebuggerScope[]): DebuggerValue {
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
  scopes: GeneratedDebuggerScope[],
  evaluateWithArguments: (functionDeclaration: string, args: DebuggerValue[]) => DebuggerValue
) {
  const nonGlobalScopes = scopes.slice(1);
  const varnames = nonGlobalScopes.flatMap(scope => scope.bindings.map(binding => binding.varname));
  const values = nonGlobalScopes.flatMap(scope => scope.bindings.map(binding => binding.value));
  return evaluateWithArguments(`(${varnames.join(",")}) => (${expression})`, values);
}
