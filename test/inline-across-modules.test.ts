import { decodeScopes } from "../src/decodeScopes";
import { encodeScopes } from "../src/encodeScopes";
import { getOriginalFrames } from "../src/getOriginalFrames";
import { DebuggerScope, ScopeType, SourcemapScope } from "../src/types";

/**
Taken from https://github.com/tc39/source-map-rfc/issues/37#issuecomment-1777452640

Original sources:
- one.js:
```javascript
1 import { f } from "./two";
2 let num = 42;
3 f(num);
4 console.log(num++);
```

- two.js:
```javascript
1 let increment = 1;
2 export function f(x) {
3   console.log(x + increment++);
4 }
```

- Generated source:
```javascript
1 let l = 1;
2 let o = 42;
3 var e;
4 (e = o),
5 console.log(e + l++),
6 console.log(o++);
```
*/

const scopeNames = ["increment", "l", "f", "num", "o", "x", "e"];
const scopes = "iBCCMkB,sBCCCWACED,kBECMkBEDGI,sBGCKsBACED,UEGCKsBKM";
const decodedScopes: SourcemapScope[] = [
  {
    type: ScopeType.OTHER,
    name: null,
    start: { line: 1, column: 1 },
    end: { line: 6, column: 18 },
    isInOriginalSource: false,
    isInGeneratedSource: true,
    isOutermostInlinedScope: false,
    bindings: []
  },
  {
    type: ScopeType.OTHER,
    name: null,
    start: { line: 1, column: 1 },
    end: { line: 1, column: 11 },
    isInOriginalSource: true,
    isInGeneratedSource: false,
    isOutermostInlinedScope: true,
    bindings: [
      { varname: "increment", expression: "l" },
      { varname: "f", expression: null },
    ]
  },
  {
    type: ScopeType.OTHER,
    name: null,
    start: { line: 2, column: 1 },
    end: { line: 6, column: 18 },
    isInOriginalSource: true,
    isInGeneratedSource: false,
    isOutermostInlinedScope: false,
    bindings: [
      { varname: "f", expression: null },
      { varname: "num", expression: "o" },
    ]
  },
  {
    type: ScopeType.OTHER,
    name: null,
    start: { line: 3, column: 1 },
    end: { line: 5, column: 22 },
    isInOriginalSource: true,
    isInGeneratedSource: false,
    isOutermostInlinedScope: true,
    bindings: [
      { varname: "increment", expression: "l" },
      { varname: "f", expression: null },
    ]
  },
  {
    type: ScopeType.NAMED_FUNCTION,
    name: "f",
    start: { line: 3, column: 1 },
    end: { line: 5, column: 22 },
    isInOriginalSource: true,
    isInGeneratedSource: false,
    isOutermostInlinedScope: false,
    bindings: [
      { varname: "x", expression: "e" },
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
      // The global scope, we only show the binding introduced by our code
      bindings: [
        { varname: "e", value: { value: 42 }}
      ]
    },
    {
      // The module scope
      bindings: [
        { varname: "l", value: { value: 2 }},
        { varname: "o", value: { value: 42 }}
      ]
    },
  ];
  expect(getOriginalFrames({ line: 5, column: 1 }, decodedScopes, debuggerScopes)).toMatchInlineSnapshot(`
[
  {
    "name": "f",
    "scopes": [
      {
        "bindings": [
          {
            "value": {
              "value": 42,
            },
            "varname": "e",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": 2,
            },
            "varname": "increment",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "f",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": 42,
            },
            "varname": "x",
          },
        ],
      },
    ],
  },
  {
    "name": null,
    "scopes": [
      {
        "bindings": [
          {
            "value": {
              "value": 42,
            },
            "varname": "e",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "unavailable": true,
            },
            "varname": "f",
          },
          {
            "value": {
              "value": 42,
            },
            "varname": "num",
          },
        ],
      },
    ],
  },
]
`);
});
