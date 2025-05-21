import { minify } from "terser";
import { mergeScopeMaps } from "../../src/mergeScopeMaps";
import { addDecodedScopes } from "../../src/util";
import { EncodedSourceMap } from "@jridgewell/trace-mapping";

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

  addDecodedScopes(sourceMap1 as EncodedSourceMap);

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

  addDecodedScopes(sourceMap2 as EncodedSourceMap);

  return { intermediateSource, generatedSource, ...mergeScopeMaps([sourceMap1 as any], sourceMap2 as any) };
}

test("generated sources, scopes and ranges", async () => {
  const { intermediateSource, generatedSource, generatedRanges, originalScopes } = await transpile();

  expect(intermediateSource).toBe('function f1(o){var l;l="dear "+o,console.log("Hello "+l)}f1("world");');

  expect(generatedSource).toBe('var l;l="dear "+"world",console.log("Hello "+l);');

  expect(generatedRanges.start).toStrictEqual({ line: 0, column: 0 });
  expect(generatedRanges.end).toStrictEqual({ line: 0, column: 48 });
  expect(generatedRanges.originalScope).toBe(originalScopes[0]);
  // expect(mergedGeneratedRanges.values).toStrictEqual([null]);
  expect(generatedRanges.callSite).toBe(undefined);
  expect(generatedRanges.children!.length).toBe(1);

  const childRange = generatedRanges.children![0];
  expect(childRange.start).toStrictEqual({ line: 0, column: 5 });
  expect(childRange.end).toStrictEqual({ line: 0, column: 47 });
  expect(childRange.originalScope).toBe(originalScopes[0].children![0]);
  expect(childRange.originalScope!.variables[0]).toBe("x");
  expect(childRange.values[0]).toBe('"world"');
  expect(childRange.originalScope!.variables[1]).toBe("f2");
  // expect(childRange!.values[1]).toBe(null);
  expect(childRange.callSite).toStrictEqual({ sourceIndex: 0, line: 7, column: 0 });
  expect(childRange.children!.length).toBe(1);

  const grandchildRange = childRange.children![0];
  expect(grandchildRange.start).toStrictEqual({ line: 0, column: 6 });
  expect(grandchildRange.end).toStrictEqual({ line: 0, column: 8 });
  expect(grandchildRange.originalScope).toBe(originalScopes[0].children![0].children![0]);
  expect(grandchildRange.callSite).toStrictEqual({ sourceIndex: 0, line: 5, column: 2 });
  expect(grandchildRange.originalScope?.variables[0]).toBe("y");
  expect(grandchildRange.values[0]).toBe("l");
});
