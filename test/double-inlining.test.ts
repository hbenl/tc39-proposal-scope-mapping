import { decodeGeneratedScopes, decodeOriginalScopes } from "../src/decodeScopes";
import { encodeGeneratedScopes, encodeOriginalScopes } from "../src/encodeScopes";
import { getOriginalFrames } from "../src/getOriginalFrames";
import { DebuggerScope, GeneratedScope, OriginalScope } from "../src/types";

/**
Original source:
```javascript
1 function f(x) {
2   console.log("Lorem " + x);
3 }
4 function g(x) {
5   f("ipsum");
6   console.log("dolor sit " + x);
7 }
8 g("amet");
9 console.log("consectetur adipiscing elit");
```

Generated source:
```javascript
1 console.log("Lorem ipsum");
2 console.log("dolor sit amet");
3 console.log("consectetur adipiscing elit");
```
*/

const scopeNames = ["f", "g", "x", '"amet"', '"ipsum"'];
const encodedOriginalScopes = ["CCCAAC,ACECAE,EE,CCECCE,GE,E4C"];
const encodedGeneratedScopes = ";CCCAADD,AKGAEAQCG,AKGADAHGI,2B;+B;4C";
const originalScopes: OriginalScope[] = [
  {
    start: { sourceIndex: 0, line: 1, column: 1 },
    end: { sourceIndex: 0, line: 9, column: 44 },
    kind: "module",
    variables: ["f", "g"],
    children: [
      {
        start: { sourceIndex: 0, line: 1, column: 1 },
        end: { sourceIndex: 0, line: 3, column: 2 },
        kind: "function",
        name: "f",
        variables: ["x"],
      },
      {
        start: { sourceIndex: 0, line: 4, column: 1 },
        end: { sourceIndex: 0, line: 7, column: 2 },
        kind: "function",
        name: "g",
        variables: ["x"],
      }
    ],
  }
];

const generatedScopes: GeneratedScope = {
  start: { line: 1, column: 1 },
  end: { line: 3, column: 44 },
  kind: "module",
  original: {
    scope: originalScopes[0],
    values: [undefined, undefined],
  },
  children: [
    {
      start: { line: 1, column: 1 },
      end: { line: 2, column: 31 },
      kind: "reference",
      original: {
        callsite: { sourceIndex: 0, line: 8, column: 1 },
        scope: originalScopes[0].children![1],
        values: ['"amet"'],
      },
      children: [
        {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 28 },
          kind: "reference",
          original: {
            callsite: { sourceIndex: 0, line: 5, column: 3 },
            scope: originalScopes[0].children![0],
            values: ['"ipsum"'],
          },
        }
      ],
    }
  ],
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

test("original scopes at line 1", () => {
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
  ];
  expect(getOriginalFrames(
    { line: 1, column: 1 },
    { sourceIndex: 0, line: 2, column: 3 },
    generatedScopes,
    originalScopes,
    debuggerScopes
  )).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 3,
      "line": 2,
      "sourceIndex": 0,
    },
    "name": "f",
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
              "unavailable": true,
            },
            "varname": "f",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "g",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": "ipsum",
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
      "line": 5,
      "sourceIndex": 0,
    },
    "name": "g",
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
              "unavailable": true,
            },
            "varname": "f",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "g",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": "amet",
            },
            "varname": "x",
          },
        ],
      },
    ],
  },
  {
    "location": {
      "column": 1,
      "line": 8,
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
              "unavailable": true,
            },
            "varname": "f",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "g",
          },
        ],
      },
    ],
  },
]
`);
});

test("original scopes at line 2", () => {
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
  ];
  expect(getOriginalFrames(
    { line: 2, column: 1 },
    { sourceIndex: 0, line: 6, column: 3 },
    generatedScopes,
    originalScopes,
    debuggerScopes
  )).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 3,
      "line": 6,
      "sourceIndex": 0,
    },
    "name": "g",
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
              "unavailable": true,
            },
            "varname": "f",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "g",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": "amet",
            },
            "varname": "x",
          },
        ],
      },
    ],
  },
  {
    "location": {
      "column": 1,
      "line": 8,
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
              "unavailable": true,
            },
            "varname": "f",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "g",
          },
        ],
      },
    ],
  },
]
`);
});
