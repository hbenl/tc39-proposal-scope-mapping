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
  expression: string | null;
}

export enum ScopeType {
  ANONYMOUS_FUNCTION = 0,
  NAMED_FUNCTION = 1,
  OTHER = 2,
}

export interface SourcemapScope {
  type: ScopeType;
  isInGeneratedSource: boolean;
  isInOriginalSource: boolean;
  isOutermostInlinedScope: boolean;
  name: string | null;
  start: Location;
  end: Location;
  bindings: SourcemapScopeBinding[];
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

export interface DebuggerFrame {
  name: string | null;
  scopes: DebuggerScope[];
}
