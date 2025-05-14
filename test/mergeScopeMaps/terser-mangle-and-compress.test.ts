import { minify } from "terser";
import { decode, SourceMapJson } from "@chrome-devtools/source-map-scopes-codec";
import { mergeScopeMaps } from "../../src/mergeScopeMaps";

const originalSource = `
function f1(x) {
  function f2(y) {
    console.log("Hello " + y);
  }
  f2("dear " + x);
}
f1("world");
`;

test("terser mangle and compress", async () => {
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

  expect(intermediateSource).toBe("function f1(o){function l(o){console.log(\"Hello \"+o)}l(\"dear \"+o)}f1(\"world\");");
  decodeScopes(sourceMap1 as any);

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

  expect(generatedSource).toBe("(function(o){console.log(\"Hello \"+o)})(\"dear \"+\"world\");");
  decodeScopes(sourceMap2 as any);

  const { generatedRanges: mergedGeneratedRanges, originalScopes } = mergeScopeMaps([sourceMap1 as any], sourceMap2 as any);

  expect(mergedGeneratedRanges.start).toStrictEqual({ line: 0, column: 0 });
  expect(mergedGeneratedRanges.end).toStrictEqual({ line: 0, column: 56 });
  expect(mergedGeneratedRanges.originalScope).toBe(originalScopes[0]);
  // expect(mergedGeneratedRanges.values).toStrictEqual([null]);
  expect(mergedGeneratedRanges.callSite).toBe(undefined);
  expect(mergedGeneratedRanges.children!.length).toBe(1);

  const childRange = mergedGeneratedRanges.children![0];
  expect(childRange.start).toStrictEqual({ line: 0, column: 0 });
  expect(childRange.end).toStrictEqual({ line: 0, column: 55 });
  expect(childRange.originalScope).toBe(originalScopes[0].children![0]);
  expect(childRange.originalScope!.variables[0]).toBe("x");
  expect(childRange.values[0]).toBe('"world"');
  expect(childRange.originalScope!.variables[1]).toBe("f2");
  // expect(childRange!.values[1]).toBe(null);
  expect(childRange.callSite).toStrictEqual({ sourceIndex: 0, line: 7, column: 0 });
  expect(childRange.children!.length).toBe(1);

  const grandchildRange = childRange.children![0];
  expect(grandchildRange.start).toStrictEqual({ line: 0, column: 1 });
  expect(grandchildRange.end).toStrictEqual({ line: 0, column: 37 });
  expect(grandchildRange.originalScope).toBe(originalScopes[0].children![0].children![0]);
  expect(grandchildRange.callSite).toBe(undefined);
  expect(grandchildRange.originalScope?.variables[0]).toBe("y");
  expect(grandchildRange.values[0]).toBe("o");
});

function decodeScopes(sourcemap: SourceMapJson) {
  const { scopes: originalScopes, ranges: generatedRanges } = decode(sourcemap);
  (sourcemap as any).originalScopes = originalScopes;
  (sourcemap as any).generatedRanges = generatedRanges[0];
}
