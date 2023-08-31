import { getOriginalScopes } from "../src/getOriginalScopes";
import { DebuggerScope, SourcemapScope } from "../src/types";

const sourcemapScopes: SourcemapScope[] = [
  {
    start: { line: 1, column: 1 },
    end: { line: 7, column: 2 },
    isInOriginalSource: true,
    isInGeneratedSource: true,
    bindings: []
  },
  {
    start: { line: 1, column: 1 },
    end: { line: 7, column: 2 },
    isInOriginalSource: true,
    isInGeneratedSource: true,
    bindings: [
      { varname: "x", expression: "x1" },
    ]
  },
  {
    start: { line: 4, column: 1 },
    end: { line: 5, column: 20 },
    isInOriginalSource: true,
    isInGeneratedSource: false,
    bindings: [
      { varname: "x", expression: "x2" },
    ]
  },
];

test("paused at line 5", () => {
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
    {
      // The block scope
      bindings: [
        { varname: "x1", value: { value: 1 } },
        { varname: "x2", value: { value: 2 } },
      ]
    },
  ];
  expect(getOriginalScopes({ line: 5, column: 1 }, sourcemapScopes, debuggerScopes)).toMatchInlineSnapshot(`
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
    "bindings": [],
  },
  {
    "bindings": [
      {
        "value": {
          "value": 1,
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
        "varname": "x",
      },
    ],
  },
]
`);
});
