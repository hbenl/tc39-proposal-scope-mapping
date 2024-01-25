import { decodeGeneratedScopes, decodeOriginalScopes } from "../src/decodeScopes";
import { encodeGeneratedScopes, encodeOriginalScopes } from "../src/encodeScopes";
import { getOriginalFrames } from "../src/getOriginalFrames";
import { DebuggerScope, GeneratedScope, OriginalScope } from "../src/types";

/**
Taken from https://github.com/tc39/source-map-rfc/issues/61

Original sources:
- module.js:
```javascript
export const MODULE_CONSTANT = 'module_constant';

export class Logger {
  static log(x) {
    console.log(x);
  }
}
```

- inline_across_modules.js:
```javascript
import {Logger} from './module.js';

function inner(x) {
  Logger.log(x);
}

function outer(x) {
  inner(x);
}

outer(42);
outer(null);
```

- Generated source:
```javascript
console.log(42);console.log(null);
```
*/

const scopeNames = ["MODULE_CONSTANT", "Logger", "log", "x", "inner", "outer", "\"module_constant\"", "42", "null"];
const encodedOriginalScopes = ["CCCAAC,GiBECEG,EI,CE", "CCCACIK,EmBECIG,EE,EmBECKG,EE,Ga"];
const encodedGeneratedScopes = ";CCCCADDD,AKCDAMD,AKGCECWCO,AKGADAHGO,AKGDCAJGO,gB,A,A,A,AKCADMD,AKGCEAQCQ,AKGADAJGQ,AKGDCAJGQ,kB,A,A,A,A";
const originalScopes: OriginalScope[] = [
  {
    start: { sourceIndex: 0, line: 1, column: 1 },
    end: { sourceIndex: 0, line: 7, column: 2 },
    kind: "module",
    variables: ["MODULE_CONSTANT", "Logger"],
    children: [
      {
        start: { sourceIndex: 0, line: 4, column: 17 },
        end: { sourceIndex: 0, line: 6, column: 4 },
        kind: "function",
        name: "log",
        variables: ["x"],
      }
    ]
  },
  {
    start: { sourceIndex: 1, line: 1, column: 1 },
    end: { sourceIndex: 1, line: 12, column: 13 },
    kind: "module",
    variables: ["Logger", "inner", "outer"],
    children: [
      {
        start: { sourceIndex: 1, line: 3, column: 19 },
        end: { sourceIndex: 1, line: 5, column: 2 },
        kind: "function",
        name: "inner",
        variables: ["x"],
      },
      {
        start: { sourceIndex: 1, line: 7, column: 19 },
        end: { sourceIndex: 1, line: 9, column: 2 },
        kind: "function",
        name: "outer",
        variables: ["x"],
      }
    ]
  }
];

const generatedScopes: GeneratedScope = {
  start: { line: 1, column: 1 },
  end: { line: 1, column: 35 },
  kind: "module",
  original: {
    scope: originalScopes[1],
    values: [undefined, undefined, undefined],
  },
  children: [
    {
      start: { line: 1, column: 1 },
      end: { line: 1, column: 17 },
      kind: "reference",
      original: {
        scope: originalScopes[0],
        values: ["\"module_constant\"", undefined],
      },
      children: [
        {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 17 },
          kind: "reference",
          original: {
            scope: originalScopes[1].children![1],
            values: ["42"],
            callsite: { sourceIndex: 1, line: 11, column: 1 },
          },
          children: [
            {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 17 },
              kind: "reference",
              original: {
                scope: originalScopes[1].children![0],
                values: ["42"],
                callsite: { sourceIndex: 1, line: 8, column: 3 },
              },
              children: [
                {
                  start: { line: 1, column: 1 },
                  end: { line: 1, column: 17 },
                  kind: "reference",
                  original: {
                    scope: originalScopes[0].children![0],
                    values: ["42"],
                    callsite: { sourceIndex: 1, line: 4, column: 3 },
                  },
                }
              ],
            }
          ],
        }
      ],
    },
    {
      start: { line: 1, column: 17 },
      end: { line: 1, column: 35 },
      kind: "reference",
      original: {
        scope: originalScopes[0],
        values: ["\"module_constant\"", undefined],
      },
      children: [
        {
          start: { line: 1, column: 17 },
          end: { line: 1, column: 35 },
          kind: "reference",
          original: {
            scope: originalScopes[1].children![1],
            values: ["null"],
            callsite: { sourceIndex: 1, line: 12, column: 1 },
          },
          children: [
            {
              start: { line: 1, column: 17 },
              end: { line: 1, column: 35 },
              kind: "reference",
              original: {
                scope: originalScopes[1].children![0],
                values: ["null"],
                callsite: { sourceIndex: 1, line: 8, column: 3 },
              },
              children: [
                {
                  start: { line: 1, column: 17 },
                  end: { line: 1, column: 35 },
                  kind: "reference",
                  original: {
                    scope: originalScopes[0].children![0],
                    values: ["null"],
                    callsite: { sourceIndex: 1, line: 4, column: 3 },
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
  { line: 1, column: 1 },
  { sourceIndex: 0, line: 5, column: 5 },
  generatedScopes,
  originalScopes,
  debuggerScopes
)).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 5,
      "line": 5,
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
      "column": 3,
      "line": 4,
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
      "column": 3,
      "line": 8,
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
      "column": 1,
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
  { line: 1, column: 18 },
  { sourceIndex: 0, line: 5, column: 5 },
  generatedScopes,
  originalScopes,
  debuggerScopes
)).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 5,
      "line": 5,
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
      "column": 3,
      "line": 4,
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
      "column": 3,
      "line": 8,
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
      "column": 1,
      "line": 12,
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
