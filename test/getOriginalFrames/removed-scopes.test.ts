import { decodeGeneratedRanges, decodeOriginalScopes } from "../../src/decodeScopes";
import { encodeGeneratedRanges, encodeOriginalScopes } from "../../src/encodeScopes";
import { getOriginalFrames } from "../../src/getOriginalFrames";
import { DebuggerScope, GeneratedRange, OriginalScope } from "../../src/types";

/**
Taken from https://github.com/tc39/source-map-rfc/issues/37#issuecomment-1699356967

Original source:
```javascript
0 {
1   let x = 1;
2   console.log(x);
3   {
4     let x = 2;
5     console.log(x);
6   }
7   console.log(x);
8 }
```

Generated source:
```javascript
0 {
1   var x1 = 1;
2   console.log(x1);
3   var x2 = 2;
4   console.log(x2);
5   console.log(x1);
6 }
```
*/

const scopeNames = ["module", "block", "x", "x1", "x2"];
const encodedOriginalScopes = ["AAAA,AACAE,GECAE,GG,EC,AC"];
const encodedGeneratedRanges = "AKAA,AKACG;;;ECACI;kB;;C,A";
const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 8, column: 1 },
    kind: "module",
    variables: [],
    children: [
      {
        start: { line: 0, column: 0 },
        end: { line: 8, column: 1 },
        variables: ["x"],
        kind: "block",
        children: [
          {
            start: { line: 3, column: 2 },
            end: { line: 6, column: 3 },
            kind: "block",
            variables: ["x"],
          }
        ],
      }
    ],
  }
];

const generatedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 6, column: 1 },
  isScope: true,
  original: {
    scope: originalScopes[0],
    bindings: [],
  },
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 6, column: 1 },
      isScope: true,
      original: {
        scope: originalScopes[0].children![0],
        bindings: ["x1"],
      },
      children: [
        {
          start: { line: 3, column: 2 },
          end: { line: 4, column: 18 },
          isScope: false,
          original: {
            scope: originalScopes[0].children![0].children![0],
            bindings: ["x2"],
          },
        }
      ],
    }
  ],
};

test("decode scopes from sourcemap", () => {
  expect(decodeOriginalScopes(encodedOriginalScopes, scopeNames)).toStrictEqual(originalScopes);
  expect(decodeGeneratedRanges(encodedGeneratedRanges, scopeNames, originalScopes)).toStrictEqual(generatedRanges);
});

test("encode scopes to sourcemap", () => {
  const names: string[] = [];
  const encodedOriginal = originalScopes.map(scope => encodeOriginalScopes(scope, names));
  const encodedGenerated = encodeGeneratedRanges(generatedRanges, originalScopes, names);
  expect(encodedOriginal).toStrictEqual(encodedOriginalScopes);
  expect(encodedGenerated).toStrictEqual(encodedGeneratedRanges);
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
    { line: 4, column: 2 },
    { sourceIndex: 0, line: 5, column: 4 },
    generatedRanges,
    originalScopes,
    debuggerScopes
  )).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 4,
      "line": 5,
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
