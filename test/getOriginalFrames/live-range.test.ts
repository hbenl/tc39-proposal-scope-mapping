import { getOriginalFrames } from "../../src/getOriginalFrames";
import { OriginalScope, GeneratedRange, GeneratedDebuggerScope } from "../../src/types";
import { decodeScopes, encodeScopes } from "../../src/util";

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

const scopeNames = ["module", "log", "x", "function", "msg", "\"foo\"", "\"bar\""];
const encodedScopes = "BCAAA,DCC,BHASCG,DE,CCB,CEH,ECAA,GDD,ECAC,GK,IAEB,FT,EDBAA,GM,IAGA,FT,FA";
const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 6, column: 7 },
    kind: "module",
    isStackFrame: false,
    variables: ["log", "x"],
    children: [
      {
        start: { line: 0, column: 18 },
        end: { line: 2, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "log",
        variables: ["msg"],
        children: [],
      },
    ],
  },
];

const generatedRanges: GeneratedRange[] = [{
  start: { line: 0, column: 0 },
  end: { line: 1, column: 19 },
  isStackFrame: false,
  isHidden: false,
  originalScope: originalScopes[0],
  values: [
    null,
    [{
      from: { line: 0, column: 0 },
      to: { line: 1, column: 0 },
      value: "\"foo\""
    }, {
      from: { line: 1, column: 0 },
      to: { line: 1, column: 19 },
      value: "\"bar\""
    }]
  ],
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 0, column: 19 },
      isStackFrame: false,
      isHidden: false,
      originalScope: originalScopes[0].children![0],
      callSite: { sourceIndex: 0, line: 4, column: 1 },
      values: ["\"foo\""],
      children: [],
    },
    {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 19 },
      isStackFrame: false,
      isHidden: false,
      originalScope: originalScopes[0].children![0],
      callSite: { sourceIndex: 0, line: 6, column: 0 },
      values: ["\"bar\""],
      children: [],
    },
  ],
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

test("original frames at line 1", () => {
  const debuggerScopes: GeneratedDebuggerScope[] = [
    {
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "document", value: { objectId: 1 } }
      ],
    },
    {
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "log", value: { objectId: 2 } },
        { varname: "x", value: { value: "foo" } },
      ],
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
  const debuggerScopes: GeneratedDebuggerScope[] = [
    {
      // The global scope, we only show one example binding
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "document", value: { objectId: 1 } },
      ],
    },
    {
      // The module scope
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "log", value: { objectId: 2 }},
        { varname: "x", value: { value: "bar" }}
      ],
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
