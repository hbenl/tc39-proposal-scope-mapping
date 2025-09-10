import { getOriginalFrames } from "../../src/getOriginalFrames";
import { OriginalScope, GeneratedRange, GeneratedDebuggerScope } from "../../src/types";
import { createSourceMapWithScopes, decodeScopes, encodeScopes } from "../../src/util";

/**
Taken from https://github.com/tc39/source-map-rfc/issues/37#issuecomment-1777452640

Original sources:
- one.js:
```javascript
0 import { f } from "./two";
1 let num = 42;
2 f(num);
3 console.log(num++);
```

- two.js:
```javascript
0 let increment = 1;
1 export function f(x) {
2   console.log(x + increment++);
3 }
```

- Generated source:
```javascript
0 let l = 1;
1 let o = 42;
2 var e;
3 (e = o),
4 console.log(e + l++),
5 console.log(o++);
```
*/

const scopeNames = ["module", "f", "num", "increment", "function", "x", "o", "l", "e"];
const encodedScopes = "BCAAA,DCC,CDT,BCAAA,DCF,BHBVCI,DI,CCB,CAA,ECAA,GAH,ECAC,GIA,EDCAC,GJ,IACA,FCV,FBR,FA";
const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 3, column: 19 },
    kind: "module",
    isStackFrame: false,
    variables: ["f", "num"],
    children: [],
  },
  {
    start: { line: 0, column: 0 },
    end: { line: 3, column: 1 },
    kind: "module",
    isStackFrame: false,
    variables: ["increment", "f"],
    children: [
      {
        start: { line: 1, column: 21 },
        end: { line: 3, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "f",
        variables: ["x"],
        children: [],
      }
    ]
  }
];

const generatedRanges: GeneratedRange[] = [{
  start: { line: 0, column: 0 },
  end: { line: 5, column: 17 },
  isStackFrame: false,
  isHidden: false,
  originalScope: originalScopes[0],
  values: [null, "o"],
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 5, column: 17 },
      isStackFrame: false,
      isHidden: false,
      originalScope: originalScopes[1],
      values: ["l", null],
      children: [
        {
          start: { line: 2, column: 0 },
          end: { line: 4, column: 21 },
          isStackFrame: false,
          isHidden: false,
          originalScope: originalScopes[1].children![0],
          callSite: { sourceIndex: 0, line: 2, column: 0 },
          values: ["e"],
          children: [],
        }
      ]
    }
  ]
}];

const sourceMap = createSourceMapWithScopes(
  [{
    original: { sourceIndex: 1, line: 2, column: 2 },
    generated: { line: 4, column: 0 },
  }],
  encodedScopes,
  scopeNames,
  ["one.js", "two.js"],
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

test("original frames at line 5", () => {
  const debuggerScopes: GeneratedDebuggerScope[] = [
    {
      // The module scope
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "l", value: { value: 2 }},
        { varname: "o", value: { value: 42 }}
      ]
    },
    {
      // The global scope, we only show the binding introduced by our code
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "e", value: { value: 42 }}
      ]
    },
  ];
  expect(getOriginalFrames(sourceMap, [{
  location: { line: 4, column: 0 },
  scopes: debuggerScopes
}])).
toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 2,
      "line": 2,
      "sourceIndex": 1,
    },
    "name": "f",
    "scopes": [
      {
        "bindings": [
          {
            "value": {
              "value": 42,
            },
            "varname": "x",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": 2,
            },
            "varname": "increment",
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
              "value": 42,
            },
            "varname": "e",
          },
        ],
      },
    ],
  },
  {
    "location": {
      "column": 0,
      "line": 2,
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
              "value": 42,
            },
            "varname": "num",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": 42,
            },
            "varname": "e",
          },
        ],
      },
    ],
  },
]
`);
});
