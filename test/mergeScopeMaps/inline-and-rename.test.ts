import { encode } from "@chrome-devtools/source-map-scopes-codec";
import { GeneratedRange, OriginalScope } from "../../src/types";
import { mergeScopeMaps } from "../../src/mergeScopeMaps";

/**
Original source:
```javascript
0 function fun(x) {
1   const y = "Hello ";
2   console.log(y + x);
3 }
4 fun("world");
```

Intermediate source:
```javascript
0 const a = "Hello ";
1 console.log(a + "world");
```

Generated source:
```javascript
0 const b = "Hello ";
1 console.log(b + "world");
```
*/

const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 4, column: 13 },
    kind: "module",
    isStackFrame: false,
    variables: ["fun"],
    children: [
      {
        start: { line: 0, column: 0 },
        end: { line: 3, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "fun",
        variables: ["x", "y"],
        children: [],
      }
    ],
  }
];

const intermediateGeneratedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 2, column: 0 }, //TODO artificially enlarged to distinguish from inner scope...
  isStackFrame: false,
  isHidden: false,
  originalScope: originalScopes[0],
  values: [null],
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 1, column: 25 },
      isStackFrame: false,
      isHidden: false,
      originalScope: originalScopes[0].children![0],
      values: ['"world"', "a"],
      callSite: { sourceIndex: 0, line: 4, column: 0 },
      children: [],
    }
  ],
};

const intermediateOriginalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 2, column: 0 },
    kind: "module",
    isStackFrame: false,
    variables: ["a"],
    children: [],
  }
];

const generatedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 2, column: 0 },
  isStackFrame: false,
  isHidden: false,
  originalScope: intermediateOriginalScopes[0],
  values: ["b"],
  children: [],
};

const { scopes: sourceMap1Scopes, names: sourceMap1Names } = encode({ scopes: originalScopes, ranges: [intermediateGeneratedRanges] });
const sourceMap1 = {
  version: 3 as 3,
  file: "intermediate.js",
  sources: ["original.js"],
  mappings: "AACA;AACA",
  names: sourceMap1Names!,
  scopes: sourceMap1Scopes!,
};

const { scopes: sourceMap2Scopes, names: sourceMap2Names } = encode({ scopes: intermediateOriginalScopes, ranges: [generatedRanges] });
const sourceMap2 = {
  version: 3 as 3,
  file: "generated.js",
  sources: ["intermediate.js"],
  mappings: "AAAA;AACA",
  names: sourceMap2Names!,
  scopes: sourceMap2Scopes!,
};

test("merged scope map", () => {
  const { generatedRanges: mergedGeneratedRanges } = mergeScopeMaps([sourceMap1], sourceMap2);

  expect(mergedGeneratedRanges[0].start).toStrictEqual({ line: 0, column: 0 });
  expect(mergedGeneratedRanges[0].end).toStrictEqual({ line: 2, column: 0 });
  expect(mergedGeneratedRanges[0].originalScope!.start).toStrictEqual(originalScopes[0].start);
  expect(mergedGeneratedRanges[0].originalScope!.end).toStrictEqual(originalScopes[0].end);
  expect(mergedGeneratedRanges[0].values).toStrictEqual([null]);
  expect(mergedGeneratedRanges[0].callSite).toBe(undefined);
  expect(mergedGeneratedRanges[0].children?.length).toBe(1);

  const childRange = mergedGeneratedRanges[0].children![0];
  expect(childRange?.start).toStrictEqual({ line: 0, column: 0 });
  expect(childRange?.end).toStrictEqual({ line: 1, column: 0 });
  expect(childRange?.originalScope!.start).toStrictEqual(originalScopes[0].children![0].start);
  expect(childRange?.originalScope!.end).toStrictEqual(originalScopes[0].children![0].end);
  expect(childRange?.values).toStrictEqual(['"world"', "b"]);
  expect(childRange?.callSite).toStrictEqual({ sourceIndex: 0, line: 4, column: 0 });
  expect(childRange?.children?.length).toBe(0);
});
