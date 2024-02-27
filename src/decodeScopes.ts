import { decode } from "vlq";
import { GeneratedRange, OriginalScope, MultiValue } from "./types";
import { getScopeItems, scopeKinds } from "./util";
import { assert } from "./util";

export function decodeOriginalScopes(encodedScopes: string[], names: string[]): OriginalScope[] {
  return encodedScopes.map((encodedScope, sourceIndex) => {
    const items = encodedScope.split(",").map(decode);
    const decoded = _decodeOriginalScopes(sourceIndex, items, names, { currentLine: 0 });
    assert(decoded.length === 1);
    return decoded[0];
  });
}

interface OriginalScopesDecodeState {
  currentLine: number;
}

function _decodeOriginalScopes(sourceIndex: number, items: number[][], names: string[], state: OriginalScopesDecodeState): OriginalScope[] {
  const originalScopes: OriginalScope[] = [];

  while (items.length > 0 && getOriginalItemKind(items[0]) === "start") {
    const startItem = items.shift();
    assert(startItem && startItem.length > 3);
    const startLine = startItem.shift()! + state.currentLine;
    state.currentLine = startLine;
    const startColumn = startItem.shift()!;
    const kind = scopeKinds[startItem.shift()! - 1];
    assert(kind !== "reference");
    const flags = startItem.shift()!;
    const hasName = !!(flags & 1);
    let name: string | undefined = undefined;
    if (hasName) {
      assert(startItem.length > 0);
      name = names[startItem.shift()!];
    }
    const variables: string[] = [];
    while (startItem.length > 0) {
      variables.push(names[startItem.shift()!]);
    }

    let children: OriginalScope[] = [];
    if (getOriginalItemKind(items[0]) === "start") {
      children = _decodeOriginalScopes(sourceIndex, items, names, state);
    }

    const endItem = items.shift();
    assert(endItem && endItem.length === 2);
    const endLine = endItem.shift()! + state.currentLine;
    state.currentLine = endLine;
    const endColumn = endItem.shift()!;

    const originalScope: OriginalScope = {
      start: { sourceIndex, line: startLine, column: startColumn },
      end: { sourceIndex, line: endLine, column: endColumn },
      kind,
      variables,
    };
    if (name) {
      originalScope.name = name;
    }
    if (children.length > 0) {
      originalScope.children = children;
    }
    originalScopes.push(originalScope);
  }

  return originalScopes;
}

function getOriginalItemKind(item: number[]): "start" | "end" {
  return item.length > 2 ? "start" : "end";
}

interface LineItem {
  line: number;
  item: number[];
}

export function decodeGeneratedRanges(encodedScopes: string, names: string[], originalScopes: OriginalScope[]) {
  const lineItems: LineItem[] = encodedScopes.split(";").flatMap((items, line) =>
    items.split(",").filter(Boolean).map(item => ({ line, item: decode(item) }))
  );
  const decoded = _decodeGeneratedRanges(lineItems, names, originalScopes, {
    currentLine: 0,
    currentColumn: 0,
    currentOriginalScopeSourceIndex: 0,
    currentOriginalScopeIndex: 0,
    currentCallsiteSourceIndex: 0,
    currentCallsiteLine: 0,
    currentCallsiteColumn: 0,
  });
  assert(decoded.length === 1);
  return decoded[0];
}

interface GeneratedRangesDecodeState {
  currentLine: number;
  currentColumn: number;
  currentOriginalScopeSourceIndex: number;
  currentOriginalScopeIndex: number;
  currentCallsiteSourceIndex: number;
  currentCallsiteLine: number;
  currentCallsiteColumn: number;
}

