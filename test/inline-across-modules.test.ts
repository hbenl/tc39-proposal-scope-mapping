import { decodeGeneratedScopes, decodeOriginalScopes } from "../src/decodeScopes";
import { encodeGeneratedScopes, encodeOriginalScopes } from "../src/encodeScopes";
import { getOriginalFrames } from "../src/getOriginalFrames";
import { DebuggerScope, GeneratedScope, OriginalScope } from "../src/types";

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

const scopeNames = ["f", "num", "increment", "x", "o", "l", "e"];
const encodedOriginalScopes = ["AACAAC,GmB", "AACAEA,CqBECAG,EC,AC"];
const encodedGeneratedScopes = ",ACCAADI,AKCCAKD;;AKGACAEAM;;qB;iB,A";
const originalScopes: OriginalScope[] = [
  {
    start: { sourceIndex: 0, line: 0, column: 0 },
    end: { sourceIndex: 0, line: 3, column: 19 },
    kind: "module",
    variables: ["f", "num"],
  },
  {
    start: { sourceIndex: 1, line: 0, column: 0 },
    end: { sourceIndex: 1, line: 3, column: 1 },
    kind: "module",
    variables: ["increment", "f"],
    children: [
      {
        start: { sourceIndex: 1, line: 1, column: 21 },
        end: { sourceIndex: 1, line: 3, column: 1 },
        kind: "function",
        name: "f",
        variables: ["x"],
      }
    ]
  }
];

const generatedScopes: GeneratedScope = {
  start: { line: 0, column: 0 },
  end: { line: 5, column: 17 },
  kind: "module",
  original: {
    scope: originalScopes[0],
    values: [[undefined], ["o"]],
  },
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 5, column: 17 },
      kind: "reference",
      original: {
        scope: originalScopes[1],
        values: [["l"], [undefined]],
      },
      children: [
        {
          start: { line: 2, column: 0 },
          end: { line: 4, column: 21 },
          kind: "reference",
          original: {
            callsite: { sourceIndex: 0, line: 2, column: 0 },
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
    { line: 4, column: 0 },
    { sourceIndex: 1, line: 2, column: 2 },
    generatedScopes,
    originalScopes,
    debuggerScopes
  )).toMatchInlineSnapshot(`
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
