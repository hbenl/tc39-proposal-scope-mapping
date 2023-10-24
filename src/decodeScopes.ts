import { decode } from "vlq";
import { ScopeType, SourcemapScope, SourcemapScopeBinding } from "./types";

export function decodeScopes(encodedScopes: string, scopeNames: string[]): SourcemapScope[] {
  return encodedScopes.split(",").map(encodedScope => decodeScope(encodedScope, scopeNames));
}

export function decodeScope(encodedScope: string, scopeNames: string[]): SourcemapScope {
  const numbers = decode(encodedScope);

  const meta = numbers.shift()!;
  const isInGeneratedSource = !!(meta & 1);
  const isInOriginalSource = !!(meta & 2);
  const type: ScopeType = meta >> 2;
  let name: string | null = null;
  if (type === ScopeType.NAMED_FUNCTION) {
    name = scopeNames[numbers.shift()!];
  }

  const startLine = numbers.shift()!;
  const startColumn = numbers.shift()!;
  const endLine = numbers.shift()!;
  const endColumn = numbers.shift()!;

  const bindings: SourcemapScopeBinding[] = [];
  while (numbers.length > 0) {
    const varname = scopeNames[numbers.shift()!];
    const expression = scopeNames[numbers.shift()!] ?? null;
    bindings.push({ varname, expression });
  }

  return {
    type,
    name,
    isInOriginalSource,
    isInGeneratedSource,
    start: { line: startLine, column: startColumn },
    end: { line: endLine, column: endColumn },
    bindings,
  };
}
