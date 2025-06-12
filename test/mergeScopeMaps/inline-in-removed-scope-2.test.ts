import { encode } from "@chrome-devtools/source-map-scopes-codec";
import { GeneratedRange, OriginalScope } from "../../src/types";
import { mergeScopeMaps } from "../../src/mergeScopeMaps";

/**
Original source:
```javascript
0 function f(x) {
1   console.log(x);
2 }
3 console.log("foo");
4 {
5   f("bar");
6 }
7 console.log("baz");
```

Intermediate source:
```javascript
0 console.log("foo");
1 {
2   console.log("bar");
3 }
4 console.log("baz");
```

Generated source:
```javascript
0 console.log("foo");
1 console.log("bar");
2 console.log("baz");
```
*/

const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 7, column: 19 },
    kind: "module",
    isStackFrame: false,
    variables: ["f"],
    children: [
      {
        start: { line: 0, column: 0 },
        end: { line: 2, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "f",
        variables: ["x"],
        children: [],
      },
      {
        start: { line: 4, column: 0 },
        end: { line: 6, column: 1 },
        kind: "block",
        isStackFrame: false,
        variables: [],
        children: [],
      }
    ],
  }
];

const intermediateGeneratedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 4, column: 19 },
  isStackFrame: false,
  isHidden: false,
  originalScope: originalScopes[0],
  values: [null],
  children: [
    {
      start: { line: 1, column: 0 },
      end: { line: 3, column: 1 },
      isStackFrame: false,
      isHidden: false,
      originalScope: originalScopes[0].children![1],
      values: [],
      children: [
        {
          start: { line: 2, column: 0 },
          end: { line: 2, column: 19 },
          isStackFrame: false,
          isHidden: false,
          originalScope: originalScopes[0].children![0],
          callSite: { sourceIndex: 0, line: 5, column: 0 },
          values: ['"bar"'],
          children: [],
        }
      ]
    }
  ],
};

const intermediateOriginalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 4, column: 19 },
    kind: "module",
    isStackFrame: false,
    variables: [],
    children: [
      {
        start: { line: 1, column: 0 },
        end: { line: 3, column: 1 },
        kind: "block",
        isStackFrame: false,
        variables: [],
        children: [],
      }
    ],
  }
];

const generatedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 2, column: 19 },
  isStackFrame: false,
  isHidden: false,
  originalScope: intermediateOriginalScopes[0],
  values: [],
  children: [
    {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 19 },
      isStackFrame: false,
      isHidden: false,
      originalScope: intermediateOriginalScopes[0].children![0],
      values: [],
      children: [],
    }
  ],
};

const { scopes: sourceMap1Scopes, names: sourceMap1Names } = encode({ scopes: originalScopes, ranges: [intermediateGeneratedRanges] });
const sourceMap1 = {
  version: 3 as 3,
  file: "intermediate.js",
  sources: ["original.js"],
  mappings: "AAGA;;AAFA;;AAMA",
  names: sourceMap1Names!,
  scopes: sourceMap1Scopes!,
};

const { scopes: sourceMap2Scopes, names: sourceMap2Names } = encode({ scopes: intermediateOriginalScopes, ranges: [generatedRanges] });
const sourceMap2 = {
  version: 3 as 3,
  file: "generated.js",
  sources: ["intermediate.js"],
  mappings: "AAAA;AAEA,QAAU;AAEV",
  names: sourceMap2Names!,
  scopes: sourceMap2Scopes!,
};

test("merged scope map", () => {
  const { generatedRanges: mergedGeneratedRanges } = mergeScopeMaps([sourceMap1], sourceMap2);

  expect(mergedGeneratedRanges[0].start).toStrictEqual({ line: 0, column: 0 });
  expect(mergedGeneratedRanges[0].end).toStrictEqual({ line: 2, column: 19 });
  expect(mergedGeneratedRanges[0].originalScope!.start).toStrictEqual(originalScopes[0].start);
  expect(mergedGeneratedRanges[0].originalScope!.end).toStrictEqual(originalScopes[0].end);
  expect(mergedGeneratedRanges[0].values).toStrictEqual([null]);
  expect(mergedGeneratedRanges[0].callSite).toBe(undefined);
  expect(mergedGeneratedRanges[0].children?.length).toBe(1);

  const childRange = mergedGeneratedRanges[0].children?.[0];
  expect(childRange?.start).toStrictEqual({ line: 1, column: 0 });
  expect(childRange?.end).toStrictEqual({ line: 1, column: 19 });
  expect(childRange?.originalScope!.start).toStrictEqual(originalScopes[0].children![1].start);
  expect(childRange?.originalScope!.end).toStrictEqual(originalScopes[0].children![1].end);
  expect(childRange?.values).toStrictEqual([]);
  expect(childRange?.callSite).toStrictEqual(undefined);
  expect(childRange?.children?.length).toBe(1);

  const grandchildRange = childRange?.children?.[0];
  expect(grandchildRange?.start).toStrictEqual({ line: 1, column: 0 });
  expect(grandchildRange?.end).toStrictEqual({ line: 1, column: 8 });
  expect(grandchildRange?.originalScope!.start).toStrictEqual(originalScopes[0].children![0].start);
  expect(grandchildRange?.originalScope!.end).toStrictEqual(originalScopes[0].children![0].end);
  expect(grandchildRange?.values).toStrictEqual(['"bar"']);
  expect(grandchildRange?.callSite).toStrictEqual({ sourceIndex: 0, line: 5, column: 0 });
  expect(grandchildRange?.children?.length).toBe(0);
});
