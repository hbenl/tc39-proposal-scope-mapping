import { decodeScopes } from "../src/decodeScopes";
import { encodeScopes } from "../src/encodeScopes";
import { getOriginalScopes } from "../src/getOriginalScopes";
import { DebuggerScope, ScopeType, SourcemapScope } from "../src/types";

const scopeNames = ["outer", "f", "inner", "g", "num", "a", "num_plus_one", "b", "value", "value_plus_one"];
const scopes = "WCCUKAC,OACCQEEGIKMO,OEEGKIQKSO";
const decodedScopes: SourcemapScope[] = [
  {
    type: ScopeType.OTHER,
    name: null,
    start: { line: 1, column: 1 },
    end: { line: 10, column: 5 },
    isInOriginalSource: true,
    isInGeneratedSource: true,
    bindings: [
      { varname: "outer", expression: "f" },
    ]
  },
  {
    type: ScopeType.NAMED_FUNCTION,
    name: "outer",
    start: { line: 1, column: 1 },
    end: { line: 8, column: 2 },
    isInOriginalSource: true,
    isInGeneratedSource: true,
    bindings: [
      { varname: "inner", expression: "g" },
      { varname: "num", expression: "a" },
      { varname: "num_plus_one", expression: "b" },
    ]
  },
  {
    type: ScopeType.NAMED_FUNCTION,
    name: "inner",
    start: { line: 2, column: 3 },
    end: { line: 5, column: 4 },
    isInOriginalSource: true,
    isInGeneratedSource: true,
    bindings: [
      { varname: "value", expression: "a" },
      { varname: "value_plus_one", expression: "b" },
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
      // The global scope, we only show one example binding
      bindings: [
        { varname: "document", value: { objectId: 1 }}
      ]
    },
    {
      // The module scope
      bindings: [
        { varname: "f", value: { objectId: 2 } },
      ]
    },
    {
      // The scope of the outer function
      bindings: [
        { varname: "a", value: { value: 1 } },
        { varname: "b", value: { value: 2 } },
        { varname: "g", value: { objectId: 3 } },
      ]
    },
    {
      // The scope of the inner function
      bindings: [
        { varname: "a", value: { value: 2 } },
        { varname: "b", value: { value: 3 } },
      ]
    },
  ];
  expect(getOriginalScopes({ line: 4, column: 1 }, decodedScopes, debuggerScopes)).toMatchInlineSnapshot(`
[
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
          "objectId": 2,
        },
        "varname": "outer",
      },
    ],
  },
  {
    "bindings": [
      {
        "value": {
          "objectId": 3,
        },
        "varname": "inner",
      },
      {
        "value": {
          "value": 1,
        },
        "varname": "num",
      },
      {
        "value": {
          "value": 2,
        },
        "varname": "num_plus_one",
      },
    ],
  },
  {
    "bindings": [
      {
        "value": {
          "value": 2,
        },
        "varname": "value",
      },
      {
        "value": {
          "value": 3,
        },
        "varname": "value_plus_one",
      },
    ],
  },
]
`);
});
