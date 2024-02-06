import { decodeGeneratedScopes, decodeOriginalScopes } from "../src/decodeScopes";
import { encodeGeneratedScopes, encodeOriginalScopes } from "../src/encodeScopes";
import { getOriginalFrames } from "../src/getOriginalFrames";
import { DebuggerScope, GeneratedScope, OriginalScope } from "../src/types";

/**
Original source:
```javascript
0 function f(x) {
1   console.log("Lorem " + x);
2 }
3 function g(x) {
4   f("ipsum");
5   console.log("dolor sit " + x);
6 }
7 g("amet");
8 console.log("consectetur adipiscing elit");
```

Generated source:
```javascript
0 console.log("Lorem ipsum");
1 console.log("dolor sit amet");
2 console.log("consectetur adipiscing elit");
```
*/

const scopeNames = ["f", "g", "x", '"amet"', '"ipsum"'];
const encodedOriginalScopes = ["AACAAC,AAECAE,EC,CAECCE,GC,E2C"];
const encodedGeneratedScopes = ",ACCAADD,AKGAEAOAG,AKGADAHEI,2B;8B;2C";
const originalScopes: OriginalScope[] = [
  {
    start: { sourceIndex: 0, line: 0, column: 0 },
    end: { sourceIndex: 0, line: 8, column: 43 },
    kind: "module",
    variables: ["f", "g"],
    children: [
      {
        start: { sourceIndex: 0, line: 0, column: 0 },
        end: { sourceIndex: 0, line: 2, column: 1 },
        kind: "function",
        name: "f",
        variables: ["x"],
      },
      {
        start: { sourceIndex: 0, line: 3, column: 0 },
        end: { sourceIndex: 0, line: 6, column: 1 },
        kind: "function",
        name: "g",
        variables: ["x"],
      }
    ],
  }
];

const generatedScopes: GeneratedScope = {
  start: { line: 0, column: 0 },
  end: { line: 2, column: 43 },
  kind: "module",
  original: {
    scope: originalScopes[0],
    values: [[undefined], [undefined]],
  },
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 1, column: 30 },
      kind: "reference",
      original: {
        callsite: { sourceIndex: 0, line: 7, column: 0 },
        scope: originalScopes[0].children![1],
        values: [['"amet"']],
      },
      children: [
        {
          start: { line: 0, column: 0 },
          end: { line: 0, column: 27 },
          kind: "reference",
          original: {
            callsite: { sourceIndex: 0, line: 4, column: 2 },
            scope: originalScopes[0].children![0],
            values: [['"ipsum"']],
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
    { line: 0, column: 0 },
    { sourceIndex: 0, line: 1, column: 2 },
    generatedScopes,
    originalScopes,
    debuggerScopes
  )).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 2,
      "line": 1,
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
      "column": 2,
      "line": 4,
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
      "column": 0,
      "line": 7,
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
    { line: 1, column: 0 },
    { sourceIndex: 0, line: 5, column: 2 },
    generatedScopes,
    originalScopes,
    debuggerScopes
  )).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 2,
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
      "column": 0,
      "line": 7,
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
