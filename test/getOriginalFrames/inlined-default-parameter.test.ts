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
0 console.log(Math.max(1, 2));
1 console.log(3);
```
*/

const scopeNames = ["module", "n", "f", "function", "x", "y", "block", "2", "1", "3"];
const encodedScopes = "BCAAA,DCC,BHCKEG,DEC,BDAYAG,DJ,CEB,CAA,CCF,ECAA,GIA,ECAC,GJA,IAIA,ECAC,GK,ECMD,GJA,FO,FBP,FA,FA";

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
            name: "f",
            variables: ["n"],
            children: [],
          }
        ]
      },
    ]
  }
];

const generatedRanges: GeneratedRange[] = [{
  start: { line: 0, column: 0 },
  end: { line: 1, column: 15 },
  isStackFrame: false,
  isHidden: false,
  originalScope: originalScopes[0],
  values: ["2", null],
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 1, column: 15 },
      isStackFrame: false,
      isHidden: false,
      originalScope: originalScopes[0].children![0],
      callSite: { sourceIndex: 0, line: 8, column: 0 },
      values: ["1", null],
      children: [
        {
          start: { line: 0, column: 0 },
          end: { line: 1, column: 15 },
          isStackFrame: false,
          isHidden: false,
          originalScope: originalScopes[0].children![0].children![0],
          values: ["3"],
          children: [
            {
              start: { line: 0, column: 12 },
              end: { line: 0, column: 26 },
              isStackFrame: false,
              isHidden: false,
              originalScope: originalScopes[0].children![0],
              values: ["1", null],
              children: [],
            }
          ]
        }
      ]
    }
  ]
}];

const sourceMap = createSourceMapWithScopes(
  [{
    original: { sourceIndex: 0, line: 4, column: 2 },
    generated: { line: 0, column: 0 },
  }, {
    original: { sourceIndex: 0, line: 2, column: 18 },
    generated: { line: 0, column: 12 },
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

test("original frames at line 0, column 0", () => {
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
              "unavailable": true,
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
  {
    "location": {
      "column": 0,
      "line": 8,
      "sourceIndex": 0,
    },
    "name": undefined,
    "scopes": [
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
              "unavailable": true,
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

test("original frames at line 0, column 12", () => {
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
  location: { line: 0, column: 12 },
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
              "unavailable": true,
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
  {
    "location": {
      "column": 0,
      "line": 8,
      "sourceIndex": 0,
    },
    "name": undefined,
    "scopes": [
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
              "unavailable": true,
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
