import { decodeGeneratedScopes, decodeOriginalScopes } from "../src/decodeScopes";
import { encodeGeneratedScopes, encodeOriginalScopes } from "../src/encodeScopes";
import { getOriginalFrames } from "../src/getOriginalFrames";
import { DebuggerScope, GeneratedScope, OriginalScope } from "../src/types";

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
const encodedGeneratedScopes = ",ACCAADFGCAI,AKGACAICG,mB;AKGAAAEAI,mB,A";

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

const generatedScopes: GeneratedScope = {
  start: { line: 0, column: 0 },
  end: { line: 1, column: 19 },
  kind: "module",
  original: {
    scope: originalScopes[0],
    values: [
      [undefined],
      ["\"foo\"", [{ line: 1, column: 0 }, "\"bar\""]]
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
        values: [["\"foo\""]],
      },
    },
    {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 19 },
      kind: "reference",
      original: {
        callsite: { sourceIndex: 0, line: 6, column: 0 },
        scope: originalScopes[0].children![0],
        values: [["\"bar\""]],
      },
    }
  ]
}

test("decode scopes from sourcemap", () => {
  expect(decodeOriginalScopes(encodedOriginalScopes, scopeNames)).toStrictEqual(originalScopes);
  expect(decodeGeneratedScopes(encodedGeneratedScopes, scopeNames, originalScopes)).toStrictEqual(generatedScopes);
});

test("encode scopes to sourcemap", () => {
  const names: string[] = [];
  const encodedOriginal = originalScopes.map(scope => encodeOriginalScopes(scope, names));
  const encodedGenerated = encodeGeneratedScopes(generatedScopes, originalScopes, names);
  expect(encodedOriginal).toStrictEqual(encodedOriginalScopes);
  expect(encodedGenerated).toStrictEqual(encodedGeneratedScopes);
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
  generatedScopes,
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
    generatedScopes,
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
