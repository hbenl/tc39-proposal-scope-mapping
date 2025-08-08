import { minify } from "terser";
import remapping, { EncodedSourceMap } from "@ampproject/remapping";
import { mergeScopeMaps } from "../../src/mergeScopeMaps";
import { GeneratedDebuggerScope } from "../../src/types";
import { getOriginalFrames } from "../../src/getOriginalFrames";
import { addParents } from "../../src/util";

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
    { "original.js": originalSource },
    {
      compress: false,
      mangle: true,
      sourceMap: {
        scopes: true,
        asObject: true,
      },
    }
  );

  const { code: generatedSource, map: sourceMap2 } = await minify(
    { "intermediate.js": intermediateSource! },
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

  const { originalScopes, generatedRanges } = mergeScopeMaps([sourceMap1 as any], sourceMap2 as any);
  addParents(originalScopes, generatedRanges);
  return { sourceMap1, sourceMap2, intermediateSource, generatedSource, originalScopes, generatedRanges };
}

test("generated sources and merged scope map", async () => {
  const { intermediateSource, generatedSource, generatedRanges, originalScopes } = await transpile();

  expect(intermediateSource).toBe('function f1(o){function l(o){console.log("Hello "+o)}l("dear "+o)}f1("world");');

  expect(generatedSource).toBe('(function(o){console.log("Hello "+o)})("dear "+"world");');

  expect(generatedRanges[0].start).toStrictEqual({ line: 0, column: 0 });
  expect(generatedRanges[0].end).toStrictEqual({ line: 0, column: 56 });
  expect(generatedRanges[0].originalScope!.start).toStrictEqual(originalScopes[0]!.start);
  expect(generatedRanges[0].originalScope!.end).toStrictEqual(originalScopes[0]!.end);
  // expect(generatedRanges.values).toStrictEqual([null]);
  expect(generatedRanges[0].callSite).toBe(undefined);
  expect(generatedRanges[0].children.length).toBe(1);

  const childRange = generatedRanges[0].children[0];
  expect(childRange.start).toStrictEqual({ line: 0, column: 0 });
  expect(childRange.end).toStrictEqual({ line: 0, column: 55 });
  expect(childRange.originalScope!.start).toStrictEqual(originalScopes[0]!.children![0].start);
  expect(childRange.originalScope!.end).toStrictEqual(originalScopes[0]!.children![0].end);
  expect(childRange.originalScope!.variables[0]).toBe("x");
  expect(childRange.values[0]).toBe('"world"');
  expect(childRange.originalScope!.variables[1]).toBe("f2");
  // expect(childRange!.values[1]).toBe(null);
  expect(childRange.callSite).toStrictEqual({ sourceIndex: 0, line: 7, column: 0 });
  expect(childRange.children!.length).toBe(1);

  const grandchildRange = childRange.children[0];
  expect(grandchildRange.start).toStrictEqual({ line: 0, column: 1 });
  expect(grandchildRange.end).toStrictEqual({ line: 0, column: 37 });
  expect(grandchildRange.originalScope!.start).toStrictEqual(originalScopes[0]!.children![0].children![0].start);
  expect(grandchildRange.originalScope!.end).toStrictEqual(originalScopes[0]!.children![0].children![0].end);
  expect(grandchildRange.callSite).toBe(undefined);
  expect(grandchildRange.originalScope?.variables[0]).toBe("y");
  expect(grandchildRange.values[0]).toBe("o");
});

test("original frames at columns 22 and 39", async () => {
  const { sourceMap1, sourceMap2, generatedRanges, originalScopes } = await transpile();
  const sourceMap = {
    ...remapping(sourceMap2 as EncodedSourceMap, (file) => {
      if (file === "intermediate.js") {
        return sourceMap1 as EncodedSourceMap;
      }
    }) as EncodedSourceMap,
    generatedRanges,
    originalScopes,
  };

  const globalScope: GeneratedDebuggerScope = {
    // The global scope, we only show one example binding
    start: generatedRanges[0].start,
    end: generatedRanges[0].end,
    bindings: [
      { varname: "document", value: { objectId: 1 }}
    ]
  };
  const moduleScope: GeneratedDebuggerScope = {
    // The module scope
    start: generatedRanges[0].start,
    end: generatedRanges[0].end,
    bindings: []
  };

  const debuggerScopes1: GeneratedDebuggerScope[] = [
    {
      // The function scope
      start: generatedRanges[0].children[0].children[0].start,
      end: generatedRanges[0].children[0].children[0].end,
      bindings: [
        { varname: "o", value: { value: "dear world" }}
      ]
    },
    moduleScope,
    globalScope,
  ];
  const originalFrames1 = getOriginalFrames(sourceMap, [{
    location: { line: 0, column: 21 },
    scopes: debuggerScopes1
  }]);

  const debuggerScopes2: GeneratedDebuggerScope[] = [
    moduleScope,
    globalScope,
  ];
  const originalFrames2 = getOriginalFrames(sourceMap, [{
    location: { line: 0, column: 38 },
    scopes: debuggerScopes2
  }]);

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
              "value": "dear world",
            },
            "varname": "y",
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
      "line": 5,
      "sourceIndex": 0,
    },
    "name": "f1",
    "scopes": [
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
      "line": 7,
      "sourceIndex": 0,
    },
    "name": undefined,
    "scopes": [
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
