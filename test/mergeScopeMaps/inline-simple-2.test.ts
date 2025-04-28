import { GeneratedRange, OriginalScope } from "../../src/types";
import { mergeScopeMaps } from "../../src/mergeScopeMaps";

/**
Original source:
```javascript
0 function f(x) {
1   console.log(x);
2 }
3 console.log("foo");
4 f("bar");
5 console.log("baz");
```

Intermediate source:
```javascript
0 function f(x) {
1   console.log(x);
2 }
3 console.log("foo");
4 f("bar");
5 console.log("baz");
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
  values: [null],
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 2, column: 1 },
      isStackFrame: true,
      isHidden: false,
      originalScope: originalScopes[0].children![0],
      values: ["x"],
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

const generatedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 2, column: 19 },
  isStackFrame: false,
  isHidden: false,
  originalScope: intermediateOriginalScopes[0],
  values: [null],
  children: [
    {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 19 },
      isStackFrame: false,
      isHidden: false,
      originalScope: intermediateOriginalScopes[0].children![0],
      callSite: { sourceIndex: 0, line: 4, column: 0 },
      values: ['"bar"'],
      children: [],
    }
  ]
};

const sourceMap1 = {
  "version": 3 as 3,
  "file": "intermediate.js",
  "sources": ["original.js"],
  "mappings": "AAAA;AACA;AACA;AACA;AACA;AACA",
  "names": [],
  originalScopes,
  generatedRanges: intermediateGeneratedRanges,
};

const sourceMap2 = {
  "version": 3 as 3,
  "file": "generated.js",
  "sources": ["intermediate.js"],
  "mappings": "AAGA;AAFA;AAIA",
  "names": [],
  originalScopes: intermediateOriginalScopes,
  generatedRanges,
};

test("merged scope map", () => {
  const { generatedRanges: mergedGeneratedRanges } = mergeScopeMaps([sourceMap1], sourceMap2);

  expect(mergedGeneratedRanges.start).toStrictEqual({ line: 0, column: 0 });
  expect(mergedGeneratedRanges.end).toStrictEqual({ line: 2, column: 19 });
  expect(mergedGeneratedRanges.originalScope).toBe(originalScopes[0]);
  expect(mergedGeneratedRanges.values).toStrictEqual([null]);
  expect(mergedGeneratedRanges.callSite).toBe(undefined);
  expect(mergedGeneratedRanges.children?.length).toBe(1);

  const childRange = mergedGeneratedRanges.children?.[0];
  expect(childRange?.start).toStrictEqual({ line: 1, column: 0 });
  expect(childRange?.end).toStrictEqual({ line: 1, column: 19 });
  expect(childRange?.originalScope).toBe(originalScopes[0].children![0]);
  expect(childRange?.values).toStrictEqual(['"bar"']);
  expect(childRange?.callSite).toStrictEqual({ sourceIndex: 0, line: 4, column: 0 });
  expect(childRange?.children?.length).toBe(0);
});
