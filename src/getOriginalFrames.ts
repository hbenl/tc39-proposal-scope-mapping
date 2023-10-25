import { Location, DebuggerScope, SourcemapScope, UnavailableValue, DebuggerValue, DebuggerFrame, ScopeType } from "./types";
import { assert, compareLocations, isEnclosing, isInRange } from "./util";

// Compute the original frames and scopes given a location, scope information from the sourcemap
// and the scopes received from the debugger (containing the bindings for the generated variables)
export function getOriginalFrames(
  location: Location,
  sourcemapScopes: SourcemapScope[],
  debuggerScopes: DebuggerScope[]
): DebuggerFrame[] {

  const scopes = sourcemapScopes.filter(scope => isInRange(location, scope));
  // Sort from outermost to innermost, assuming debuggerScopes is also sorted that way
  scopes.sort((s1, s2) => compareLocations(s1.start, s2.start));

  // The number of scopes received from the debugger must be the same as the number
  // of scopes declared by the sourcemap for the generated source at the given location
  // plus one (the global scope, i.e. `window`, which is not declared in the sourcemap)
  const generatedScopes = scopes.filter(scope => scope.isInGeneratedSource);
  assert(debuggerScopes.length === generatedScopes.length + 1);

  // The outermost original scope is identical to the outermost generated scope,
  // which is the global scope
  function createFrame(): DebuggerFrame {
    return {
      name: null,
      scopes: [debuggerScopes[0]]
    };
  }
  const originalFrames: DebuggerFrame[] = [createFrame()];

  for (const scope of scopes) {
    if (!scope.isInOriginalSource) {
      continue;
    }

    if (scope.isOutermostInlinedScope) {
      originalFrames.unshift(createFrame());
    }

    const enclosingGeneratedScopes = sourcemapScopes.filter(
      sourcemapScope => sourcemapScope.isInGeneratedSource && isEnclosing(sourcemapScope, scope)
    );
    const enclosingDebuggerScopes = debuggerScopes.slice(0, enclosingGeneratedScopes.length + 1);

    const originalBindings = scope.bindings.map(({ varname, expression }) => {
      // We use `lookupScopeValue()`, which only works if `expression` is the name of a
      // generated variable, to support arbitrary expressions we'd need to use `evaluateWithScopes()`
      const value = expression !== null ? lookupScopeValue(expression, enclosingDebuggerScopes) : { unavailable: true } as UnavailableValue;
      return { varname, value };
    });

    originalFrames[0].scopes.push({ bindings: originalBindings });

    if (scope.type === ScopeType.NAMED_FUNCTION) {
      originalFrames[0].name = scope.name;
    } else if (scope.type === ScopeType.ANONYMOUS_FUNCTION) {
      originalFrames[0].name = "<anonymous>";
    }
  }

  return originalFrames;
}

function lookupScopeValue(expression: string, scopes: DebuggerScope[]): DebuggerValue {
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
