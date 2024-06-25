export interface Location {
  line: number;
  column: number;
}

export interface LocationRange {
  start: Location;
  end: Location;
}

export interface OriginalLocation extends Location {
  sourceIndex: number;
}

export interface BindingRange {
  start: Location;
  end: Location;
  expression?: string;
}

export interface GeneratedRange {
  start: Location;
  end: Location;
  isScope: boolean;
  original?: {
    // this needs to be set for inlined functions
    callsite?: OriginalLocation;
    scope: OriginalScope;
    // this needs to have the same length as the referenced scope's variables
    bindings?: (string | undefined | BindingRange[])[];
  };
  children?: GeneratedRange[];
}

export interface OriginalScope {
  start: OriginalLocation;
  end: OriginalLocation;
  kind: string;
  name?: string;
  variables?: string[];
  children?: OriginalScope[];
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
  name?: string;
  location: OriginalLocation;
  scopes: DebuggerScope[];
}
