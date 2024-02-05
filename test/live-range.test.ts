import { decodeGeneratedScopes, decodeOriginalScopes } from "../src/decodeScopes";
import { encodeGeneratedScopes, encodeOriginalScopes } from "../src/encodeScopes";
import { getOriginalFrames } from "../src/getOriginalFrames";
import { DebuggerScope, GeneratedScope, OriginalScope } from "../src/types";

/**
Original source:
```javascript
function log(msg) {
  console.log(msg);
}
let x = "foo";
log(x);
x = "bar";
log(x);
```

Generated source:
```javascript
console.log("foo");
console.log("bar");
```
*/

const scopeNames = ["log", "x", "msg", "\"foo\"", "\"bar\""];
const encodedOriginalScopes = ["CCCAAC,AmBECAE,EE,IQ"];
const encodedGeneratedScopes = ";CCCAADFGCCI,AKGACAKCG,mB;CKGAAAECI,mB,A";

const originalScopes: OriginalScope[] = [
  {
    start: { sourceIndex: 0, line: 1, column: 1 },
    end: { sourceIndex: 0, line: 7, column: 8 },
    kind: "module",
    variables: ["log", "x"],
    children: [
      {
        start: { sourceIndex: 0, line: 1, column: 19 },
        end: { sourceIndex: 0, line: 3, column: 2 },
        kind: "function",
        name: "log",
        variables: ["msg"],
      }
    ]
  }
];

const generatedScopes: GeneratedScope = {
  start: { line: 1, column: 1 },
  end: { line: 2, column: 20 },
  kind: "module",
  original: {
    scope: originalScopes[0],
    values: [
      [undefined],
      ["\"foo\"", [{ line: 2, column: 1 }, "\"bar\""]]
    ],
  },
  children: [
    {
      start: { line: 1, column: 1 },
      end: { line: 1, column: 20 },
      kind: "reference",
      original: {
        callsite: { sourceIndex: 0, line: 5, column: 1 },
        scope: originalScopes[0].children![0],
        values: [["\"foo\""]],
      },
    },
    {
      start: { line: 2, column: 1 },
      end: { line: 2, column: 20 },
      kind: "reference",
      original: {
        callsite: { sourceIndex: 0, line: 7, column: 1 },
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
  { line: 1, column: 1 },
  { sourceIndex: 0, line: 2, column: 3 },
  generatedScopes,
  originalScopes,
  debuggerScopes
)).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 3,
      "line": 2,
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
  { line: 2, column: 1 },
  { sourceIndex: 0, line: 2, column: 3 },
  generatedScopes,
  originalScopes,
  debuggerScopes
)).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 3,
      "line": 2,
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
      "column": 1,
      "line": 7,
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
