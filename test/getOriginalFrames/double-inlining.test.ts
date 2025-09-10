import { getOriginalFrames } from "../../src/getOriginalFrames";
import { OriginalScope, GeneratedRange, GeneratedDebuggerScope } from "../../src/types";
import { createSourceMapWithScopes, decodeScopes, encodeScopes } from "../../src/util";

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

const scopeNames = ["module", "f", "g", "function", "x", '"amet"', '"ipsum"'];
const encodedScopes = "BCAAA,DCC,BHAACG,DE,CCB,BHBACA,DA,CDB,CCrB,ECAA,GAA,ECAE,GG,IAHA,ECAD,GH,IAEC,Fb,FBe,FBrB";
const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 8, column: 43 },
    kind: "module",
    isStackFrame: false,
    variables: ["f", "g"],
    children: [
      {
        start: { line: 0, column: 0 },
        end: { line: 2, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "f",
        variables: ["x"],
        children: [],
      },
      {
        start: { line: 3, column: 0 },
        end: { line: 6, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "g",
        variables: ["x"],
        children: [],
      }
    ],
  }
];

const generatedRanges: GeneratedRange[] = [{
  start: { line: 0, column: 0 },
  end: { line: 2, column: 43 },
  isStackFrame: false,
  isHidden: false,
  originalScope: originalScopes[0],
  values: [null, null],
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 1, column: 30 },
      isStackFrame: false,
      isHidden: false,
      originalScope: originalScopes[0].children![1],
      callSite: { sourceIndex: 0, line: 7, column: 0 },
      values: ['"amet"'],
      children: [
        {
          start: { line: 0, column: 0 },
          end: { line: 0, column: 27 },
          isStackFrame: false,
          isHidden: false,
          originalScope: originalScopes[0].children![0],
          callSite: { sourceIndex: 0, line: 4, column: 2 },
          values: ['"ipsum"'],
          children: [],
        }
      ],
    }
  ],
}];

const sourceMap = createSourceMapWithScopes(
  [{
    original: { sourceIndex: 0, line: 1, column: 2 },
    generated: { line: 0, column: 0 },
  }, {
    original: { sourceIndex: 0, line: 5, column: 2 },
    generated: { line: 1, column: 0 },
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

test("original scopes at line 1", () => {
  const debuggerScopes: GeneratedDebuggerScope[] = [
    {
      // The module scope
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: []
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
  location: { line: 0, column: 0 },
  scopes: debuggerScopes
}])).
toMatchInlineSnapshot(`
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
              "value": "ipsum",
            },
            "varname": "x",
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
              "value": "amet",
            },
            "varname": "x",
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
      "line": 7,
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

test("original scopes at line 2", () => {
  const debuggerScopes: GeneratedDebuggerScope[] = [
    {
      // The module scope
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: []
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
  location: { line: 1, column: 0 },
  scopes: debuggerScopes
}])).
toMatchInlineSnapshot(`
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
              "value": "amet",
            },
            "varname": "x",
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
      "line": 7,
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
