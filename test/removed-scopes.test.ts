import { decodeScopes } from "../src/decodeScopes";
import { encodeScopes } from "../src/encodeScopes";
import { getOriginalFrames } from "../src/getOriginalFrames";
import { DebuggerScope, ScopeType, SourcemapScope } from "../src/types";

/**
Taken from https://github.com/tc39/source-map-rfc/issues/37#issuecomment-1699356967

Original source:
```javascript
1 {
2   let x = 1;
3   console.log(x);
4   {
5     let x = 2;
6     console.log(x);
7   }
8   console.log(x);
9 }
```

Generated source:
```javascript
1 {
2   var x1 = 1;
3   console.log(x1);
4   var x2 = 2;
5   console.log(x2);
6   console.log(x1);
7 }
```
*/

const scopeNames = ["x", "x1", "x2"];
const scopes = "mBCCOE,mBCCOEAC,kBICKoBAE";
const decodedScopes: SourcemapScope[] = [
  {
    type: ScopeType.OTHER,
    name: null,
    start: { line: 1, column: 1 },
    end: { line: 7, column: 2 },
    callsite: null,
    isInOriginalSource: true,
    isInGeneratedSource: true,
    isOutermostInlinedScope: false,
    bindings: []
  },
  {
    type: ScopeType.OTHER,
    name: null,
    start: { line: 1, column: 1 },
    end: { line: 7, column: 2 },
    callsite: null,
    isInOriginalSource: true,
    isInGeneratedSource: true,
    isOutermostInlinedScope: false,
    bindings: [
      { varname: "x", expression: "x1" },
    ]
  },
  {
    type: ScopeType.OTHER,
    name: null,
    start: { line: 4, column: 1 },
    end: { line: 5, column: 20 },
    callsite: null,
    isInOriginalSource: true,
    isInGeneratedSource: false,
    isOutermostInlinedScope: false,
    bindings: [
      { varname: "x", expression: "x2" },
    ]
  },
];

test("decode scopes from sourcemap", () => {
  expect(decodeScopes(scopes, scopeNames)).toStrictEqual(decodedScopes);
});

test("encode scopes to sourcemap", () => {
  const { scopes: encodedScopes, names } = encodeScopes(decodedScopes);
  expect(encodedScopes).toBe(scopes);
  expect(names).toStrictEqual(scopeNames);
});

test("original frames at line 5", () => {
  const debuggerScopes: DebuggerScope[] = [
    {
      // The global scope, we only show one example binding
      bindings: [
        { varname: "document", value: { objectId: 1 }}
      ]
    },
    {
      // The module scope
      bindings: []
    },
    {
      // The block scope
      bindings: [
        { varname: "x1", value: { value: 1 } },
        { varname: "x2", value: { value: 2 } },
      ]
    },
  ];
  expect(getOriginalFrames(
  { line: 5, column: 3 },
  { sourceIndex: 0, line: 6, column: 5 },
  decodedScopes,
  debuggerScopes
)).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 5,
      "line": 6,
      "sourceIndex": 0,
    },
    "name": null,
    "scopes": [
      {
        "bindings": [
          {
            "value": {
              "objectId": 1,
            },
            "varname": "document",
          },
        ],
      },
      {
        "bindings": [],
      },
      {
        "bindings": [
          {
            "value": {
              "value": 1,
            },
            "varname": "x",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": 2,
            },
            "varname": "x",
          },
        ],
      },
    ],
  },
]
`);
});
