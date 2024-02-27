import { encode } from "vlq";
import { GeneratedRange, Location, OriginalScope } from "./types";
import { assert, getScopeItems, scopeKinds } from "./util";

export function encodeOriginalScopes(originalScope: OriginalScope, names: string[]): string {
  let currentLine = 0;
  const encodedItems: string[] = [];

  for (const item of getScopeItems(originalScope)) {
    let encodedItem = "";

    if (item.kind === "start") {
      encodedItem += encode(item.scope.start.line - currentLine);
      encodedItem += encode(item.scope.start.column);
      encodedItem += encode(scopeKinds.indexOf(item.scope.kind) + 1);
      encodedItem += encode((item.scope.name ? 1 : 0));
      if (item.scope.name) {
        encodedItem += encode(getNameIndex(item.scope.name, names));
      }
      for (const variableName of item.scope.variables) {
        encodedItem += encode(getNameIndex(variableName, names));
      }
      currentLine = item.scope.start.line;
    } else {
      encodedItem += encode(item.scope.end.line - currentLine);
      encodedItem += encode(item.scope.end.column);
      currentLine = item.scope.end.line;
    }

    encodedItems.push(encodedItem);
  }

  return encodedItems.join(",");
}

export function encodeGeneratedRanges(generatedRange: GeneratedRange, originalScopes: OriginalScope[], names: string[]): string {
  let currentLine = 0;
  let currentColumn = 0;
  let currentOriginalScopeSourceIndex = 0;
  let currentOriginalScopeIndex = 0;
  let currentCallsiteSourceIndex = 0;
  let currentCallsiteLine = 0;
  let currentCallsiteColumn = 0;
  let encodedScopes = "";

  function addSeparatorAndRelativeColumn(location: Location) {
    if (location.line > currentLine) {
      encodedScopes += ";".repeat(location.line - currentLine);
      encodedScopes += encode(location.column);
    } else {
      encodedScopes += ",";
      encodedScopes += encode(location.column - currentColumn);
    }
    currentLine = location.line;
    currentColumn = location.column;
  }

  const items = getScopeItems(generatedRange);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.kind === "start") {
      addSeparatorAndRelativeColumn(item.scope.start);

      encodedScopes += encode(scopeKinds.indexOf(item.scope.kind) + 1);
      encodedScopes += encode((item.scope.original ? 1 : 0) + (item.scope.original?.callsite ? 2 : 0));

      if (item.scope.original) {
        const { sourceIndex, scopeIndex } = findOriginalScopeIndices(item.scope.original.scope, originalScopes);
        encodedScopes += encode(sourceIndex - currentOriginalScopeSourceIndex);
        encodedScopes += encode(scopeIndex - (sourceIndex === currentOriginalScopeSourceIndex ? currentOriginalScopeIndex : 0));
        currentOriginalScopeSourceIndex = sourceIndex;
        currentOriginalScopeIndex = scopeIndex;

        const callsite = item.scope.original.callsite;
        if (callsite) {
          encodedScopes += encode(callsite.sourceIndex - currentCallsiteSourceIndex);
          encodedScopes += encode(callsite.line - (callsite.sourceIndex === currentCallsiteSourceIndex ? currentCallsiteLine : 0));
          encodedScopes += encode(callsite.column - (callsite.sourceIndex === currentCallsiteSourceIndex && callsite.line === currentCallsiteLine ? currentCallsiteColumn : 0));
          currentCallsiteSourceIndex = callsite.sourceIndex;
          currentCallsiteLine = callsite.line;
          currentCallsiteColumn = callsite.column;
        }

        for (const value of item.scope.original.values) {
          assert(value.length > 0);
          if (value.length === 1) {
            encodedScopes += encode(value[0] ? getNameIndex(value[0], names) : -1);
          } else {
            encodedScopes += encode(-value.length);
            encodedScopes += encode(value[0] ? getNameIndex(value[0], names) : -1);
            let currentLine = item.scope.start.line;
            let currentColumn = item.scope.start.column;
            for (const [loc, val] of value.slice(1) as [Location, string | undefined][]) {
              if (loc.line === currentLine) {
                assert(loc.column > currentColumn);
                encodedScopes += encode(0);
                encodedScopes += encode(loc.column - currentColumn);
              } else {
                assert(loc.line > currentLine);
                encodedScopes += encode(loc.line - currentLine);
                encodedScopes += encode(loc.column);
              }
              currentLine = loc.line;
              currentColumn = loc.column;
              encodedScopes += encode(val ? getNameIndex(val, names) : -1);
            }
          }
        }
      }
    } else {
      addSeparatorAndRelativeColumn(item.scope.end);
    }
  }

  return encodedScopes;
}

function findOriginalScopeIndices(needle: OriginalScope, haystack: OriginalScope[]): { sourceIndex: number; scopeIndex: number; } {
  for (let sourceIndex = 0; sourceIndex < haystack.length; sourceIndex++) {
    const startItems = getScopeItems(haystack[sourceIndex]).filter(item => item.kind === "start");
    const scopeIndex = startItems.findIndex(item => item.scope === needle);
    if (scopeIndex >= 0) {
      return { sourceIndex, scopeIndex };
    }
  }
  assert(false);
}

function getNameIndex(name: string, names: string[]) {
  let index = names.indexOf(name);
  if (index < 0) {
    names.push(name);
    index = names.length - 1;
  }
  return index;
}
