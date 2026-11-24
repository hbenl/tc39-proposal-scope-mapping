// The terser fork used in these tests still depends on an old version of
// source-map-scopes-codec that encodes original scopes and generated ranges
// into a single `scopes` string. This converts such a source map to the
// current format with `scopes: (string | null)[]` and `ranges: string[]`.
import { decode as legacyDecode } from "../../node_modules/terser/node_modules/@chrome-devtools/source-map-scopes-codec/src/mod.js";
import { encodeScopes } from "../../src/util";

export function convertLegacyScopes(sourceMap: any) {
  if (typeof sourceMap.scopes !== "string") {
    return sourceMap;
  }
  const { scopes, ranges } = legacyDecode(sourceMap);
  while (scopes.length < sourceMap.sources.length) {
    scopes.push(null);
  }
  const encoded = encodeScopes(scopes, ranges);
  return { ...sourceMap, names: encoded.names, scopes: encoded.scopes, ranges: encoded.ranges };
}
