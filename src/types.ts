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

// use "reference" for scopes that only reference an original scope but
// don't correspond to a scope in the generated code
export type ScopeKind = "module" | "class" | "function" | "block" | "reference";

//TODO "live ranges" for values
export interface GeneratedScope {
  start: Location;
  end: Location;
  kind: ScopeKind;
  original?: {
    // this needs to be set for inlined functions
    callsite?: OriginalLocation;
    scope: OriginalScope;
    // this needs to have the same length as the referenced scope's variables
    values: (string | undefined)[];
  };
  children?: GeneratedScope[];
}

export interface OriginalScope {
  start: OriginalLocation;
  end: OriginalLocation;
  kind: Exclude<ScopeKind, "reference">;
  name?: string;
  variables: string[];
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
