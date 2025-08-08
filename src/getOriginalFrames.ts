import { EncodedSourceMap, originalPositionFor, TraceMap } from "@jridgewell/trace-mapping";
import type { OriginalScope, GeneratedRange } from "@chrome-devtools/source-map-scopes-codec";
import { Location, GeneratedDebuggerScope, UnavailableValue, DebuggerValue, DebuggerFrame, OriginalLocation, DebuggerScopeBinding, GeneratedDebuggerFrame, OriginalDebuggerScope } from "./types";
import { assert, isEnclosing, isInRange } from "./util";

export interface SourceMapWithDecodedScopes extends EncodedSourceMap {
  originalScopes: (OriginalScope | null)[];
  generatedRanges: GeneratedRange[];
}

export function getOriginalFrames(
  sourceMap: SourceMapWithDecodedScopes,
  frames: GeneratedDebuggerFrame[]
): DebuggerFrame[] {
  const traceMap = new TraceMap(sourceMap);
  const originalFrames: DebuggerFrame[] = [];
  for (const frame of frames) {
    const generatedLocation = frame.location;
    const _originalMapping = originalPositionFor(traceMap, { ...generatedLocation, line: generatedLocation.line + 1 });
    const originalMapping = { ..._originalMapping, line: _originalMapping.line! - 1 };
    assert(originalMapping.source);
    const originalLocation: OriginalLocation = {
      sourceIndex: sourceMap.sources.indexOf(originalMapping.source),
      line: originalMapping.line,
      column: originalMapping.column,
    };

    originalFrames.push(getOriginalFrame(sourceMap, frame.scopes, generatedLocation, originalLocation));

    let generatedRange = findGeneratedRange(generatedLocation, sourceMap.generatedRanges);
    assert(generatedRange);
    while (generatedRange) {
      const callsite = generatedRange.callSite;
      if (callsite) {
        assert(!generatedRange.isStackFrame);
        originalFrames.push(getOriginalFrame(sourceMap, frame.scopes, generatedLocation, callsite));
      } else if (generatedRange.isStackFrame) {
        break;
      }
      generatedRange = generatedRange.parent;
    }
  }

  return originalFrames;
}

function getOriginalFrame(
  sourceMap: SourceMapWithDecodedScopes,
  debuggerScopes: GeneratedDebuggerScope[],
  generatedLocation: Location,
  originalLocation: OriginalLocation,
): DebuggerFrame {
  const innerGeneratedRange = findGeneratedRange(generatedLocation, sourceMap.generatedRanges);
  assert(innerGeneratedRange);
  let originalScope: OriginalScope | undefined = findOriginalScope(originalLocation, sourceMap.originalScopes[originalLocation.sourceIndex]!);
  const name = originalScope.name;

  const originalDebuggerScopes: OriginalDebuggerScope[] = [];
  while (originalScope) {
    const generatedRange = findAncestorWithScope(innerGeneratedRange, originalScope);
    const originalBindings: DebuggerScopeBinding[] = [];
    if (generatedRange) {
      const activeDebuggerScopes = debuggerScopes.filter(scope => isEnclosing(scope, generatedRange));
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
        const value = expression !== undefined ? lookupScopeValue(expression, activeDebuggerScopes) : { unavailable: true } as UnavailableValue;
        originalBindings.push({ varname, value });
      }
    }
    originalDebuggerScopes.push({ bindings: originalBindings });
    originalScope = originalScope.parent;
  }

  originalDebuggerScopes.push({ bindings: debuggerScopes[debuggerScopes.length - 1].bindings });
  return {
    location: originalLocation,
    scopes: originalDebuggerScopes,
    name
  };
}

function findAncestorWithScope(generatedRange: GeneratedRange, originalScope: OriginalScope): GeneratedRange | undefined{
  if (generatedRange.originalScope === originalScope) {
    return generatedRange;
  } else if (generatedRange.parent) {
    return findAncestorWithScope(generatedRange.parent, originalScope);
  }
}

export function findGeneratedRange(location: Location, generatedRanges: GeneratedRange[]): GeneratedRange | undefined {
  for (const range of generatedRanges) {
    if (isInRange(location, range)) {
      return findGeneratedRange(location, range.children) ?? range;
    }
  }
  return undefined;
}

export function findOriginalScope(originalLocation: OriginalLocation, originalScope: OriginalScope): OriginalScope {
  assert(isInRange(originalLocation, originalScope));
  for (const childScope of originalScope.children) {
    if (isInRange(originalLocation, childScope)) {
      return findOriginalScope(originalLocation, childScope);
    }
  }
  return originalScope;
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
  for (let i = 0; i < scopes.length; i++) {
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
