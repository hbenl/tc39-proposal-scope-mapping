import { decodeScopes } from "../src/decodeScopes";
import { encodeScopes } from "../src/encodeScopes";
import { getOriginalScopes } from "../src/getOriginalScopes";
import { DebuggerScope, ScopeType, SourcemapScope } from "../src/types";

// see https://github.com/tc39/source-map-rfc/issues/37#issuecomment-1777452640

const scopeNames = ["increment", "l", "f", "num", "o", "x", "e"];
const scopes = "SCCIgD,UCCCWACED,UECIgDEDGI,UGCI+BADED,MEGCI+BKM";
const decodedScopes: SourcemapScope[] = [
  {
    type: ScopeType.OTHER,
    name: null,
    start: { line: 1, column: 1 },
    end: { line: 4, column: 48 },
    isInOriginalSource: false,
    isInGeneratedSource: true,
    bindings: []
  },
  {
    type: ScopeType.OTHER,
    name: null,
    start: { line: 1, column: 1 },
    end: { line: 1, column: 11 },
    isInOriginalSource: true,
    isInGeneratedSource: false,
    bindings: [
      { varname: "increment", expression: "l" },
      { varname: "f", expression: null },
    ]
  },
  {
    type: ScopeType.OTHER,
    name: null,
    start: { line: 2, column: 1 },
    end: { line: 4, column: 48 },
    isInOriginalSource: true,
    isInGeneratedSource: false,
    bindings: [
      { varname: "f", expression: null },
      { varname: "num", expression: "o" },
    ]
  },
  {
    type: ScopeType.OTHER,
    name: null,
    start: { line: 3, column: 1 },
    end: { line: 4, column: 31 },
    isInOriginalSource: true,
    isInGeneratedSource: false,
    bindings: [
      { varname: "increment", expression: "l" },
      { varname: "f", expression: null },
    ]
  },
  {
    type: ScopeType.NAMED_FUNCTION,
    name: "f",
    start: { line: 3, column: 1 },
    end: { line: 4, column: 31 },
    isInOriginalSource: true,
    isInGeneratedSource: false,
    bindings: [
      { varname: "x", expression: "e" },
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

test("original scopes at line 4", () => {
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
  expect(getOriginalScopes({ line: 4, column: 10 }, decodedScopes, debuggerScopes)).toMatchInlineSnapshot(`
[
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
]
`);
});
