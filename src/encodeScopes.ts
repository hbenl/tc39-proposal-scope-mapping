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
      for (const variableName of item.scope.variables ?? []) {
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

      encodedScopes += encode(
        (item.scope.original ? 1 : 0) +
        (item.scope.original?.callsite ? 2 : 0) +
        (item.scope.isScope ? 4 : 0)
      );

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

        for (const expressionOrBindingRanges of item.scope.original.bindings ?? []) {
          if (typeof expressionOrBindingRanges === "undefined") {
            encodedScopes += encode(-1);
          } else if (typeof expressionOrBindingRanges === "string") {
            encodedScopes += encode(getNameIndex(expressionOrBindingRanges, names));
          } else {
            assert(expressionOrBindingRanges.length > 0);
            if (expressionOrBindingRanges.length === 1) {
              encodedScopes += encode(expressionOrBindingRanges[0].expression ? getNameIndex(expressionOrBindingRanges[0].expression, names) : -1);
            } else {
              encodedScopes += encode(-expressionOrBindingRanges.length);
              encodedScopes += encode(expressionOrBindingRanges[0].expression ? getNameIndex(expressionOrBindingRanges[0].expression, names) : -1);
              let currentLine = item.scope.start.line;
              let currentColumn = item.scope.start.column;
              for (const { start, expression } of expressionOrBindingRanges.slice(1)) {
                if (start.line === currentLine) {
                  assert(start.column > currentColumn);
                  encodedScopes += encode(0);
                  encodedScopes += encode(start.column - currentColumn);
                } else {
                  assert(start.line > currentLine);
                  encodedScopes += encode(start.line - currentLine);
                  encodedScopes += encode(start.column);
                }
                currentLine = start.line;
                currentColumn = start.column;
                encodedScopes += encode(expression ? getNameIndex(expression, names) : -1);
              }
            }
          }
        }
      }
    } else {
      addSeparatorAndRelativeColumn(item.scope.end);
    }
  }

  return encodedScopes.slice(1);
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
