import { decodeGeneratedScopes, decodeOriginalScopes } from "../src/decodeScopes";
import { encodeGeneratedScopes, encodeOriginalScopes } from "../src/encodeScopes";
import { getOriginalFrames } from "../src/getOriginalFrames";
import { DebuggerScope, GeneratedScope, OriginalScope } from "../src/types";

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
const encodedOriginalScopes = ["CCCA,ACIAA,GGIAA,GI,EE,AE"];
const encodedGeneratedScopes = ";CCCAA,AICACC;;;GKCACE;mB;;E,A";
const originalScopes: OriginalScope[] = [
  {
    start: { sourceIndex: 0, line: 1, column: 1 },
    end: { sourceIndex: 0, line: 9, column: 2 },
    kind: "module",
    variables: [],
    children: [
      {
        start: { sourceIndex: 0, line: 1, column: 1 },
        end: { sourceIndex: 0, line: 9, column: 2 },
        variables: ["x"],
        kind: "block",
        children: [
          {
            start: { sourceIndex: 0, line: 4, column: 3 },
            end: { sourceIndex: 0, line: 7, column: 4 },
            kind: "block",
            variables: ["x"],
          }
        ],
      }
    ],
  }
];

const generatedScopes: GeneratedScope = {
  start: { line: 1, column: 1 },
  end: { line: 7, column: 2 },
  kind: "module",
  original: {
    scope: originalScopes[0],
    values: [],
  },
  children: [
    {
      start: { line: 1, column: 1 },
      end: { line: 7, column: 2 },
      kind: "block",
      original: {
        scope: originalScopes[0].children![0],
        values: ["x1"],
      },
      children: [
        {
          start: { line: 4, column: 3 },
          end: { line: 5, column: 19 },
          kind: "reference",
          original: {
            scope: originalScopes[0].children![0].children![0],
            values: ["x2"],
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
    generatedScopes,
    originalScopes,
    debuggerScopes
  )).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 5,
      "line": 6,
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
