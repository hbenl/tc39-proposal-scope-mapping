import type { OriginalScope, GeneratedRange, Position, OriginalPosition } from "@chrome-devtools/source-map-scopes-codec";
export type { OriginalScope, GeneratedRange };
export type Location = Position;
export type OriginalLocation = OriginalPosition;

export interface LocationRange {
  start: Location;
  end: Location;
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

export interface GeneratedDebuggerScope {
  start: Location;
  end: Location;
  bindings: DebuggerScopeBinding[];
}

export interface OriginalDebuggerScope {
  bindings: DebuggerScopeBinding[];
}

export interface DebuggerFrame {
  name?: string;
  location: OriginalLocation;
  scopes: OriginalDebuggerScope[];
}
