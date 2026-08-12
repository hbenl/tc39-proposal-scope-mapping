import { getOriginalFrames } from "../../src/getOriginalFrames";
import { OriginalScope, GeneratedRange, GeneratedDebuggerScope } from "../../src/types";
import { createSourceMapWithScopes, decodeScopes, encodeScopes } from "../../src/util";

/**
Original source:
```javascript
0 function inner(msg) {
1   console.log(msg);
2 }
3 function outer() {
4   inner("moved!");
5 }
6 outer();
```

Generated source:
```javascript
0 function outer() {
1   (() => console.log("moved!"))();
2 }
3 outer();
```
*/

const scopeNames = ["module", "inner", "outer", "function", "msg", '"moved!"'];
const encodedScopes = "BCAAA,DCC,BGAAG,DE,CCB,BGBAA,CCB,CBI,ECAA,GAD,ECAE,EHBJD,GG,FV,FCI,FA";
const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 6, column: 8 },
    kind: "module",
    isStackFrame: false,
    variables: ["inner", "outer"],
    children: [
      {
        start: { line: 0, column: 0 },
        end: { line: 2, column: 1 },
        kind: "function",
        isStackFrame: true,
        variables: ["msg"],
        children: [],
      },
      {
        start: { line: 3, column: 0 },
        end: { line: 5, column: 1 },
        kind: "function",
        isStackFrame: true,
        variables: [],
        children: [],
      }
    ]
  }
];

const generatedRanges: GeneratedRange[] = [{
  start: { line: 0, column: 0 },
  end: { line: 3, column: 8 },
  isStackFrame: false,
  isHidden: false,
  originalScope: originalScopes[0],
  values: [null, "outer"],
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 3, column: 8 },
      isStackFrame: false,
      isHidden: false,
      originalScope: originalScopes[0].children![1],
      values: [],
      children: [
        {
          start: { line: 1, column: 9 },
          end: { line: 1, column: 30 },
          isStackFrame: true,
          isHidden: false,
          originalScope: originalScopes[0].children![0],
          values: ['"moved!"'],
          children: [],
        }
      ],
    }
  ],
}];

const sourceMap = createSourceMapWithScopes(
  [{
    original: { sourceIndex: 0, line: 1, column: 9 },
    generated: { line: 1, column: 16 },
  }, {
    original: { sourceIndex: 0, line: 4, column: 7 },
    generated: { line: 1, column: 31 },
  }, {
    original: { sourceIndex: 0, line: 6, column: 0 },
    generated: { line: 3, column: 0 },
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

test("original frames at line 1, column 16", () => {
  const debuggerScopes: GeneratedDebuggerScope[] = [
    {
      // The inner function scope
      start: generatedRanges[0].children[0].children[0].start,
      end: generatedRanges[0].children[0].children[0].end,
      bindings: []
    },
    {
      // The outer function scope
      start: generatedRanges[0].children[0].start,
      end: generatedRanges[0].children[0].end,
      bindings: []
    },
    {
      // The module scope
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "inner", value: { unavailable: true }},
        { varname: "outer", value: { objectId: 2 }}
      ]
    },
    {
      // The global scope, we only show one example binding
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "document", value: { objectId: 1 }}
      ]
    },
  ];
  //TODO add more frames
  expect(getOriginalFrames(sourceMap, [{
  location: { line: 1, column: 16 },
  scopes: debuggerScopes
}, {
  location: { line: 1, column: 31 },
  scopes: debuggerScopes.slice(1)
}, {
  location: { line: 3, column: 0 },
  scopes: debuggerScopes.slice(2)
}])).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 9,
      "line": 1,
      "sourceIndex": 0,
    },
    "name": undefined,
    "scopes": [
      {
        "bindings": [
          {
            "value": {
              "value": "moved!",
            },
            "varname": "msg",
          },
        ],
      },
      {
        "bindings": [
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
              "objectId": 1,
            },
            "varname": "document",
          },
        ],
      },
    ],
  },
  {
    "location": {
      "column": 7,
      "line": 4,
      "sourceIndex": 0,
    },
    "name": undefined,
    "scopes": [
      {
        "bindings": [],
      },
      {
        "bindings": [
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
              "objectId": 1,
            },
            "varname": "document",
          },
        ],
      },
    ],
  },
  {
    "location": {
      "column": 0,
      "line": 6,
      "sourceIndex": 0,
    },
    "name": undefined,
    "scopes": [
      {
        "bindings": [
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
