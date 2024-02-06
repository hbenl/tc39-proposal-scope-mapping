import { decodeGeneratedScopes, decodeOriginalScopes } from "../src/decodeScopes";
import { encodeGeneratedScopes, encodeOriginalScopes } from "../src/encodeScopes";
import { getOriginalFrames } from "../src/getOriginalFrames";
import { DebuggerScope, GeneratedScope, OriginalScope } from "../src/types";

/**
Taken from https://szuend.github.io/scope-proposal-examples/04_inline_into_function/inline_into_function.html

Original source:
```javascript
const CALL_CHANCE = 0.5;

function log(x) {
  console.log(x);
}

function inner(x) {
  log(x);
}

function outer(x) {
  const shouldCall = Math.random() < CALL_CHANCE;
  console.log('Do we log?', shouldCall);
  if (shouldCall) {
    inner(x);
  }
}

outer(42);
outer(null);
```

Generated source:
```javascript
function a(c){const b=.5>Math.random();console.log("Do we log?",b);b&&console.log(c)}a(42);a(null);
```
*/

const scopeNames = ["CALL_CHANCE", "log", "inner", "outer", "x", "shouldCall", "0.5", "c", "b"];
const encodedOriginalScopes = ["CCCAACEG,EaECCI,EE,EmBECEI,EE,EmBECGIK,GmBIA,EI,CE,Ya"];
const encodedGeneratedScopes = ";CCCAAMDDD,aECAGOQ,yDKGADAeKO,AKGADAPGO,c,A,C,c";
const originalScopes: OriginalScope[] = [
  {
    start: { sourceIndex: 0, line: 1, column: 1 },
    end: { sourceIndex: 0, line: 29, column: 13 },
    kind: "module",
    variables: ["CALL_CHANCE", "log", "inner", "outer"],
    children: [
      {
        start: { sourceIndex: 0, line: 3, column: 13 },
        end: { sourceIndex: 0, line: 5, column: 2 },
        kind: "function",
        name: "log",
        variables: ["x"],
      },
      {
        start: { sourceIndex: 0, line: 7, column: 19 },
        end: { sourceIndex: 0, line: 9, column: 2 },
        kind: "function",
        name: "inner",
        variables: ["x"],
      },
      {
        start: { sourceIndex: 0, line: 11, column: 19 },
        end: { sourceIndex: 0, line: 17, column: 2 },
        kind: "function",
        name: "outer",
        variables: ["x", "shouldCall"],
        children: [
          {
            start: { sourceIndex: 0, line: 14, column: 19 },
            end: { sourceIndex: 0, line: 16, column: 4 },
            kind: "block",
            variables: [],
          }
        ]
      }
    ],
  }
];

const generatedScopes: GeneratedScope = {
  start: { line: 1, column: 1 },
  end: { line: 1, column: 100 },
  kind: "module",
  original: {
    scope: originalScopes[0],
    values: [["0.5"], [undefined], [undefined], [undefined]],
  },
  children: [
    {
      start: { line: 1, column: 14 },
      end: { line: 1, column: 86 },
      kind: "function",
      original: {
        scope: originalScopes[0].children![2],
        values: [["c"], ["b"]],
      },
      children: [
        {
          start: { line: 1, column: 71 },
          end: { line: 1, column: 85 },
          kind: "reference",
          original: {
            scope: originalScopes[0].children![1],
            values: [["c"]],
            callsite: { sourceIndex: 0, line: 15, column: 5 },
          },
          children: [
            {
              start: { line: 1, column: 71 },
              end: { line: 1, column: 85 },
              kind: "reference",
              original: {
                scope: originalScopes[0].children![0],
                values: [["c"]],
                callsite: { sourceIndex: 0, line: 8, column: 3 },
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
  { line: 1, column: 71 },
  { sourceIndex: 0, line: 4, column: 3 },
  generatedScopes,
  originalScopes,
  debuggerScopes
)).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 3,
      "line": 4,
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
      "column": 3,
      "line": 8,
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
      "column": 5,
      "line": 15,
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
