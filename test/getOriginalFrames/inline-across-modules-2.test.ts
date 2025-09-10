import { getOriginalFrames } from "../../src/getOriginalFrames";
import { OriginalScope, GeneratedRange, GeneratedDebuggerScope } from "../../src/types";
import { createSourceMapWithScopes, decodeScopes, encodeScopes } from "../../src/util";

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

const scopeNames = ["module", "MODULE_CONSTANT", "Logger", "log", "function", "x", "inner", "outer", "\"module_constant\"", "42", "null"];
const encodedScopes = "BCAAA,DCC,BHDQGI,DG,CCD,CBB,BCAAJ,DHIC,BHCSGI,DF,CCB,BHCSCA,DA,CCB,CDM,ECAE,GAAA,ECAF,GJA,ECAI,GK,IBKA,ECAD,GK,IBHC,ECAF,GK,IBDC,FQ,FA,FA,FA,ECAD,GJA,ECAI,GL,IBLA,ECAD,GL,IBHC,ECAF,GL,IBDC,FS,FA,FA,FA,FA";
const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 6, column: 1 },
    kind: "module",
    isStackFrame: false,
    variables: ["MODULE_CONSTANT", "Logger"],
    children: [
      {
        start: { line: 3, column: 16 },
        end: { line: 5, column: 3 },
        kind: "function",
        isStackFrame: true,
        name: "log",
        variables: ["x"],
        children: [],
      }
    ]
  },
  {
    start: { line: 0, column: 0 },
    end: { line: 11, column: 12 },
    kind: "module",
    isStackFrame: false,
    variables: ["Logger", "inner", "outer"],
    children: [
      {
        start: { line: 2, column: 18 },
        end: { line: 4, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "inner",
        variables: ["x"],
        children: [],
      },
      {
        start: { line: 6, column: 18 },
        end: { line: 8, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "outer",
        variables: ["x"],
        children: [],
      }
    ]
  }
];

const generatedRanges: GeneratedRange[] = [{
  start: { line: 0, column: 0 },
  end: { line: 0, column: 34 },
  isStackFrame: false,
  isHidden: false,
  originalScope: originalScopes[1],
  values: [null, null, null],
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 0, column: 16 },
      isStackFrame: false,
      isHidden: false,
      originalScope: originalScopes[0],
      values: ["\"module_constant\"", null],
      children: [
        {
          start: { line: 0, column: 0 },
          end: { line: 0, column: 16 },
          isStackFrame: false,
          isHidden: false,
          originalScope: originalScopes[1].children![1],
          values: ["42"],
          callSite: { sourceIndex: 1, line: 10, column: 0 },
          children: [
            {
              start: { line: 0, column: 0 },
              end: { line: 0, column: 16 },
              isStackFrame: false,
              isHidden: false,
              originalScope: originalScopes[1].children![0],
              values: ["42"],
              callSite: { sourceIndex: 1, line: 7, column: 2 },
              children: [
                {
                  start: { line: 0, column: 0 },
                  end: { line: 0, column: 16 },
                  isStackFrame: false,
                  isHidden: false,
                  originalScope: originalScopes[0].children![0],
                  values: ["42"],
                  callSite: { sourceIndex: 1, line: 3, column: 2 },
                  children: [],
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
      isStackFrame: false,
      isHidden: false,
      originalScope: originalScopes[0],
      values: ["\"module_constant\"", null],
      children: [
        {
          start: { line: 0, column: 16 },
          end: { line: 0, column: 34 },
          isStackFrame: false,
          isHidden: false,
          originalScope: originalScopes[1].children![1],
          values: ["null"],
          callSite: { sourceIndex: 1, line: 11, column: 0 },
          children: [
            {
              start: { line: 0, column: 16 },
              end: { line: 0, column: 34 },
              isStackFrame: false,
              isHidden: false,
              originalScope: originalScopes[1].children![0],
              values: ["null"],
              callSite: { sourceIndex: 1, line: 7, column: 2 },
              children: [
                {
                  start: { line: 0, column: 16 },
                  end: { line: 0, column: 34 },
                  isStackFrame: false,
                  isHidden: false,
                  originalScope: originalScopes[0].children![0],
                  values: ["null"],
                  callSite: { sourceIndex: 1, line: 3, column: 2 },
                  children: [],
                }
              ],
            }
          ],
        }
      ],
    }
  ]
}];

const sourceMap = createSourceMapWithScopes(
  [{
    original: { sourceIndex: 0, line: 4, column: 4 },
    generated: { line: 0, column: 0 },
  }, {
    original: { sourceIndex: 0, line: 4, column: 4 },
    generated: { line: 0, column: 17 },
  }],
  encodedScopes,
  scopeNames
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

test("original frames at column 1", () => {
  const debuggerScopes: GeneratedDebuggerScope[] = [
    {
      // The module scope
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
      ]
    },
    {
      // The global scope, we only show one example binding
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "document", value: { objectId: 1 }}
      ]
    },
  ];
  expect(getOriginalFrames(sourceMap, [{
  location: { line: 0, column: 0 },
  scopes: debuggerScopes
}])).
toMatchInlineSnapshot(`
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
              "objectId": 1,
            },
            "varname": "document",
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
              "objectId": 1,
            },
            "varname": "document",
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
              "objectId": 1,
            },
            "varname": "document",
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
              "objectId": 1,
            },
            "varname": "document",
          },
        ],
      },
    ],
  },
]
`);
});

test("original frames at column 18", () => {
  const debuggerScopes: GeneratedDebuggerScope[] = [
    {
      // The module scope
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
      ]
    },
    {
      // The global scope, we only show one example binding
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "document", value: { objectId: 1 }}
      ]
    },
  ];
  expect(getOriginalFrames(sourceMap, [{
  location: { line: 0, column: 17 },
  scopes: debuggerScopes
}])).
toMatchInlineSnapshot(`
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
              "value": null,
            },
            "varname": "x",
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
              "objectId": 1,
            },
            "varname": "document",
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
              "value": null,
            },
            "varname": "x",
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
              "objectId": 1,
            },
            "varname": "document",
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
              "value": null,
            },
            "varname": "x",
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
              "objectId": 1,
            },
            "varname": "document",
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
              "objectId": 1,
            },
            "varname": "document",
          },
        ],
      },
    ],
  },
]
`);
});
