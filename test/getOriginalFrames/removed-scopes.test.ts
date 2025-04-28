import { getOriginalFrames } from "../../src/getOriginalFrames";
import { OriginalScope, GeneratedRange, GeneratedDebuggerScope } from "../../src/types";
import { decodeScopes, encodeScopes } from "../../src/util";

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
const encodedScopes = "BCAAA,BCAAC,DE,BCDCA,DA,CDD,CCB,CAA,ECAA,ECAC,GG,EDDCC,GI,FBS,FCB,FA";
const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 8, column: 1 },
    kind: "module",
    isStackFrame: false,
    variables: [],
    children: [
      {
        start: { line: 0, column: 0 },
        end: { line: 8, column: 1 },
        variables: ["x"],
        kind: "block",
        isStackFrame: false,
        children: [
          {
            start: { line: 3, column: 2 },
            end: { line: 6, column: 3 },
            kind: "block",
            isStackFrame: false,
            variables: ["x"],
            children: [],
          }
        ],
      }
    ],
  }
];

const generatedRanges: GeneratedRange[] = [{
  start: { line: 0, column: 0 },
  end: { line: 6, column: 1 },
  isStackFrame: false,
  isHidden: false,
  originalScope: originalScopes[0],
  values: [],
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 6, column: 1 },
      isStackFrame: false,
      isHidden: false,
      originalScope: originalScopes[0].children![0],
      values: ["x1"],
      children: [
        {
          start: { line: 3, column: 2 },
          end: { line: 4, column: 18 },
          isStackFrame: false,
          isHidden: false,
          originalScope: originalScopes[0].children![0].children![0],
          values: ["x2"],
          children: [],
        }
      ],
    }
  ],
}];

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

test("original frames at line 5", () => {
  const debuggerScopes: GeneratedDebuggerScope[] = [
    {
      // The global scope, we only show one example binding
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "document", value: { objectId: 1 }}
      ]
    },
    {
      // The module scope
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: []
    },
    {
      // The block scope
      start: generatedRanges[0].children[0].start,
      end: generatedRanges[0].children[0].end,
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
