export interface Location {
  line: number;
  column: number;
}

export interface LocationRange {
  start: Location;
  end: Location;
}

export interface SourcemapScopeBinding {
  varname: string;
  expression: string;
}

export interface SourcemapScope {
  start: Location;
  end: Location;
  bindings: SourcemapScopeBinding[];
  isInGeneratedSource: boolean;
  isInOriginalSource: boolean;
}

export interface PrimitiveDebuggerValue {
  value: string | number | bigint | boolean | null | undefined;
}

export interface ObjectDebuggerValue {
  objectId: number;
}

export interface UnavailableValue {
  unavailable: true;
}

export type DebuggerValue = PrimitiveDebuggerValue | ObjectDebuggerValue | UnavailableValue;

export interface DebuggerScopeBinding {
  varname: string;
  value: DebuggerValue;
}

export interface DebuggerScope {
  bindings: DebuggerScopeBinding[];
}
