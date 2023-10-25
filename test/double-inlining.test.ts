import { decodeScopes } from "../src/decodeScopes";
import { encodeScopes } from "../src/encodeScopes";
import { getOriginalFrames } from "../src/getOriginalFrames";
import { DebuggerScope, ScopeType, SourcemapScope } from "../src/types";

/**
Original source:
```javascript
1 function f(x) {
2   console.log("Lorem " + x);
3 }
4 function g(x) {
5   f("ipsum");
6   console.log("dolor sit " + x);
7 }
8 g("amet");
9 console.log("consectetur adipiscing elit");
```

Generated source:
```javascript
1 console.log("Lorem ipsum");
2 console.log("dolor sit amet");
3 console.log("consectetur adipiscing elit");
```
*/

const scopeNames = ["f", "g", "x", '"amet"', '"ipsum"'];
const scopes = "mBCCG4CADCD,cCCCE+BEG,cACCC4BEI";
const decodedScopes: SourcemapScope[] = [
  {
    type: ScopeType.OTHER,
    name: null,
    start: { line: 1, column: 1 },
    end: { line: 3, column: 44 },
    isInOriginalSource: true,
    isInGeneratedSource: true,
    isOutermostInlinedScope: false,
    bindings: [
      { varname: "f", expression: null },
      { varname: "g", expression: null },
    ]
  },
  {
    type: ScopeType.NAMED_FUNCTION,
    name: "g",
    start: { line: 1, column: 1 },
    end: { line: 2, column: 31 },
    isInOriginalSource: true,
    isInGeneratedSource: false,
    isOutermostInlinedScope: true,
    bindings: [
      { varname: "x", expression: '"amet"' }
    ]
  },
  {
    type: ScopeType.NAMED_FUNCTION,
    name: "f",
    start: { line: 1, column: 1 },
    end: { line: 1, column: 28 },
    isInOriginalSource: true,
    isInGeneratedSource: false,
    isOutermostInlinedScope: true,
    bindings: [
      { varname: "x", expression: '"ipsum"' }
    ]
  },
];

test("decode scopes from sourcemap", () => {
  expect(decodeScopes(scopes, scopeNames)).toStrictEqual(decodedScopes);
});

test("encode scopes to sourcemap", () => {
  const { scopes: encodedScopes, names } = encodeScopes(decodedScopes);
  expect(encodedScopes).toBe(scopes);
  expect(names).toStrictEqual(scopeNames);
});

test("original scopes at line 1", () => {
  const debuggerScopes: DebuggerScope[] = [
    {
      // The global scope, we only show one example binding
      bindings: [
        { varname: "document", value: { objectId: 1 }}
      ]
    },
    {
      // The module scope
      bindings: []
    },
  ];
  expect(getOriginalFrames({ line: 1, column: 1 }, decodedScopes, debuggerScopes)).toMatchInlineSnapshot(`
[
  {
    "name": "f",
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
              "value": "ipsum",
            },
            "varname": "x",
          },
        ],
      },
    ],
  },
  {
    "name": "g",
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
              "value": "amet",
            },
            "varname": "x",
          },
        ],
      },
    ],
  },
  {
    "name": null,
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
            "varname": "f",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "g",
          },
        ],
      },
    ],
  },
]
`);
});

test("original scopes at line 2", () => {
  const debuggerScopes: DebuggerScope[] = [
    {
      // The global scope, we only show one example binding
      bindings: [
        { varname: "document", value: { objectId: 1 }}
      ]
    },
    {
      // The module scope
      bindings: []
    },
  ];
  expect(getOriginalFrames({ line: 2, column: 1 }, decodedScopes, debuggerScopes)).toMatchInlineSnapshot(`
[
  {
    "name": "g",
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
              "value": "amet",
            },
            "varname": "x",
          },
        ],
      },
    ],
  },
  {
    "name": null,
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
            "varname": "f",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "g",
          },
        ],
      },
    ],
  },
]
`);
});
