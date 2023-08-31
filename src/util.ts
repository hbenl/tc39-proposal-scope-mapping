import { Location, LocationRange } from "./types";

export function assert(condition: any): asserts condition {
  if (!condition) {
    throw new Error("Assertion failed");
  }
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

export function compareLocations(loc1: Location, loc2: Location) {
  if (isBefore(loc1, loc2)) {
    return -1;
  } else if (isBefore(loc2, loc1)) {
    return 1;
  } else {
    return 0;
  }
}
