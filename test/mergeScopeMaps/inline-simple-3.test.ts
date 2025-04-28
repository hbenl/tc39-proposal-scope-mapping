import { GeneratedRange, OriginalScope } from "../../src/types";
import { mergeScopeMaps } from "../../src/mergeScopeMaps";

/**
Original source:
```javascript
0 function f(x) {
1   console.log(x);
2 }
3 f("foo");
4 f("bar");
5 console.log("baz");
```

Intermediate source:
```javascript
0 function g(y) {
1   console.log(y);
2 }
3 console.log("foo");
4 g("bar");
5 console.log("baz");
```

Generated source:
```javascript
0 function h(z) {
1   console.log(z);
2 }
3 console.log("foo");
4 console.log("bar");
5 console.log("baz");
```
*/

const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 5, column: 19 },
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
      }
    ],
  }
];

const intermediateGeneratedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 5, column: 19 },
  isStackFrame: false,
  isHidden: false,
  originalScope: originalScopes[0],
  values: ["g"],
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 2, column: 1 },
      isStackFrame: true,
      isHidden: false,
      originalScope: originalScopes[0].children![0],
      values: ["y"],
      children: [],
    },
    {
      start: { line: 3, column: 0 },
      end: { line: 3, column: 19 },
      isStackFrame: false,
      isHidden: false,
      originalScope: originalScopes[0].children![0],
      callSite: { sourceIndex: 0, line: 3, column: 0 },
      values: ['"foo"'],
      children: [],
    }
  ],
};

const intermediateOriginalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 5, column: 19 },
    kind: "module",
    isStackFrame: false,
    variables: ["g"],
    children: [
      {
        start: { line: 0, column: 0 },
        end: { line: 2, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "g",
        variables: ["y"],
        children: [],
      }
    ],
  }
];

const generatedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 5, column: 19 },
  isStackFrame: false,
  isHidden: false,
  originalScope: intermediateOriginalScopes[0],
  values: ["h"],
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 2, column: 1 },
      isStackFrame: true,
      isHidden: false,
      originalScope: intermediateOriginalScopes[0].children![0],
      values: ["z"],
      children: [],
    },
    {
      start: { line: 4, column: 0 },
      end: { line: 4, column: 19 },
      isStackFrame: false,
      isHidden: false,
      originalScope: intermediateOriginalScopes[0].children![0],
      callSite: { sourceIndex: 0, line: 4, column: 0 },
      values: ['"bar"'],
      children: [],
    }
  ],
};

const sourceMap1 = {
  "version": 3 as 3,
  "file": "intermediate.js",
  "sources": ["original.js"],
  "mappings": "AAAA;AACA;AACA;AADA;AAGA;AACA",
  "names": [],
  originalScopes,
  generatedRanges: intermediateGeneratedRanges,
};

const sourceMap2 = {
  "version": 3 as 3,
  "file": "generated.js",
  "sources": ["intermediate.js"],
  "mappings": "AAAA;AACA;AACA;AACA;AAFA;AAIA",
  "names": [],
  originalScopes: intermediateOriginalScopes,
  generatedRanges,
};

test("merged scope map", () => {
  const { generatedRanges: mergedGeneratedRanges } = mergeScopeMaps([sourceMap1], sourceMap2);

  expect(mergedGeneratedRanges.start).toStrictEqual({ line: 0, column: 0 });
  expect(mergedGeneratedRanges.end).toStrictEqual({ line: 5, column: 19 });
  expect(mergedGeneratedRanges.originalScope).toBe(originalScopes[0]);
  expect(mergedGeneratedRanges.values).toStrictEqual(["h"]);
  expect(mergedGeneratedRanges.callSite).toBe(undefined);
  expect(mergedGeneratedRanges.children?.length).toBe(3);

  let childRange = mergedGeneratedRanges.children?.[0];
  expect(childRange?.start).toStrictEqual({ line: 0, column: 0 });
  expect(childRange?.end).toStrictEqual({ line: 2, column: 1 });
  expect(childRange?.originalScope).toBe(originalScopes[0].children![0]);
  expect(childRange?.values).toStrictEqual(["z"]);
  expect(childRange?.callSite).toBe(undefined);
  expect(childRange?.children?.length).toBe(0);

  childRange = mergedGeneratedRanges.children?.[1];
  expect(childRange?.start).toStrictEqual({ line: 3, column: 0 });
  expect(childRange?.end).toStrictEqual({ line: 3, column: 0 });
  expect(childRange?.originalScope).toBe(originalScopes[0].children![0]);
  expect(childRange?.values).toStrictEqual(['"foo"']);
  expect(childRange?.callSite).toStrictEqual({ sourceIndex: 0, line: 3, column: 0 });
  expect(childRange?.children?.length).toBe(0);

  childRange = mergedGeneratedRanges.children?.[2];
  expect(childRange?.start).toStrictEqual({ line: 4, column: 0 });
  expect(childRange?.end).toStrictEqual({ line: 4, column: 19 });
  expect(childRange?.originalScope).toBe(originalScopes[0].children![0]);
  expect(childRange?.values).toStrictEqual(['"bar"']);
  expect(childRange?.callSite).toStrictEqual({ sourceIndex: 0, line: 4, column: 0 });
  expect(childRange?.children?.length).toBe(0);
});
