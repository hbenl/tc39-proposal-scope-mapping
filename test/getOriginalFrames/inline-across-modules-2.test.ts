import { decodeGeneratedRanges, decodeOriginalScopes } from "../../src/decodeScopes";
import { encodeGeneratedRanges, encodeOriginalScopes } from "../../src/encodeScopes";
import { getOriginalFrames } from "../../src/getOriginalFrames";
import { DebuggerScope, GeneratedRange, OriginalScope } from "../../src/types";

/**
Taken from https://github.com/tc39/source-map-rfc/issues/61

Original sources:
- module.js:
```javascript
0 export const MODULE_CONSTANT = 'module_constant';
1
2 export class Logger {
3   static log(x) {
4     console.log(x);
5   }
6 }
```

- inline_across_modules.js:
```javascript
0  import {Logger} from './module.js';
1
2  function inner(x) {
3    Logger.log(x);
4  }
5
6  function outer(x) {
7    inner(x);
8  }
9
10 outer(42);
11 outer(null);
```

- Generated source:
```javascript
0 console.log(42);console.log(null);
```
*/

const scopeNames = ["module", "MODULE_CONSTANT", "Logger", "function", "log", "x", "inner", "outer", "\"module_constant\"", "42", "null"];
const encodedOriginalScopes = ["AAAACE,GgBGCIK,EG,CC", "AAAAEMO,EkBGCMK,EC,EkBGCOK,EC,GY"];
const encodedGeneratedRanges = "AKCADDD,ACDAQD,AGCECUAS,AGADAHES,AGDCAJES,gB,A,A,A,ACADQD,AGCEAQAU,AGADAJEU,AGDCAJEU,kB,A,A,A,A";
const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 6, column: 1 },
    kind: "module",
    variables: ["MODULE_CONSTANT", "Logger"],
    children: [
      {
        start: { line: 3, column: 16 },
        end: { line: 5, column: 3 },
        kind: "function",
        name: "log",
        variables: ["x"],
      }
    ]
  },
  {
    start: { line: 0, column: 0 },
    end: { line: 11, column: 12 },
    kind: "module",
    variables: ["Logger", "inner", "outer"],
    children: [
      {
        start: { line: 2, column: 18 },
        end: { line: 4, column: 1 },
        kind: "function",
        name: "inner",
        variables: ["x"],
      },
      {
        start: { line: 6, column: 18 },
        end: { line: 8, column: 1 },
        kind: "function",
        name: "outer",
        variables: ["x"],
      }
    ]
  }
];

const generatedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 0, column: 34 },
  isScope: true,
  original: {
    scope: originalScopes[1],
    bindings: [undefined, undefined, undefined],
  },
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 0, column: 16 },
      isScope: false,
      original: {
        scope: originalScopes[0],
        bindings: ["\"module_constant\"", undefined],
      },
      children: [
        {
          start: { line: 0, column: 0 },
          end: { line: 0, column: 16 },
          isScope: false,
          original: {
            scope: originalScopes[1].children![1],
            bindings: ["42"],
            callsite: { sourceIndex: 1, line: 10, column: 0 },
          },
          children: [
            {
              start: { line: 0, column: 0 },
              end: { line: 0, column: 16 },
              isScope: false,
              original: {
                scope: originalScopes[1].children![0],
                bindings: ["42"],
                callsite: { sourceIndex: 1, line: 7, column: 2 },
              },
              children: [
                {
                  start: { line: 0, column: 0 },
                  end: { line: 0, column: 16 },
                  isScope: false,
                  original: {
                    scope: originalScopes[0].children![0],
                    bindings: ["42"],
                    callsite: { sourceIndex: 1, line: 3, column: 2 },
                  },
                }
              ],
            }
          ],
        }
      ],
    },
    {
      start: { line: 0, column: 16 },
      end: { line: 0, column: 34 },
      isScope: false,
      original: {
        scope: originalScopes[0],
        bindings: ["\"module_constant\"", undefined],
      },
      children: [
        {
          start: { line: 0, column: 16 },
          end: { line: 0, column: 34 },
          isScope: false,
          original: {
            scope: originalScopes[1].children![1],
            bindings: ["null"],
            callsite: { sourceIndex: 1, line: 11, column: 0 },
          },
          children: [
            {
              start: { line: 0, column: 16 },
              end: { line: 0, column: 34 },
              isScope: false,
              original: {
                scope: originalScopes[1].children![0],
                bindings: ["null"],
                callsite: { sourceIndex: 1, line: 7, column: 2 },
              },
              children: [
                {
                  start: { line: 0, column: 16 },
                  end: { line: 0, column: 34 },
                  isScope: false,
                  original: {
                    scope: originalScopes[0].children![0],
                    bindings: ["null"],
                    callsite: { sourceIndex: 1, line: 3, column: 2 },
                  },
                }
              ],
            }
          ],
        }
      ],
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

test("original frames at column 1", () => {
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
      ]
    },
  ];
  expect(getOriginalFrames(
    { line: 0, column: 0 },
    { sourceIndex: 0, line: 4, column: 4 },
    generatedRanges,
    originalScopes,
    debuggerScopes
  )).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 4,
      "line": 4,
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
              "value": "module_constant",
            },
            "varname": "MODULE_CONSTANT",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "Logger",
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
      "column": 2,
      "line": 3,
      "sourceIndex": 1,
    },
    "name": "inner",
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
            "varname": "Logger",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "inner",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "outer",
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
      "column": 2,
      "line": 7,
      "sourceIndex": 1,
    },
    "name": "outer",
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
            "varname": "Logger",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "inner",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "outer",
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
      "line": 10,
      "sourceIndex": 1,
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
            "varname": "Logger",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "inner",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "outer",
          },
        ],
      },
    ],
  },
]
`);
});

test("original frames at column 18", () => {
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
      ]
    },
  ];
  expect(getOriginalFrames(
    { line: 0, column: 17 },
    { sourceIndex: 0, line: 4, column: 4 },
    generatedRanges,
    originalScopes,
    debuggerScopes
  )).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 4,
      "line": 4,
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
              "value": "module_constant",
            },
            "varname": "MODULE_CONSTANT",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "Logger",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": null,
            },
            "varname": "x",
          },
        ],
      },
    ],
  },
  {
    "location": {
      "column": 2,
      "line": 3,
      "sourceIndex": 1,
    },
    "name": "inner",
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
            "varname": "Logger",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "inner",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "outer",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": null,
            },
            "varname": "x",
          },
        ],
      },
    ],
  },
  {
    "location": {
      "column": 2,
      "line": 7,
      "sourceIndex": 1,
    },
    "name": "outer",
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
            "varname": "Logger",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "inner",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "outer",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": null,
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
      "line": 11,
      "sourceIndex": 1,
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
            "varname": "Logger",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "inner",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "outer",
          },
        ],
      },
    ],
  },
]
`);
});
