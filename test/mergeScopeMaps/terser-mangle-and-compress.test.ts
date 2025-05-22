import { minify } from "terser";
import { mergeScopeMaps } from "../../src/mergeScopeMaps";
import { addDecodedScopes } from "../../src/util";
import { GeneratedDebuggerScope } from "../../src/types";
import { getOriginalFrames } from "../../src/getOriginalFrames";

const originalSource = `
function f1(x) {
  function f2(y) {
    console.log("Hello " + y);
  }
  f2("dear " + x);
}
f1("world");
`;

async function transpile() {
  const { code: intermediateSource, map: sourceMap1 } = await minify(
    originalSource,
    {
      compress: false,
      mangle: true,
      sourceMap: {
        scopes: true,
        asObject: true,
      },
    }
  );

  addDecodedScopes(sourceMap1 as any);

  const { code: generatedSource, map: sourceMap2 } = await minify(
    intermediateSource!,
    {
      compress: {
        toplevel: true,
      },
      mangle: true,
      sourceMap: {
        scopes: true,
        asObject: true,
      }
    }
  );

  addDecodedScopes(sourceMap2 as any);

  return { intermediateSource, generatedSource, ...mergeScopeMaps([sourceMap1 as any], sourceMap2 as any) };
}

test("generated sources and merged scope map", async () => {
  const { intermediateSource, generatedSource, generatedRanges, originalScopes } = await transpile();

  expect(intermediateSource).toBe('function f1(o){function l(o){console.log("Hello "+o)}l("dear "+o)}f1("world");');

  expect(generatedSource).toBe('(function(o){console.log("Hello "+o)})("dear "+"world");');

  expect(generatedRanges.start).toStrictEqual({ line: 0, column: 0 });
  expect(generatedRanges.end).toStrictEqual({ line: 0, column: 56 });
  expect(generatedRanges.originalScope).toBe(originalScopes[0]);
  // expect(generatedRanges.values).toStrictEqual([null]);
  expect(generatedRanges.callSite).toBe(undefined);
  expect(generatedRanges.children.length).toBe(1);

  const childRange = generatedRanges.children[0];
  expect(childRange.start).toStrictEqual({ line: 0, column: 0 });
  expect(childRange.end).toStrictEqual({ line: 0, column: 55 });
  expect(childRange.originalScope).toBe(originalScopes[0].children![0]);
  expect(childRange.originalScope!.variables[0]).toBe("x");
  expect(childRange.values[0]).toBe('"world"');
  expect(childRange.originalScope!.variables[1]).toBe("f2");
  // expect(childRange!.values[1]).toBe(null);
  expect(childRange.callSite).toStrictEqual({ sourceIndex: 0, line: 7, column: 0 });
  expect(childRange.children!.length).toBe(1);

  const grandchildRange = childRange.children[0];
  expect(grandchildRange.start).toStrictEqual({ line: 0, column: 1 });
  expect(grandchildRange.end).toStrictEqual({ line: 0, column: 37 });
  expect(grandchildRange.originalScope).toBe(originalScopes[0].children![0].children![0]);
  expect(grandchildRange.callSite).toBe(undefined);
  expect(grandchildRange.originalScope?.variables[0]).toBe("y");
  expect(grandchildRange.values[0]).toBe("o");
});

test("original frames at columns 22 and 39", async () => {
  const { generatedRanges, originalScopes } = await transpile();

  const globalScope: GeneratedDebuggerScope = {
    // The global scope, we only show one example binding
    start: generatedRanges.start,
    end: generatedRanges.end,
    bindings: [
      { varname: "document", value: { objectId: 1 }}
    ]
  };
  const moduleScope: GeneratedDebuggerScope = {
    // The module scope
    start: generatedRanges.start,
    end: generatedRanges.end,
    bindings: []
  };

  const debuggerScopes1: GeneratedDebuggerScope[] = [
    globalScope,
    moduleScope,
    {
      // The function scope
      start: generatedRanges.children[0].children[0].start,
      end: generatedRanges.children[0].children[0].end,
      bindings: [
        { varname: "o", value: { value: "dear world" }}
      ]
    },
  ];
  const originalFrames1 = getOriginalFrames(
    { line: 0, column: 21 },
    { sourceIndex: 0, line: 3, column: 12 },
    [generatedRanges],
    originalScopes,
    debuggerScopes1
  );

  const debuggerScopes2: GeneratedDebuggerScope[] = [
    globalScope,
    moduleScope,
  ];
  const originalFrames2 = getOriginalFrames(
    { line: 0, column: 38 },
    { sourceIndex: 0, line: 5, column: 4 },
    [generatedRanges],
    originalScopes,
    debuggerScopes2
  );

  expect(originalFrames1.concat(originalFrames2)).toMatchInlineSnapshot(`
[
  {
    "location": {
      "column": 12,
      "line": 3,
      "sourceIndex": 0,
    },
    "name": "f2",
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
            "varname": "f1",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": "world",
            },
            "varname": "x",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "f2",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": "dear world",
            },
            "varname": "y",
          },
        ],
      },
    ],
  },
  {
    "location": {
      "column": 4,
      "line": 5,
      "sourceIndex": 0,
    },
    "name": "f1",
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
            "varname": "f1",
          },
        ],
      },
      {
        "bindings": [
          {
            "value": {
              "value": "world",
            },
            "varname": "x",
          },
          {
            "value": {
              "unavailable": true,
            },
            "varname": "f2",
          },
        ],
      },
    ],
  },
  {
    "location": {
      "column": 0,
      "line": 7,
      "sourceIndex": 0,
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
            "varname": "f1",
          },
        ],
      },
    ],
  },
]
`);
});
