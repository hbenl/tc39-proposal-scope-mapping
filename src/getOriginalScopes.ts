import { Location, DebuggerScope, SourcemapScope, UnavailableValue, DebuggerValue } from "./types";
import { assert, compareLocations, isEnclosing, isInRange } from "./util";

// Compute the original scopes given a location, scope information from the sourcemap
// and the scopes received from the debugger (containing the bindings for the generated variables)
export function getOriginalScopes(
  location: Location,
  sourcemapScopes: SourcemapScope[],
  debuggerScopes: DebuggerScope[]
): DebuggerScope[] {

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
  const originalScopes: DebuggerScope[] = [debuggerScopes[0]];

  for (const scope of scopes) {
    if (!scope.isInOriginalSource) {
      continue;
    }

    const enclosingGeneratedScopes = sourcemapScopes.filter(
      sourcemapScope => sourcemapScope.isInGeneratedSource && isEnclosing(sourcemapScope, scope)
    );
    const enclosingDebuggerScopes = debuggerScopes.slice(0, enclosingGeneratedScopes.length + 1);

    const originalBindings = scope.bindings.map(({ varname, expression }) => {
      // We use `lookupScopeValue()`, which only works if `expression` is the name of a
      // generated variable, to support arbitrary expressions we'd need to use `evaluateWithScopes()`
      const value = lookupScopeValue(expression, enclosingDebuggerScopes);
      return { varname, value };
    });

    originalScopes.push({ bindings: originalBindings });
  }

  return originalScopes;
}

function lookupScopeValue(varname: string, scopes: DebuggerScope[]) {
  for (let i = scopes.length - 1; i >= 0; i--) {
    const binding = scopes[i].bindings.find(binding => binding.varname === varname);
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