function _decodeGeneratedRanges(lineItems: LineItem[], names: string[], originalScopes: OriginalScope[], state: GeneratedRangesDecodeState): GeneratedRange[] {
  const generatedRanges: GeneratedRange[] = [];

  while (lineItems.length > 0 && getGeneratedItemKind(lineItems[0].item) === "start") {
    const startItem = lineItems.shift();
    assert(startItem && startItem.item.length > 2);
    const startColumn = startItem.item.shift()! + (startItem.line === state.currentLine ? state.currentColumn : 0);
    state.currentLine = startItem.line;
    state.currentColumn = startColumn;
    const kind = scopeKinds[startItem.item.shift()! - 1];
    const flags = startItem.item.shift()!;
    const hasOriginal = !!(flags & 1);
    const hasCallsite = !!(flags & 2);

    let original: GeneratedRange["original"] | undefined = undefined;
    if (hasOriginal) {
      assert(startItem.item.length > 1);
      const sourceIndex = startItem.item.shift()! + state.currentOriginalScopeSourceIndex;
      const scopeIndex = startItem.item.shift()! + (sourceIndex === state.currentOriginalScopeSourceIndex ? state.currentOriginalScopeIndex : 0);
      state.currentOriginalScopeSourceIndex = sourceIndex;
      state.currentOriginalScopeIndex = scopeIndex;
      const scope = findOriginalScope(originalScopes, sourceIndex, scopeIndex);

      let callsite: NonNullable<GeneratedRange["original"]>["callsite"] | undefined = undefined;
      if (hasCallsite) {
        assert(startItem.item.length > 2);
        const sourceIndex = startItem.item.shift()! + state.currentCallsiteSourceIndex;
        const line = startItem.item.shift()! + (sourceIndex === state.currentCallsiteSourceIndex ? state.currentCallsiteLine : 0);
        const column = startItem.item.shift()! + (sourceIndex === state.currentCallsiteSourceIndex && line === state.currentCallsiteLine ? state.currentCallsiteColumn : 0);
        state.currentCallsiteSourceIndex = sourceIndex;
        state.currentCallsiteLine = line;
        state.currentCallsiteColumn = column;
        callsite = { sourceIndex, line, column };
      }

      const values: MultiValue[] = [];
      while (startItem.item.length > 0) {
        let indexOrLength = startItem.item.shift()!;
        let value: MultiValue;
        if (indexOrLength >= -1) {
          value = [lookupName(names, indexOrLength)];
        } else {
          value = [lookupName(names, startItem.item.shift()!)];
          let currentLine = state.currentLine;
          let currentColumn = state.currentColumn;
          while (indexOrLength < -1) {
            const line = currentLine + startItem.item.shift()!;
            const column = startItem.item.shift()! + (line === currentLine ? currentColumn : 0);
            value.push([{ line, column }, lookupName(names, startItem.item.shift()!)]);
            currentLine = line;
            currentColumn = column;
            indexOrLength++;
          }
        }
        values.push(value);
      }

      original = { scope, values };
      if (callsite) {
        original.callsite = callsite;
      }
    }

    let children: GeneratedRange[] = [];
    if (getGeneratedItemKind(lineItems[0].item) === "start") {
      children = _decodeGeneratedRanges(lineItems, names, originalScopes, state);
    }

    const endItem = lineItems.shift();
    assert(endItem && endItem.item.length === 1);
    const endColumn = endItem.item.shift()! + (endItem.line === state.currentLine ? state.currentColumn : 0);
    state.currentLine = endItem.line;
    state.currentColumn = endColumn;

    const generatedRange: GeneratedRange = {
      start: { line: startItem.line, column: startColumn },
      end: { line: endItem.line, column: endColumn },
      kind,
    };
    if (original) {
      generatedRange.original = original;
    }
    if (children.length > 0) {
      generatedRange.children = children;
    }
    generatedRanges.push(generatedRange);
  }

  return generatedRanges;
}

function getGeneratedItemKind(item: number[]): "start" | "end" {
  return item.length > 1 ? "start" : "end";
}

function findOriginalScope(originalScopes: OriginalScope[], sourceIndex: number, scopeIndex: number): OriginalScope {
  const startItems = getScopeItems(originalScopes[sourceIndex]).filter(item => item.kind === "start");
  return startItems[scopeIndex].scope;
}

function lookupName(names: string[], index: number) {
  if (index >= 0) {
    return names[index];
  } else {
    return undefined;
  }
}
