import { decodeGeneratedScopes, decodeOriginalScopes } from "../src/decodeScopes";
import { encodeGeneratedScopes, encodeOriginalScopes } from "../src/encodeScopes";
import { getOriginalFrames } from "../src/getOriginalFrames";
import { DebuggerScope, GeneratedScope, OriginalScope } from "../src/types";

/**
Taken from https://github.com/tc39/source-map-rfc/issues/37#issuecomment-1699356967

Original source:
```javascript
1 function outer(num) {
2   function inner(value) {
3     const value_plus_one = value + 1;
4     console.log(value_plus_one);
5   }
6   const num_plus_one = num + 1;
7   inner(num_plus_one);
8 }
9 outer(1);
```

Generated source:
```javascript
1 function f(a) {
2   function g(a) {
3     const b = a + 1;
4     console.log(b);
5   }
6   const b = a + 1;
7   g(b);
8 }
9 f(1);
```
*/

const scopeNames = ["outer", "inner", "num", "num_plus_one", "value", "value_plus_one", "f", "g", "a", "b"];
const encodedOriginalScopes = ["CCCAA,ACECACEG,CGECCIK,GI,GE,CU"];
const encodedGeneratedScopes = ";CCCAAM,AECACOQS;GECACQS;;;I;;;E;M";
const originalScopes: OriginalScope[] = [
  {
    start: { sourceIndex: 0, line: 1, column: 1 },
    end: { sourceIndex: 0, line: 9, column: 10 },
    kind: "module",
    variables: ["outer"],
    children: [
      {
        start: { sourceIndex: 0, line: 1, column: 1 },
        end: { sourceIndex: 0, line: 8, column: 2 },
        kind: "function",
        name: "outer",
        variables: ["inner", "num", "num_plus_one"],
        children: [
          {
            start: { sourceIndex: 0, line: 2, column: 3 },
            end: { sourceIndex: 0, line: 5, column: 4 },
            kind: "function",
            name: "inner",
            variables: ["value", "value_plus_one"],
          }
        ],
      }
    ],
  }
];

const generatedScopes: GeneratedScope = {
  start: { line: 1, column: 1 },
  end: { line: 9, column: 6 },
  kind: "module",
  original: {
    scope: originalScopes[0],
    values: ["f"],
  },
  children: [
    {
      start: { line: 1, column: 1 },
      end: { line: 8, column: 2 },
      original: {
        scope: originalScopes[0].children![0],
        values: ["g", "a", "b"],
      },
      kind: "function",
      children: [
        {
          start: { line: 2, column: 3 },
          end: { line: 5, column: 4 },
          kind: "function",
          original: {
            scope: originalScopes[0].children![0].children![0],
            values: ["a", "b"],
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

test("original frames at line 4", () => {
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
        { varname: "f", value: { objectId: 2 } },
      ]
    },
    {
      // The scope of the outer function
      bindings: [
        { varname: "a", value: { value: 1 } },
        { varname: "b", value: { value: 2 } },
        { varname: "g", value: { objectId: 3 } },
      ]
    },
    {
      // The scope of the inner function
      bindings: [
        { varname: "a", value: { value: 2 } },
        { varname: "b", value: { value: 3 } },
      ]
    },
  ];
  expect(getOriginalFrames(
    { line: 4, column: 5 },
    { sourceIndex: 0, line: 4, column: 5 },
    generatedScopes,
    originalScopes,
    debuggerScopes
  )).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 5,
      "line": 4,
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
              "objectId": 2,
            },
            "varname": "outer",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "objectId": 3,
            },
            "varname": "inner",
          },
          {
            "value": {
              "value": 1,
            },
            "varname": "num",
          },
          {
            "value": {
              "value": 2,
            },
            "varname": "num_plus_one",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": 2,
            },
            "varname": "value",
          },
          {
            "value": {
              "value": 3,
            },
            "varname": "value_plus_one",
          },
        ],
      },
    ],
  },
]
`);
});
