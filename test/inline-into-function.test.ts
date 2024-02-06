import { decodeGeneratedScopes, decodeOriginalScopes } from "../src/decodeScopes";
import { encodeGeneratedScopes, encodeOriginalScopes } from "../src/encodeScopes";
import { getOriginalFrames } from "../src/getOriginalFrames";
import { DebuggerScope, GeneratedScope, OriginalScope } from "../src/types";

/**
Taken from https://szuend.github.io/scope-proposal-examples/04_inline_into_function/inline_into_function.html

Original source:
```javascript
0  const CALL_CHANCE = 0.5;
1
2  function log(x) {
3    console.log(x);
4  }
5
6  function inner(x) {
7    log(x);
8  }
9
10 function outer(x) {
11   const shouldCall = Math.random() < CALL_CHANCE;
12   console.log('Do we log?', shouldCall);
13   if (shouldCall) {
14     inner(x);
15   }
16 }
17
18 outer(42);
19 outer(null);
```

Generated source:
```javascript
0 function a(c){const b=.5>Math.random();console.log("Do we log?",b);b&&console.log(c)}a(42);a(null);
```
*/

const scopeNames = ["CALL_CHANCE", "log", "inner", "outer", "x", "shouldCall", "0.5", "c", "b"];
const encodedOriginalScopes = ["AACAACEG,EgBECCI,EC,EkBECEI,EC,EkBECGIK,GkBIA,EG,CC,GY"];
const encodedGeneratedScopes = ",ACCAAMDDD,aECAGOQ,yDKGADAcIO,AKGADAPEO,c,A,C,c";
const originalScopes: OriginalScope[] = [
  {
    start: { sourceIndex: 0, line: 0, column: 0 },
    end: { sourceIndex: 0, line: 19, column: 12 },
    kind: "module",
    variables: ["CALL_CHANCE", "log", "inner", "outer"],
    children: [
      {
        start: { sourceIndex: 0, line: 2, column: 16 },
        end: { sourceIndex: 0, line: 4, column: 1 },
        kind: "function",
        name: "log",
        variables: ["x"],
      },
      {
        start: { sourceIndex: 0, line: 6, column: 18 },
        end: { sourceIndex: 0, line: 8, column: 1 },
        kind: "function",
        name: "inner",
        variables: ["x"],
      },
      {
        start: { sourceIndex: 0, line: 10, column: 18 },
        end: { sourceIndex: 0, line: 16, column: 1 },
        kind: "function",
        name: "outer",
        variables: ["x", "shouldCall"],
        children: [
          {
            start: { sourceIndex: 0, line: 13, column: 18 },
            end: { sourceIndex: 0, line: 15, column: 3 },
            kind: "block",
            variables: [],
          }
        ]
      }
    ],
  }
];

const generatedScopes: GeneratedScope = {
  start: { line: 0, column: 0 },
  end: { line: 0, column: 99 },
  kind: "module",
  original: {
    scope: originalScopes[0],
    values: [["0.5"], [undefined], [undefined], [undefined]],
  },
  children: [
    {
      start: { line: 0, column: 13 },
      end: { line: 0, column: 85 },
      kind: "function",
      original: {
        scope: originalScopes[0].children![2],
        values: [["c"], ["b"]],
      },
      children: [
        {
          start: { line: 0, column: 70 },
          end: { line: 0, column: 84 },
          kind: "reference",
          original: {
            scope: originalScopes[0].children![1],
            values: [["c"]],
            callsite: { sourceIndex: 0, line: 14, column: 4 },
          },
          children: [
            {
              start: { line: 0, column: 70 },
              end: { line: 0, column: 84 },
              kind: "reference",
              original: {
                scope: originalScopes[0].children![0],
                values: [["c"]],
                callsite: { sourceIndex: 0, line: 7, column: 2 },
              },
            }
          ]
        }
      ]
    }
  ]
};

test("decode scopes from sourcemap", () => {
  expect(decodeOriginalScopes(encodedOriginalScopes, scopeNames)).toStrictEqual(originalScopes);
  expect(decodeGeneratedScopes(encodedGeneratedScopes, scopeNames, originalScopes)).toStrictEqual(generatedScopes);
});

test("encode scopes to sourcemap", () => {
  const names: string[] = [];
  const encodedOriginal = originalScopes.map(scope => encodeOriginalScopes(scope, names));
  const encodedGenerated = encodeGeneratedScopes(generatedScopes, originalScopes, names);
  expect(encodedOriginal).toStrictEqual(encodedOriginalScopes);
  expect(encodedGenerated).toStrictEqual(encodedGeneratedScopes);
  expect(names).toStrictEqual(scopeNames);
});

test("original frames at column 71", () => {
  const debuggerScopes: DebuggerScope[] = [
    {
      // The global scope, we only show one example binding
      bindings: [
        { varname: "document", value: { objectId: 1 }}
      ]
    },
    {
      // The module scope
      bindings: [
        { varname: "a", value: { objectId: 2 }}
      ]
    },
    {
      // The function scope
      bindings: [
        { varname: "c", value: { value: 42 } },
        { varname: "b", value: { value: true }},
      ]
    },
  ];
  expect(getOriginalFrames(
    { line: 0, column: 70 },
    { sourceIndex: 0, line: 3, column: 2 },
    generatedScopes,
    originalScopes,
    debuggerScopes
  )).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 2,
      "line": 3,
      "sourceIndex": 0,
    },
    "name": "log",
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
        "bindings": [
          {
            "value": {
              "value": 0.5,
            },
            "varname": "CALL_CHANCE",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "log",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "inner",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "outer",
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
    "location": {
      "column": 2,
      "line": 7,
      "sourceIndex": 0,
    },
    "name": "inner",
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
        "bindings": [
          {
            "value": {
              "value": 0.5,
            },
            "varname": "CALL_CHANCE",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "log",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "inner",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "outer",
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
    "location": {
      "column": 4,
      "line": 14,
      "sourceIndex": 0,
    },
    "name": undefined,
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
        "bindings": [
          {
            "value": {
              "value": 0.5,
            },
            "varname": "CALL_CHANCE",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "log",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "inner",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "outer",
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
          {
            "value": {
              "value": true,
            },
            "varname": "shouldCall",
          },
        ],
      },
      {
        "bindings": [],
      },
    ],
  },
]
`);
});
