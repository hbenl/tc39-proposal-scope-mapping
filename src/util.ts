import { originalPositionFor, TraceMap } from "@jridgewell/trace-mapping";
import { GenMapping, addMapping, setSourceContent, toEncodedMap } from "@jridgewell/gen-mapping";
import { encode, decode, SourceMapJson } from "@chrome-devtools/source-map-scopes-codec";
import { GeneratedRange, Location, LocationRange, OriginalLocation, OriginalScope } from "./types";
import { SourceMapWithDecodedScopes } from "./getOriginalFrames";

export function assert(condition: any): asserts condition {
  if (!condition) {
    throw new Error("Assertion failed");
  }
}

export function isEqual(loc1: Location, loc2: Location) {
  return loc1.line === loc2.line && loc1.column === loc2.column;
}

export function isBefore(loc1: Location, loc2: Location) {
  if (loc1.line < loc2.line) {
    return true;
  } else if (loc1.line > loc2.line) {
    return false;
  } else {
    return loc1.column < loc2.column;
  }
}

export function isInRange(loc: Location, range: LocationRange) {
  return !isBefore(loc, range.start) && !isBefore(range.end, loc);
}

export function isEnclosing(range1: LocationRange, range2: LocationRange) {
  return isInRange(range2.start, range1) && isInRange(range2.end, range1);
}

export function isOverlapping(range1: LocationRange, range2: LocationRange) {
  return !isBefore(range1.end, range2.start) && !isBefore(range2.end, range1.start);
}

export function compareLocations(loc1: Location, loc2: Location) {
  if (isBefore(loc1, loc2)) {
    return -1;
  } else if (isBefore(loc2, loc1)) {
    return 1;
  } else {
    return 0;
  }
}

export interface ScopeItem<T extends OriginalScope | GeneratedRange> {
  kind: "start" | "end";
  scope: T;
}

export function collectGeneratedRangeParents(
  generatedRange: GeneratedRange,
  generatedRangeParents = new Map<GeneratedRange, GeneratedRange>()
) {
  for (const child of generatedRange.children ?? []) {
    generatedRangeParents.set(child, generatedRange);
    collectGeneratedRangeParents(child, generatedRangeParents);
  }
  return generatedRangeParents;
}

export function rangeKey({ start, end }: { start: Location, end: Location }): string {
  return `${start.line}:${start.column}-${end.line}:${end.column}`;
}

export function collectGeneratedRangesByLocation(
  generatedRanges: GeneratedRange[],
  generatedRangesByLocation = new Map<string, GeneratedRange>()
) {
  for (const generatedRange of generatedRanges) {
    generatedRangesByLocation.set(rangeKey(generatedRange), generatedRange);
    collectGeneratedRangesByLocation(generatedRange.children, generatedRangesByLocation);
  }
  return generatedRangesByLocation;
}

// The codec supports multiple top-level scopes per source, this project uses
// a single top-level scope (or null) per source.
export function toScopesPerSource(scopes: (OriginalScope[] | null)[]): (OriginalScope | null)[] {
  return scopes.map(sourceScopes => {
    if (!sourceScopes || sourceScopes.length === 0) {
      return null;
    }
    assert(sourceScopes.length === 1);
    return sourceScopes[0];
  });
}

export function fromScopesPerSource(scopes: (OriginalScope | null)[]): (OriginalScope[] | null)[] {
  return scopes.map(scope => scope ? [scope] : null);
}

export function encodeScopes(scopes: (OriginalScope | null)[], ranges: GeneratedRange[]) {
  return encode({ scopes: fromScopesPerSource(scopes), ranges });
}

export function decodeScopes(encodedScopes: (string | null)[], encodedRanges: string[], names: string[]) {
  const decoded = decode({ version: 3, sources: [], mappings: "", names, scopes: encodedScopes, ranges: encodedRanges });
  const scopes = toScopesPerSource(decoded.scopes).map(removeParentsFromScopes);
  const ranges = decoded.ranges.map(removeParentsFromRanges);
  return { scopes, ranges };
}

function removeParentsFromScopes(scope: OriginalScope | null): OriginalScope | null {
  if (scope === null) {
    return null;
  }
  const { parent, children, ...rest } = scope;
  return {
    ...rest,
    children: children.map(removeParentsFromScopes)
  } as OriginalScope;
}

function removeParentsFromRanges(range: GeneratedRange): GeneratedRange {
  const { parent, children, originalScope, ...rest } = range;
  const result: GeneratedRange = {
    ...rest,
    children: children.map(removeParentsFromRanges),
  };
  if (originalScope) {
    result.originalScope = removeParentsFromScopes(originalScope) as OriginalScope;
  }
  return result;
}

export function addDecodedScopes(sourcemap: SourceMapJson) {
  const { scopes, ranges: generatedRanges } = decode(sourcemap);
  (sourcemap as any).originalScopes = toScopesPerSource(scopes);
  (sourcemap as any).generatedRanges = generatedRanges;
}

export function addParentsToScopes(scope: OriginalScope) {
  for (const child of scope.children ?? []) {
    child.parent = scope;
    addParentsToScopes(child);
  }
}

export function addParentsToRanges(range: GeneratedRange) {
  for (const child of range.children) {
    child.parent = range;
    addParentsToRanges(child);
  }
}

export function addParents(originalScopes: (OriginalScope | null)[], generatedRanges: GeneratedRange[]) {
  for (const scope of originalScopes) {
    if (scope) {
      addParentsToScopes(scope);
    }
  }
  for (const range of generatedRanges) {
    addParentsToRanges(range);
  }
}

interface Mapping {
  original: OriginalLocation;
  generated: Location;
}

export function createSourceMapWithScopes(
  mappings: Mapping[],
  encodedScopes: (string | null)[],
  encodedRanges: string[],
  scopeNames: string[],
  sources = ["original.js"],
): SourceMapWithDecodedScopes {
  const genMap = new GenMapping();
  for (const source of sources) {
    setSourceContent(genMap, source, null);
  }
  for (const mapping of mappings) {
    addMapping(genMap, {
      original: {
        line: mapping.original.line + 1,
        column: mapping.original.column,
      },
      generated: {
        line: mapping.generated.line + 1,
        column: mapping.generated.column,
      },
      source: sources[mapping.original.sourceIndex],
    });
  }
  const sourceMap = {
    ...toEncodedMap(genMap),
    names: scopeNames,
    sources,
    sourcesContent: [],
    ignoreList: undefined,
    scopes: encodedScopes,
    ranges: encodedRanges,
  };
  addDecodedScopes(sourceMap);
  return sourceMap as any as SourceMapWithDecodedScopes;
}

export function getOriginalLocation(traceMap: TraceMap, originalSources: string[], generatedLocation: Location): OriginalLocation | null {
  const originalMapping = originalPositionFor(traceMap, { ...generatedLocation, line: generatedLocation.line + 1 });
  if (!originalMapping.source) {
    return null;
  }
  return {
    sourceIndex: originalSources.indexOf(originalMapping.source),
    line: originalMapping.line - 1,
    column: originalMapping.column,
  };
}
