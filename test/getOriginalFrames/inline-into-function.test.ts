import { getOriginalFrames } from "../../src/getOriginalFrames";
import { OriginalScope, GeneratedRange, GeneratedDebuggerScope } from "../../src/types";
import { decodeScopes, encodeScopes } from "../../src/util";

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

const scopeNames = ["module", "CALL_CHANCE", "log", "inner", "outer", "function", "x", "shouldCall", "block", "0.5", "a", "c", "b"];
const encodedScopes = "BCAAA,DCCCC,BHCQEK,DE,CCB,BHCSCA,DA,CCB,BHCSCA,DAC,BCDSG,CCD,CBB,CDM,ECAA,GSDDU,EGNG,GWY,EC5BD,GW,IAOE,ECAD,GW,IAHC,FO,FA,FB,FO";
const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 19, column: 12 },
    kind: "module",
    isStackFrame: false,
    variables: ["CALL_CHANCE", "log", "inner", "outer"],
    children: [
      {
        start: { line: 2, column: 16 },
        end: { line: 4, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "log",
        variables: ["x"],
        children: [],
      },
      {
        start: { line: 6, column: 18 },
        end: { line: 8, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "inner",
        variables: ["x"],
        children: [],
      },
      {
        start: { line: 10, column: 18 },
        end: { line: 16, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "outer",
        variables: ["x", "shouldCall"],
        children: [
          {
            start: { line: 13, column: 18 },
            end: { line: 15, column: 3 },
            kind: "block",
            isStackFrame: false,
            variables: [],
            children: [],
          }
        ]
      }
    ],
  }
];

const generatedRanges: GeneratedRange[] = [{
  start: { line: 0, column: 0 },
  end: { line: 0, column: 99 },
  isStackFrame: false,
  isHidden: false,
  originalScope: originalScopes[0],
  values: ["0.5", null, null, "a"],
  children: [
    {
      start: { line: 0, column: 13 },
      end: { line: 0, column: 85 },
      isStackFrame: true,
      isHidden: false,
      originalScope: originalScopes[0].children![2],
      values: ["c", "b"],
      children: [
        {
          start: { line: 0, column: 70 },
          end: { line: 0, column: 84 },
          isStackFrame: false,
          isHidden: false,
          originalScope: originalScopes[0].children![1],
          values: ["c"],
          callSite: { sourceIndex: 0, line: 14, column: 4 },
          children: [
            {
              start: { line: 0, column: 70 },
              end: { line: 0, column: 84 },
              isStackFrame: false,
              isHidden: false,
              originalScope: originalScopes[0].children![0],
              values: ["c"],
              callSite: { sourceIndex: 0, line: 7, column: 2 },
              children: [],
            }
          ]
        }
      ]
    }
  ]
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

test("original frames at column 71", () => {
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
      bindings: [
        { varname: "a", value: { objectId: 2 }}
      ]
    },
    {
      // The function scope
      start: generatedRanges[0].children[0].start,
      end: generatedRanges[0].children[0].end,
      bindings: [
        { varname: "c", value: { value: 42 } },
        { varname: "b", value: { value: true }},
      ]
    },
  ];
  expect(getOriginalFrames(
    { line: 0, column: 70 },
    { sourceIndex: 0, line: 3, column: 2 },
    generatedRanges,
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
