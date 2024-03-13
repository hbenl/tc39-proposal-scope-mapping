import { decodeGeneratedRanges, decodeOriginalScopes } from "../src/decodeScopes";
import { encodeGeneratedRanges, encodeOriginalScopes } from "../src/encodeScopes";
import { getOriginalFrames } from "../src/getOriginalFrames";
import { DebuggerScope, GeneratedRange, OriginalScope } from "../src/types";

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

const scopeNames = ["n", "f", "x", "y", "a", "b", "c", "d"];
const encodedOriginalScopes = ["AACAAC,EUECCEG,AkCIAA,IC,AC,EK"];
const encodedGeneratedRanges = ",AKAAIK;;UKACMO,wBKACI;;;;C,A;;K";

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
            variables: ["n"]
          }
        ]
      },
    ]
  }
];

const generatedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 8, column: 5 },
  isScope: true,
  original: {
    scope: originalScopes[0],
    bindings: ["a", "b"]
  },
  children: [
    {
      start: { line: 2, column: 10 },
      end: { line: 6, column: 1 },
      isScope: true,
      original: {
        scope: originalScopes[0].children![0],
        bindings: ["c", "d"]
      },
      children: [
        {
          start: { line: 2, column: 34 },
          end: { line: 6, column: 1 },
          isScope: true,
          original: {
            scope: originalScopes[0].children![0].children![0],
            bindings: ["a"]
          }
        }
      ]
    },
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

test("original frames at line 4, column 2", () => {
  const debuggerScopes: DebuggerScope[] = [
    {
      // The global scope, we only show one example binding
      bindings: [
        { varname: "document", value: { objectId: 1 }}
      ]
    },
    {
      // The module scope
      bindings: [
        { varname: "a", value: { value: 2 }},
        { varname: "b", value: { objectId: 2 }}
      ]
    },
    {
      // The function parameter scope
      bindings: [
        { varname: "c", value: { value: 1 } },
        { varname: "d", value: { unavailable: true }},
      ]
    },
    {
      // The function body scope
      bindings: [
        { varname: "a", value: { value: 3 }},
      ]
    },
  ];
  expect(getOriginalFrames(
  { line: 4, column: 2 },
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
]
`);
});

test("original frames at line 2, column 18", () => {
  const debuggerScopes: DebuggerScope[] = [
    {
      // The global scope, we only show one example binding
      bindings: [
        { varname: "document", value: { objectId: 1 }}
      ]
    },
    {
      // The module scope
      bindings: [
        { varname: "a", value: { value: 2 }},
        { varname: "b", value: { objectId: 2 }}
      ]
    },
    {
      // The function parameter scope
      bindings: [
        { varname: "c", value: { value: 1 } },
        { varname: "d", value: { unavailable: true }},
      ]
    },
  ];
  expect(getOriginalFrames(
    { line: 2, column: 18 },
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
]
`);
});
