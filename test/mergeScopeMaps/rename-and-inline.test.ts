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
0 function f(a) {
1   const b = "Hello ";
2   console.log(b + a);
3 }
4 f("world");
```

Generated source:
```javascript
0 const a = "Hello ";
1 console.log(a + "world");
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
  end: { line: 4, column: 11 },
  isStackFrame: false,
  isHidden: false,
  originalScope: originalScopes[0],
  values: ["f"],
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 3, column: 1 },
      isStackFrame: true,
      isHidden: false,
      originalScope: originalScopes[0].children![0],
      values: ["a", "b"],
      children: [],
    }
  ],
};

const intermediateOriginalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 4, column: 11 },
    kind: "module",
    isStackFrame: false,
    variables: ["f"],
    children: [
      {
        start: { line: 0, column: 0 },
        end: { line: 3, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "f",
        variables: ["a", "b"],
        children: [],
      }
    ],
  }
];

const generatedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 1, column: 25 },
  isStackFrame: false,
  isHidden: false,
  originalScope: intermediateOriginalScopes[0],
  values: [null],
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 1, column: 25 },
      isStackFrame: false,
      isHidden: false,
      originalScope: intermediateOriginalScopes[0].children![0],
      callSite: { sourceIndex: 0, line: 4, column: 0 },
      values: ['"world"', "a"],
      children: [],
    }
  ],
};

const sourceMap1 = {
  "version": 3 as 3,
  "file": "intermediate.js",
  "sources": ["original.js"],
  "mappings": "AAAA;AACA;AACA;AACA;AACA",
  "names": [],
  originalScopes,
  generatedRanges: intermediateGeneratedRanges,
};

const sourceMap2 = {
  "version": 3 as 3,
  "file": "generated.js",
  "sources": ["intermediate.js"],
  "mappings": "AACA;AACA",
  "names": [],
  originalScopes: intermediateOriginalScopes,
  generatedRanges,
};

test("merged scope map", () => {
  const { generatedRanges: mergedGeneratedRanges } = mergeScopeMaps([sourceMap1], sourceMap2);

  expect(mergedGeneratedRanges.start).toStrictEqual({ line: 0, column: 0 });
  expect(mergedGeneratedRanges.end).toStrictEqual({ line: 1, column: 25 });
  expect(mergedGeneratedRanges.originalScope).toBe(originalScopes[0]);
  expect(mergedGeneratedRanges.values).toStrictEqual([null]);
  expect(mergedGeneratedRanges.callSite).toBe(undefined);
  expect(mergedGeneratedRanges.children?.length).toBe(1);

  const childRange = mergedGeneratedRanges.children?.[0];
  expect(childRange?.start).toStrictEqual({ line: 0, column: 0 });
  expect(childRange?.end).toStrictEqual({ line: 1, column: 25 });
  expect(childRange?.originalScope).toBe(originalScopes[0].children![0]);
  expect(childRange?.values).toStrictEqual(['"world"', "a"]);
  expect(childRange?.callSite).toStrictEqual({ sourceIndex: 0, line: 4, column: 0 });
  expect(childRange?.children?.length).toBe(0);
});
