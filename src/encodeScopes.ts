import { encode } from "vlq";
import { ScopeType, SourcemapScope } from "./types";
import { assert } from "./util";

export function encodeScopes(sourcemapScopes: SourcemapScope[]): {
  scopes: string;
  names: string[];
} {
  const names: string[] = [];
  const scopes = sourcemapScopes.map(scope => encodeScope(scope, names)).join(",");
  return { scopes, names };
}

export function encodeScope(scope: SourcemapScope, names: string[]): string {
  const numbers: number[] = [];

  const meta =
    (scope.isInGeneratedSource ? 1 : 0) +
    (scope.isInOriginalSource ? 2 : 0) +
    (scope.isOutermostInlinedScope ? 4 : 0) +
    (scope.type << 3);
  numbers.push(meta);

  if (scope.type === ScopeType.NAMED_FUNCTION) {
    assert(scope.name);
    numbers.push(getNameIndex(scope.name, names))
  }

  numbers.push(scope.start.line);
  numbers.push(scope.start.column);
  numbers.push(scope.end.line);
  numbers.push(scope.end.column);

  for (const binding of scope.bindings) {
    numbers.push(getNameIndex(binding.varname, names));
    numbers.push(binding.expression !== null ? getNameIndex(binding.expression, names) : -1);
  }

  return encode(numbers);
}

function getNameIndex(name: string, names: string[]) {
  let index = names.indexOf(name);
  if (index < 0) {
    names.push(name);
    index = names.length - 1;
  }
  return index;
}
