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
0 console.log("foo");
1 console.log("bar");
2 console.log("baz");
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
    end: { sourceIndex: 0, line: 5, column: 19 },
    kind: "module",
    children: [
      {
        start: { sourceIndex: 0, line: 0, column: 0 },
        end: { sourceIndex: 0, line: 2, column: 1 },
        kind: "function",
        variables: ["x"],
      }
    ],
  }
];

const intermediateGeneratedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 2, column: 19 },
  isScope: true,
  original: {
    scope: originalScopes[0],
  },
  children: [
    {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 19 },
      isScope: true,
      original: {
        scope: originalScopes[0].children![0],
        callsite: { sourceIndex: 0, line: 4, column: 0 },
        bindings: ['"bar"'],
      },
    }
  ],
};

const intermediateOriginalScopes: OriginalScope[] = [
  {
    start: { sourceIndex: 0, line: 0, column: 0 },
    end: { sourceIndex: 0, line: 2, column: 19 },
    kind: "module",
  }
];

const generatedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 2, column: 19 },
  isScope: true,
  original: {
    scope: intermediateOriginalScopes[0],
  },
};

const sourceMap1 = {
  "version": 3 as 3,
  "file": "intermediate.js",
  "sources": ["original.js"],
  "mappings": "AAGA;AAFA;AAIA",
  "names": [],
  originalScopes,
  generatedRanges: intermediateGeneratedRanges,
};

const sourceMap2 = {
  "version": 3 as 3,
  "file": "generated.js",
  "sources": ["intermediate.js"],
  "mappings": "AAAA;AACA,QAAQ;AACR",
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
  expect(childRange?.end).toStrictEqual({ line: 1, column: 8 });
  expect(childRange?.original?.scope).toBe(originalScopes[0].children![0]);
  expect(childRange?.original?.bindings).toStrictEqual(['"bar"']);
  expect(childRange?.original?.callsite).toStrictEqual({ sourceIndex: 0, line: 4, column: 0});
});
