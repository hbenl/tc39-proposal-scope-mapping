import { decodeGeneratedScopes, decodeOriginalScopes } from "../src/decodeScopes";
import { encodeGeneratedScopes, encodeOriginalScopes } from "../src/encodeScopes";
import { getOriginalFrames } from "../src/getOriginalFrames";
import { DebuggerScope, GeneratedScope, OriginalScope } from "../src/types";

/**
Taken from https://github.com/tc39/source-map-rfc/issues/37#issuecomment-1777452640

Original sources:
- one.js:
```javascript
1 import { f } from "./two";
2 let num = 42;
3 f(num);
4 console.log(num++);
```

- two.js:
```javascript
1 let increment = 1;
2 export function f(x) {
3   console.log(x + increment++);
4 }
```

- Generated source:
```javascript
1 let l = 1;
2 let o = 42;
3 var e;
4 (e = o),
5 console.log(e + l++),
6 console.log(o++);
```
*/

const scopeNames = ["f", "num", "increment", "x", "o", "l", "e"];
const encodedOriginalScopes = ["CCCAAC,GoB", "CCCAEA,CCECAG,EE,AE"];
const encodedGeneratedScopes = ";CCCAADI,AKCCAKD;;CKGACAGCM;;sB;kB,A";
const originalScopes: OriginalScope[] = [
  {
    start: { sourceIndex: 0, line: 1, column: 1 },
    end: { sourceIndex: 0, line: 4, column: 20 },
    kind: "module",
    variables: ["f", "num"],
  },
  {
    start: { sourceIndex: 1, line: 1, column: 1 },
    end: { sourceIndex: 1, line: 4, column: 2 },
    kind: "module",
    variables: ["increment", "f"],
    children: [
      {
        start: { sourceIndex: 1, line: 2, column: 1 },
        end: { sourceIndex: 1, line: 4, column: 2 },
        kind: "function",
        name: "f",
        variables: ["x"],
      }
    ]
  }
];

const generatedScopes: GeneratedScope = {
  start: { line: 1, column: 1 },
  end: { line: 6, column: 18 },
  kind: "module",
  original: {
    scope: originalScopes[0],
    values: [[undefined], ["o"]],
  },
  children: [
    {
      start: { line: 1, column: 1 },
      end: { line: 6, column: 18 },
      kind: "reference",
      original: {
        scope: originalScopes[1],
        values: [["l"], [undefined]],
      },
      children: [
        {
          start: { line: 3, column: 1 },
          end: { line: 5, column: 22 },
          kind: "reference",
          original: {
            callsite: { sourceIndex: 0, line: 3, column: 1 },
            scope: originalScopes[1].children![0],
            values: [["e"]],
          },
        }
      ]
    }
  ]
};

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

test("original frames at line 5", () => {
  const debuggerScopes: DebuggerScope[] = [
    {
      // The global scope, we only show the binding introduced by our code
      bindings: [
        { varname: "e", value: { value: 42 }}
      ]
    },
    {
      // The module scope
      bindings: [
        { varname: "l", value: { value: 2 }},
        { varname: "o", value: { value: 42 }}
      ]
    },
  ];
  expect(getOriginalFrames(
    { line: 5, column: 1 },
    { sourceIndex: 1, line: 3, column: 3 },
    generatedScopes,
    originalScopes,
    debuggerScopes
  )).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 3,
      "line": 3,
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
            "varname": "e",
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
            "varname": "x",
          },
        ],
      },
    ],
  },
  {
    "location": {
      "column": 1,
      "line": 3,
      "sourceIndex": 0,
    },
    "name": undefined,
    "scopes": [
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
    ],
  },
]
`);
});
