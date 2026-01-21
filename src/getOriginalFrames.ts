import { EncodedSourceMap, TraceMap } from "@jridgewell/trace-mapping";
import type { OriginalScope, GeneratedRange, Binding } from "@chrome-devtools/source-map-scopes-codec";
import { Location, GeneratedDebuggerScope, UnavailableValue, DebuggerValue, DebuggerFrame, OriginalLocation, DebuggerScopeBinding, GeneratedDebuggerFrame, OriginalDebuggerScope } from "./types";
import { assert, getOriginalLocation, isBefore, isEnclosing, isInRange } from "./util";

export interface SourceMapWithDecodedScopes extends EncodedSourceMap {
  originalScopes: (OriginalScope | null)[];
  generatedRanges: GeneratedRange[];
}

export function getOriginalFrames(
  sourceMap: SourceMapWithDecodedScopes,
  frames: GeneratedDebuggerFrame[]
): DebuggerFrame[] {
  const symbolized = mapStackTrace(sourceMap, frames.map(frame => frame.location));
  return symbolized.map(({ name, generatedFrameIndex, originalLocation }) => {
    const generatedFrame = frames[generatedFrameIndex];
    assert(generatedFrame);
    const scopes = buildScopeChain(sourceMap, generatedFrame.scopes, generatedFrame.location, originalLocation);
    return { name, location: originalLocation, scopes };
  });
}

interface SourceMappedFrame {
  name?: string;
  generatedFrameIndex: number;
  originalLocation: OriginalLocation;
  hideCaller?: boolean;
}

export function mapStackTrace(
  sourceMap: SourceMapWithDecodedScopes,
  frameLocations: Location[]
): SourceMappedFrame[] {
  const sourceMappedFrames: SourceMappedFrame[] = [];
  let hideNextFrame = false;
  for (let i = 0; i < frameLocations.length; i++) {
    const currentSourceMappedFrames = mapStackFrame(sourceMap, frameLocations[i]);
    for (let j = 0; j < currentSourceMappedFrames.length; j++) {
      if (!hideNextFrame) {
        currentSourceMappedFrames[j].generatedFrameIndex = i;
        sourceMappedFrames.push(currentSourceMappedFrames[j]);
      }
      hideNextFrame = currentSourceMappedFrames[j].hideCaller ?? false;
    }
  }
  for (const frame of sourceMappedFrames)
    delete frame.hideCaller;
  return sourceMappedFrames;
}

function mapStackFrame(
  sourceMap: SourceMapWithDecodedScopes,
  frameLocation: Location
): SourceMappedFrame[] {
  const traceMap = new TraceMap(sourceMap);
  const sourceMappedFrames: SourceMappedFrame[] = [];
  const originalLocation = getOriginalLocation(traceMap, sourceMap.sources as string[], frameLocation);
  let originalScope: OriginalScope | undefined;
  if (originalLocation) {
    originalScope = findOriginalScope(originalLocation, sourceMap.originalScopes[originalLocation.sourceIndex]!);
    if (originalScope) {
      const name = findFunctionName(originalScope);
      sourceMappedFrames.push({ name, generatedFrameIndex: 0, originalLocation, hideCaller: false });
    }
  }
  if (!originalScope)
    sourceMappedFrames.push({ generatedFrameIndex: 0, originalLocation: { sourceIndex: -1, ...frameLocation }, hideCaller: false });

  let generatedRange = findGeneratedRange(frameLocation, sourceMap.generatedRanges);
  while (generatedRange && !generatedRange.isStackFrame) {
    const callsite = generatedRange.callSite;
    if (callsite) {
      const originalScope: OriginalScope | undefined = findOriginalScope(callsite, sourceMap.originalScopes[callsite.sourceIndex]!);
      const name = findFunctionName(originalScope);
      sourceMappedFrames.push({ name, generatedFrameIndex: 0, originalLocation: callsite, hideCaller: false });
    }
    generatedRange = generatedRange.parent;
  }
  if (generatedRange?.isHidden)
    sourceMappedFrames[sourceMappedFrames.length - 1].hideCaller = true;
  return sourceMappedFrames;
}

function buildScopeChain(
  sourceMap: SourceMapWithDecodedScopes,
  debuggerScopes: GeneratedDebuggerScope[],
  generatedLocation: Location,
  originalLocation: OriginalLocation,
): OriginalDebuggerScope[] {
  const innermostGeneratedRange = findGeneratedRange(generatedLocation, sourceMap.generatedRanges);
  assert(innermostGeneratedRange);
  let originalScope: OriginalScope | undefined = findOriginalScope(originalLocation, sourceMap.originalScopes[originalLocation.sourceIndex]!);

  const originalDebuggerScopes: OriginalDebuggerScope[] = [];
  while (originalScope) {
    const generatedRange = findAncestorWithScope(innermostGeneratedRange, originalScope);
    let originalBindings: DebuggerScopeBinding[] = [];
    if (generatedRange) {
      assert(originalScope.variables.length === generatedRange.values.length);
      const activeDebuggerScopes = debuggerScopes.filter(scope => isEnclosing(scope, generatedRange));
      for (let i = 0; i < originalScope.variables.length; i++) {
        const varname = originalScope.variables[i];
        const expression = findBindingRecord(generatedRange.values[i], generatedLocation);
        // We use `lookupScopeValue()`, which only works if `expression` is the name of a
        // generated variable or a string expression; to support arbitrary expressions we'd need to use `evaluateWithScopes()`
        const value = expression !== undefined ? lookupScopeValue(expression, activeDebuggerScopes) : { unavailable: true } as UnavailableValue;
        originalBindings.push({ varname, value });
      }
    } else {
      originalBindings = originalScope.variables.map(varname => ({ varname, value: { unavailable: true } }));
    }
    originalDebuggerScopes.push({ bindings: originalBindings });
    originalScope = originalScope.parent;
  }

  originalDebuggerScopes.push({ bindings: debuggerScopes[debuggerScopes.length - 1].bindings });
  return originalDebuggerScopes;
}

function findBindingRecord(binding: Binding, generatedLocation: Location): string | undefined {
  if (typeof binding === "string") {
    return binding;
  } else if (Array.isArray(binding)) {
    for (let i = binding.length - 1; i >= 0; i--) {
      if (!isBefore(generatedLocation, binding[i].from)) {
        return binding[i].value;
      }
    }
  }
}

function findAncestorWithScope(generatedRange: GeneratedRange, originalScope: OriginalScope): GeneratedRange | undefined{
  if (generatedRange.originalScope === originalScope) {
    return generatedRange;
  } else if (generatedRange.parent) {
    return findAncestorWithScope(generatedRange.parent, originalScope);
  }
}

function findFunctionName(originalScope: OriginalScope): string | undefined {
  if (originalScope.isStackFrame) {
    return originalScope.name;
  }
  if (originalScope.parent) {
    return findFunctionName(originalScope.parent);
  }
  return undefined;
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
