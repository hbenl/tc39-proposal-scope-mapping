import { decodeGeneratedRanges, decodeOriginalScopes } from "../src/decodeScopes";
import { encodeGeneratedRanges, encodeOriginalScopes } from "../src/encodeScopes";
import { getOriginalFrames } from "../src/getOriginalFrames";
import { DebuggerScope, GeneratedRange, OriginalScope } from "../src/types";

/**
Original source:
```javascript
0 function log(msg) {
1   console.log(msg);
2 }
3 let x = "foo";
4 log(x);
5 x = "bar";
6 log(x);
```

Generated source:
```javascript
0 console.log("foo");
1 console.log("bar");
```
*/

const scopeNames = ["log", "x", "msg", "\"foo\"", "\"bar\""];
const encodedOriginalScopes = ["AACAAC,AkBECAE,EC,IO"];
const encodedGeneratedRanges = ",ACCAADFGCAI,AKGACAICG,mB;AKGAAAEAI,mB,A";

const originalScopes: OriginalScope[] = [
  {
    start: { sourceIndex: 0, line: 0, column: 0 },
    end: { sourceIndex: 0, line: 6, column: 7 },
    kind: "module",
    variables: ["log", "x"],
    children: [
      {
        start: { sourceIndex: 0, line: 0, column: 18 },
        end: { sourceIndex: 0, line: 2, column: 1 },
        kind: "function",
        name: "log",
        variables: ["msg"],
      }
    ]
  }
];

const generatedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 1, column: 19 },
  kind: "module",
  original: {
    scope: originalScopes[0],
    bindings: [
      undefined,
      [{
        start: { line: 0, column: 0 },
        end: { line: 1, column: 0 },
        expression: "\"foo\""
      }, {
        start: { line: 1, column: 0 },
        end: { line: 1, column: 19 },
        expression: "\"bar\""
      }]
    ],
  },
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 0, column: 19 },
      kind: "reference",
      original: {
        callsite: { sourceIndex: 0, line: 4, column: 1 },
        scope: originalScopes[0].children![0],
        bindings: ["\"foo\""],
      },
    },
    {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 19 },
      kind: "reference",
      original: {
        callsite: { sourceIndex: 0, line: 6, column: 0 },
        scope: originalScopes[0].children![0],
        bindings: ["\"bar\""],
      },
    }
  ]
}

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

test("original frames at line 1", () => {
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
        { varname: "log", value: { objectId: 2 }},
        { varname: "x", value: { value: "foo" }}
      ]
    },
  ];
  expect(getOriginalFrames(
  { line: 0, column: 0 },
  { sourceIndex: 0, line: 1, column: 2 },
  generatedRanges,
  originalScopes,
  debuggerScopes
)).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 2,
      "line": 1,
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
              "unavailable": true,
            },
            "varname": "log",
          },
          {
            "value": {
              "value": "foo",
            },
            "varname": "x",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": "foo",
            },
            "varname": "msg",
          },
        ],
      },
    ],
  },
  {
    "location": {
      "column": 1,
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
              "unavailable": true,
            },
            "varname": "log",
          },
          {
            "value": {
              "value": "foo",
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

test("original frames at line 2", () => {
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
        { varname: "log", value: { objectId: 2 }},
        { varname: "x", value: { value: "bar" }}
      ]
    },
  ];
  expect(getOriginalFrames(
    { line: 1, column: 0 },
    { sourceIndex: 0, line: 1, column: 2 },
    generatedRanges,
    originalScopes,
    debuggerScopes
  )).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 2,
      "line": 1,
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
              "unavailable": true,
            },
            "varname": "log",
          },
          {
            "value": {
              "value": "bar",
            },
            "varname": "x",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": "bar",
            },
            "varname": "msg",
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
              "unavailable": true,
            },
            "varname": "log",
          },
          {
            "value": {
              "value": "bar",
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
