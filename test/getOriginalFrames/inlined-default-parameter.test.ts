import { decodeGeneratedRanges, decodeOriginalScopes } from "../../src/decodeScopes";
import { encodeGeneratedRanges, encodeOriginalScopes } from "../../src/encodeScopes";
import { getOriginalFrames } from "../../src/getOriginalFrames";
import { DebuggerScope, GeneratedRange, OriginalScope } from "../../src/types";

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
const encodedOriginalScopes = ["AAAACE,EUGCEIK,AkCMCEC,IC,AC,EK"];
const encodedGeneratedRanges = "AKAAOD,AGACAQAQD,ACACS,YCADQD,c;e,A,A";

const originalScopes: OriginalScope[] = [
  {
    start: { sourceIndex: 0, line: 0, column: 0 },
    end: { sourceIndex: 0, line: 8, column: 5 },
    kind: "module",
    variables: ["n", "f"],
    children: [
      {
        start: { sourceIndex: 0, line: 2, column: 10 },
        end: { sourceIndex: 0, line: 6, column: 1 },
        kind: "function",
        name: "f",
        variables: ["x", "y"],
        children: [
          {
            start: { sourceIndex: 0, line: 2, column: 34 },
            end: { sourceIndex: 0, line: 6, column: 1 },
            kind: "block",
            name: "f",
            variables: ["n"]
          }
        ]
      },
    ]
  }
];

const generatedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 1, column: 15 },
  isScope: true,
  original: {
    scope: originalScopes[0],
    bindings: ["2", undefined]
  },
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 1, column: 15 },
      isScope: false,
      original: {
        callsite: { sourceIndex: 0, line: 8, column: 0 },
        scope: originalScopes[0].children![0],
        bindings: ["1", undefined],
      },
      children: [
        {
          start: { line: 0, column: 0 },
          end: { line: 1, column: 15 },
          isScope: false,
          original: {
            scope: originalScopes[0].children![0].children![0],
            bindings: ["3"],
          },
          children: [
            {
              start: { line: 0, column: 12 },
              end: { line: 0, column: 26 },
              isScope: false,
              original: {
                scope: originalScopes[0].children![0],
                bindings: ["1", undefined]
              },
            }
          ]
        }
      ]
    }
  ]
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

test("original frames at line 0, column 0", () => {
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
    }
  ];
  expect(getOriginalFrames(
  { line: 0, column: 0 },
  { sourceIndex: 0, line: 4, column: 2 },
  generatedRanges,
  originalScopes,
  debuggerScopes
)).toMatchInlineSnapshot(`
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
              "value": 3,
            },
            "varname": "n",
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
    ],
  },
]
`);
});

test("original frames at line 0, column 12", () => {
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
    }
  ];
  expect(getOriginalFrames(
    { line: 0, column: 12 },
    { sourceIndex: 0, line: 2, column: 18 },
    generatedRanges,
    originalScopes,
    debuggerScopes
  )).toMatchInlineSnapshot(`
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
    ],
  },
]
`);
});
