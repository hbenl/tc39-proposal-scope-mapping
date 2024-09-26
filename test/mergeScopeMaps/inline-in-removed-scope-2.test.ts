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
    start: { sourceIndex: 0, line: 0, column: 0 },
    end: { sourceIndex: 0, line: 7, column: 19 },
    kind: "module",
    children: [
      {
        start: { sourceIndex: 0, line: 0, column: 0 },
        end: { sourceIndex: 0, line: 2, column: 1 },
        kind: "function",
        variables: ["x"],
      },
      {
        start: { sourceIndex: 0, line: 4, column: 0 },
        end: { sourceIndex: 0, line: 6, column: 1 },
        kind: "block",
      }
    ],
  }
];

const intermediateGeneratedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 4, column: 19 },
  isScope: true,
  original: {
    scope: originalScopes[0],
  },
  children: [
    {
      start: { line: 1, column: 0 },
      end: { line: 3, column: 1 },
      isScope: true,
      original: {
        scope: originalScopes[0].children![1],
      },
      children: [
        {
          start: { line: 2, column: 0 },
          end: { line: 2, column: 19 },
          isScope: false,
          original: {
            scope: originalScopes[0].children![0],
            callsite: { sourceIndex: 0, line: 5, column: 0 },
            bindings: ['"bar"'],
          },
        }
      ]
    }
  ],
};

const intermediateOriginalScopes: OriginalScope[] = [
  {
    start: { sourceIndex: 0, line: 0, column: 0 },
    end: { sourceIndex: 0, line: 4, column: 19 },
    kind: "module",
    children: [
      {
        start: { sourceIndex: 0, line: 1, column: 0 },
        end: { sourceIndex: 0, line: 3, column: 1 },
        kind: "block",
      }
    ],
  }
];

const generatedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 2, column: 19 },
  isScope: true,
  original: {
    scope: intermediateOriginalScopes[0],
  },
  children: [
    {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 19 },
      isScope: false,
      original: {
        scope: intermediateOriginalScopes[0].children![0],
      },
    }
  ],
};

const sourceMap1 = {
  "version": 3 as 3,
  "file": "intermediate.js",
  "sources": ["original.js"],
  "mappings": "AAGA;;AAFA;;AAMA",
  "names": [],
  originalScopes,
  generatedRanges: intermediateGeneratedRanges,
};

const sourceMap2 = {
  "version": 3 as 3,
  "file": "generated.js",
  "sources": ["intermediate.js"],
  "mappings": "AAAA;AAEA,QAAU;AAEV",
  "names": [],
  originalScopes: intermediateOriginalScopes,
  generatedRanges,
};

test("merged scope map", () => {
  const { generatedRanges: mergedGeneratedRanges } = mergeScopeMaps(sourceMap1, sourceMap2);

  expect(mergedGeneratedRanges.start).toStrictEqual({ line: 0, column: 0 });
  expect(mergedGeneratedRanges.end).toStrictEqual({ line: 2, column: 19 });
  expect(mergedGeneratedRanges.original?.scope).toBe(originalScopes[0]);
  expect(mergedGeneratedRanges.original?.bindings).toStrictEqual(undefined);
  expect(mergedGeneratedRanges.original?.callsite).toBe(undefined);

  const childRange = mergedGeneratedRanges.children?.[0];
  expect(childRange?.start).toStrictEqual({ line: 1, column: 0 });
  expect(childRange?.end).toStrictEqual({ line: 1, column: 19 });
  expect(childRange?.original?.scope).toBe(originalScopes[0].children![1]);
  expect(childRange?.original?.bindings).toStrictEqual(undefined);
  expect(childRange?.original?.callsite).toStrictEqual(undefined);

  const grandchildRange = childRange?.children?.[0];
  expect(grandchildRange?.start).toStrictEqual({ line: 1, column: 0 });
  expect(grandchildRange?.end).toStrictEqual({ line: 1, column: 8 });
  expect(grandchildRange?.original?.scope).toBe(originalScopes[0].children![0]);
  expect(grandchildRange?.original?.bindings).toStrictEqual(['"bar"']);
  expect(grandchildRange?.original?.callsite).toStrictEqual({ sourceIndex: 0, line: 5, column: 0 });
});
