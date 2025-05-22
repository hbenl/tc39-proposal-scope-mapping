import { encode, decode, SourceMapJson } from "@chrome-devtools/source-map-scopes-codec";
import { GeneratedRange, Location, LocationRange, OriginalScope } from "./types";

export function assert(condition: any): asserts condition {
  if (!condition) {
    throw new Error("Assertion failed");
  }
}

export function findLastIndex<T>(array: T[], predicate: (value: T) => boolean): number {
  const reverseIndex = [...array].reverse().findIndex(predicate);
  return reverseIndex >= 0 ? (array.length - 1) - reverseIndex : -1;
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

export function getScopeItems<T extends OriginalScope | GeneratedRange>(scope: T): ScopeItem<T>[] {
  const children = (scope.children as T[] | undefined) ?? [];
  const childItems = children.flatMap(getScopeItems);
  return [
    { kind: "start", scope },
    ...childItems,
    { kind: "end", scope },
  ]
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
  generatedRange: GeneratedRange,
  generatedRangesByLocation = new Map<string, GeneratedRange>()
) {
  generatedRangesByLocation.set(rangeKey(generatedRange), generatedRange);
  for (const child of generatedRange.children ?? []) {
    collectGeneratedRangesByLocation(child, generatedRangesByLocation);
  }
  return generatedRangesByLocation;
}

export function encodeScopes(scopes: OriginalScope[], ranges: GeneratedRange[]) {
  return encode({ scopes, ranges });
}

export function decodeScopes(encodedScopes: string, names: string[]) {
  let { scopes, ranges } = decode({ version: 3, sources: [], mappings: "", names, scopes: encodedScopes });
  scopes = scopes.map(removeParentsFromScopes);
  ranges = ranges.map(removeParentsFromRanges);
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
  const { scopes: originalScopes, ranges: generatedRanges } = decode(sourcemap);
  (sourcemap as any).originalScopes = originalScopes;
  (sourcemap as any).generatedRanges = generatedRanges[0];
}
