import { minify } from "terser";
import { mergeScopeMaps } from "../../src/mergeScopeMaps";
import { GeneratedDebuggerScope, OriginalScope } from "../../src/types";
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
      compress: true,
      mangle: true,
      sourceMap: {
        scopes: true,
        asObject: true,
      }
    }
  );

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
      },
    }
  );

  return { intermediateSource, generatedSource, ...mergeScopeMaps([sourceMap1 as any], sourceMap2 as any) };
}

test("generated sources and merged scope map", async () => {
  const { intermediateSource, generatedSource, generatedRanges, originalScopes } = await transpile();

  expect(intermediateSource).toBe('function f1(o){var l;l="dear "+o,console.log("Hello "+l)}f1("world");');

  expect(generatedSource).toBe('var l;l="dear "+"world",console.log("Hello "+l);');

  expect(generatedRanges[0].start).toStrictEqual({ line: 0, column: 0 });
  expect(generatedRanges[0].end).toStrictEqual({ line: 0, column: 48 });
  expect(generatedRanges[0].originalScope!.start).toStrictEqual(originalScopes[0]!.start);
  expect(generatedRanges[0].originalScope!.end).toStrictEqual(originalScopes[0]!.end);
  // expect(mergedGeneratedRanges.values).toStrictEqual([null]);
  expect(generatedRanges[0].callSite).toBe(undefined);
  expect(generatedRanges[0].children!.length).toBe(1);

  const childRange = generatedRanges[0].children![0];
  expect(childRange.start).toStrictEqual({ line: 0, column: 5 });
  expect(childRange.end).toStrictEqual({ line: 0, column: 47 });
  expect(childRange.originalScope!.start).toStrictEqual(originalScopes[0]!.children![0].start);
  expect(childRange.originalScope!.end).toStrictEqual(originalScopes[0]!.children![0].end);
  expect(childRange.originalScope!.variables[0]).toBe("x");
  expect(childRange.values[0]).toBe('"world"');
  expect(childRange.originalScope!.variables[1]).toBe("f2");
  // expect(childRange!.values[1]).toBe(null);
  expect(childRange.callSite).toStrictEqual({ sourceIndex: 0, line: 7, column: 0 });
  expect(childRange.children.length).toBe(2);

  const grandchildRange = childRange.children[0];
  expect(grandchildRange.start).toStrictEqual({ line: 0, column: 6 });
  expect(grandchildRange.end).toStrictEqual({ line: 0, column: 8 });
  expect(grandchildRange.originalScope!.start).toStrictEqual(originalScopes[0]!.children![0].children![0].start);
  expect(grandchildRange.originalScope!.end).toStrictEqual(originalScopes[0]!.children![0].children![0].end);
  expect(grandchildRange.callSite).toStrictEqual({ sourceIndex: 0, line: 5, column: 2 });
  expect(grandchildRange.originalScope?.variables[0]).toBe("y");
  expect(grandchildRange.values[0]).toBe("l");

  const otherGrandchildRange = childRange.children[1];
  expect(otherGrandchildRange.start).toStrictEqual({ line: 0, column: 24 });
  expect(otherGrandchildRange.end).toStrictEqual({ line: 0, column: 45 });
  expect(otherGrandchildRange.originalScope).toBe(grandchildRange.originalScope);
  expect(otherGrandchildRange.callSite).toStrictEqual(grandchildRange.callSite);
  expect(otherGrandchildRange.values).toStrictEqual(grandchildRange.values);
});

test("original frames at column 42", async () => {
  const { generatedRanges, originalScopes } = await transpile();
  const debuggerScopes: GeneratedDebuggerScope[] = [
    {
      // The global scope, we only show one example binding
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "document", value: { objectId: 1 }}
      ]
    },
    {
      // The module scope
      start: generatedRanges[0].start,
      end: generatedRanges[0].end,
      bindings: [
        { varname: "l", value: { value: "dear world" }}
      ]
    },
  ];
  expect(getOriginalFrames(
    { line: 0, column: 41 },
    { sourceIndex: 0, line: 3, column: 12 },
    generatedRanges,
    originalScopes as OriginalScope[],
    debuggerScopes
  )).toMatchInlineSnapshot(`
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
      "column": 2,
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
