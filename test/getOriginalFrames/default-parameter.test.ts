import { getOriginalFrames } from "../../src/getOriginalFrames";
import { OriginalScope, GeneratedRange, GeneratedDebuggerScope } from "../../src/types";
import { createSourceMapWithScopes, decodeScopes, encodeScopes } from "../../src/util";

/*
Original source:
```javascript
0 const n = 2;
1
2 function f(x, y = Math.max(x, n)) {
3   const n = 3;
4   console.log(y);
5   console.log(n);
6 }
7
8 f(1);
```

Generated source:
```javascript
0 const a = 2;
1
2 function b(c, d = Math.max(c, a)) {
3   const a = 3;
4   console.log(d);
5   console.log(a);
6 }
7
8 b(1);
```
*/

const scopeNames = ["module", "n", "f", "function", "x", "y", "block", "a", "b", "c", "d"];
const encodedScopes = "BCAAA,DCC,BHCKEG,DEC,BCAYG,DJ,CEB,CAA,CCF,ECAA,GOQ,EHCKC,GSU,ECYC,GO,FEB,FA,FCF";

const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 8, column: 5 },
    kind: "module",
    isStackFrame: false,
    variables: ["n", "f"],
    children: [
      {
        start: { line: 2, column: 10 },
        end: { line: 6, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "f",
        variables: ["x", "y"],
        children: [
          {
            start: { line: 2, column: 34 },
            end: { line: 6, column: 1 },
            kind: "block",
            isStackFrame: false,
            variables: ["n"],
            children: []
          }
        ]
      },
    ]
  }
];

const generatedRanges: GeneratedRange[] = [{
  start: { line: 0, column: 0 },
  end: { line: 8, column: 5 },
  isStackFrame: false,
  isHidden: false,
  originalScope: originalScopes[0],
  values: ["a", "b"],
  children: [
    {
      start: { line: 2, column: 10 },
      end: { line: 6, column: 1 },
      isStackFrame: true,
      isHidden: false,
      originalScope: originalScopes[0].children![0],
      values: ["c", "d"],
      children: [
        {
          start: { line: 2, column: 34 },
          end: { line: 6, column: 1 },
          isStackFrame: false,
          isHidden: false,
          originalScope: originalScopes[0].children![0].children![0],
          values: ["a"],
          children: []
        }
      ]
    },
  ]
}];

const sourceMap = createSourceMapWithScopes(
  [{
    original: { sourceIndex: 0, line: 4, column: 2 },
    generated: { line: 4, column: 2 },
  }, {
    original: { sourceIndex: 0, line: 2, column: 18 },
    generated: { line: 2, column: 18 },
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

test("original frames at line 4, column 2", () => {
  const debuggerScopes: GeneratedDebuggerScope[] = [
    {
      // The function body scope
      start: generatedRanges[0].children[0].children[0].start,
      end: generatedRanges[0].children[0].children[0].end,
      bindings: [
        { varname: "a", value: { value: 3 }},
      ]
    },
    {
      // The function parameter scope
      start: generatedRanges[0].children[0].start,
      end: generatedRanges[0].children[0].end,
      bindings: [
        { varname: "c", value: { value: 1 } },
        { varname: "d", value: { unavailable: true }},
      ]
    },
    {
      // The module scope
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "a", value: { value: 2 }},
        { varname: "b", value: { objectId: 2 }}
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
  expect(getOriginalFrames(sourceMap, [{
  location: { line: 4, column: 2 },
  scopes: debuggerScopes
}])).
toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 2,
      "line": 4,
      "sourceIndex": 0,
    },
    "name": "f",
    "scopes": [
      {
        "bindings": [
          {
            "value": {
              "value": 3,
            },
            "varname": "n",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": 1,
            },
            "varname": "x",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "y",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": 2,
            },
            "varname": "n",
          },
          {
            "value": {
              "objectId": 2,
            },
            "varname": "f",
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

test("original frames at line 2, column 18", () => {
  const debuggerScopes: GeneratedDebuggerScope[] = [
    {
      // The function parameter scope
      start: generatedRanges[0].children[0].start,
      end: generatedRanges[0].children[0].end,
      bindings: [
        { varname: "c", value: { value: 1 } },
        { varname: "d", value: { unavailable: true }},
      ]
    },
    {
      // The module scope
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "a", value: { value: 2 }},
        { varname: "b", value: { objectId: 2 }}
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
  expect(getOriginalFrames(sourceMap, [{
  location: { line: 2, column: 18 },
  scopes: debuggerScopes
}])).
toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 18,
      "line": 2,
      "sourceIndex": 0,
    },
    "name": "f",
    "scopes": [
      {
        "bindings": [
          {
            "value": {
              "value": 1,
            },
            "varname": "x",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "y",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": 2,
            },
            "varname": "n",
          },
          {
            "value": {
              "objectId": 2,
            },
            "varname": "f",
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
