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
    variables: ["fun"],
    children: [
      {
        start: { line: 0, column: 0 },
        end: { line: 3, column: 1 },
        kind: "function",
        name: "fun",
        variables: ["x", "y"],
      }
    ],
  }
];

const intermediateGeneratedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 4, column: 11 },
  isScope: true,
  original: {
    scope: originalScopes[0],
    bindings: ["f"],
  },
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 3, column: 1 },
      isScope: true,
      original: {
        scope: originalScopes[0].children![0],
        bindings: ["a", "b"]
      },
    }
  ],
};

const intermediateOriginalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 4, column: 11 },
    kind: "module",
    variables: ["f"],
    children: [
      {
        start: { line: 0, column: 0 },
        end: { line: 3, column: 1 },
        kind: "function",
        name: "f",
        variables: ["a", "b"],
      }
    ],
  }
];

const generatedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 1, column: 25 },
  isScope: true,
  original: {
    scope: intermediateOriginalScopes[0],
    bindings: [undefined]
  },
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 1, column: 25 },
      isScope: false,
      original: {
        scope: intermediateOriginalScopes[0].children![0],
        bindings: ["\"world\"", "a"],
        callsite: { sourceIndex: 0, line: 4, column: 0 }
      }
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
  expect(mergedGeneratedRanges.original?.scope).toBe(originalScopes[0]);
  expect(mergedGeneratedRanges.original?.bindings).toStrictEqual([undefined]);
  expect(mergedGeneratedRanges.original?.callsite).toBe(undefined);
  expect(mergedGeneratedRanges.children?.length).toBe(1);

  const childRange = mergedGeneratedRanges.children?.[0];
  expect(childRange?.start).toStrictEqual({ line: 0, column: 0 });
  expect(childRange?.end).toStrictEqual({ line: 1, column: 25 });
  expect(childRange?.original?.scope).toBe(originalScopes[0].children![0]);
  expect(childRange?.original?.bindings).toStrictEqual(["\"world\"", "a"]);
  expect(childRange?.original?.callsite).toStrictEqual({ sourceIndex: 0, line: 4, column: 0 });
  expect(childRange?.children?.length).toBe(0);
});
