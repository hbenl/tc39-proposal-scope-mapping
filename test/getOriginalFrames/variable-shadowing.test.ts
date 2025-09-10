import { getOriginalFrames } from "../../src/getOriginalFrames";
import { OriginalScope, GeneratedRange, GeneratedDebuggerScope } from "../../src/types";
import { createSourceMapWithScopes, decodeScopes, encodeScopes } from "../../src/util";

/**
Taken from https://github.com/tc39/source-map-rfc/issues/37#issuecomment-1699356967

Original source:
```javascript
0 function outer(num) {
1   function inner(value) {
2     const value_plus_one = value + 1;
3     console.log(value_plus_one);
4   }
5   const num_plus_one = num + 1;
6   inner(num_plus_one);
7 }
8 outer(1);
```

Generated source:
```javascript
0 function f(a) {
1   function g(a) {
2     const b = a + 1;
3     console.log(b);
4   }
5   const b = a + 1;
6   g(b);
7 }
8 f(1);
```
*/

const scopeNames = ["module", "outer", "function", "inner", "num", "num_plus_one", "value", "value_plus_one", "f", "g", "a", "b"];
const encodedScopes = "BCAAA,DC,BHAACE,DECC,BHBCEA,DCC,CDD,CDB,CBJ,ECAA,GJ,EGAC,GKLM,EHBCC,GLM,FDD,FDB,FBF";
const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 8, column: 9 },
    kind: "module",
    isStackFrame: false,
    variables: ["outer"],
    children: [
      {
        start: { line: 0, column: 0 },
        end: { line: 7, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "outer",
        variables: ["inner", "num", "num_plus_one"],
        children: [
          {
            start: { line: 1, column: 2 },
            end: { line: 4, column: 3 },
            kind: "function",
            isStackFrame: true,
            name: "inner",
            variables: ["value", "value_plus_one"],
            children: [],
          }
        ],
      }
    ],
  },
];

const generatedRanges: GeneratedRange[] = [{
  start: { line: 0, column: 0 },
  end: { line: 8, column: 5 },
  isStackFrame: false,
  isHidden: false,
  originalScope: originalScopes[0],
  values: ["f"],
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 7, column: 1 },
      isStackFrame: true,
      isHidden: false,
      originalScope: originalScopes[0].children![0],
      values: ["g", "a", "b"],
      children: [
        {
          start: { line: 1, column: 2 },
          end: { line: 4, column: 3 },
          isStackFrame: true,
          isHidden: false,
          originalScope: originalScopes[0].children![0].children![0],
          values: ["a", "b"],
          children: [],
        },
      ],
    },
  ],
}];

const sourceMap = createSourceMapWithScopes(
  [{
    original: { sourceIndex: 0, line: 3, column: 4 },
    generated: { line: 3, column: 4 },
  }],
  encodedScopes,
  scopeNames
);

test("decode scopes from sourcemap", () => {
  const { scopes, ranges } = decodeScopes(encodedScopes, scopeNames);
  expect(scopes).toStrictEqual(originalScopes);
  expect(ranges).toStrictEqual(generatedRanges);
});

test("encode scopes to sourcemap", () => {
  const { scopes, names } = encodeScopes(originalScopes, generatedRanges);
  expect(scopes).toStrictEqual(encodedScopes);
  expect(names).toStrictEqual(scopeNames);
});

test("original frames at line 4", () => {
  const debuggerScopes: GeneratedDebuggerScope[] = [
    {
      start: generatedRanges[0].children![0].children![0].start,
      end: generatedRanges[0].children![0].children![0].end,
      bindings: [
        { varname: "a", value: { value: 2 } },
        { varname: "b", value: { value: 3 } },
      ],
    },
    {
      start: generatedRanges[0].children![0].start,
      end: generatedRanges[0].children![0].end,
      bindings: [
        { varname: "a", value: { value: 1 } },
        { varname: "b", value: { value: 2 } },
        { varname: "g", value: { objectId: 3 } },
      ],
    },
    {
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "f", value: { objectId: 2 } },
      ],
    },
    {
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "document", value: { objectId: 1 } }
      ],
    },
  ];
  expect(getOriginalFrames(sourceMap, [{
    location: { line: 3, column: 4 },
    scopes: debuggerScopes,
  }]))
  .toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 4,
      "line": 3,
      "sourceIndex": 0,
    },
    "name": "inner",
    "scopes": [
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
              "objectId": 1,
            },
            "varname": "document",
          },
        ],
      },
    ],
  },
]
`);
});
