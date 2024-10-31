import { GeneratedRange, OriginalScope } from "../../src/types";
import { mergeScopeMaps } from "../../src/mergeScopeMaps";

/**
Original sources:
- original1.js:
```javascript
0 console.log("foo");
```

- original2.js:
```javascript
0 export function log(x) {
1   console.log(x);
2 }
3 log("bar");
```

- original3.js:
```javascript
0 import { log } from "./original2";
1 log("baz");
```

Intermediate sources:
- intermediate1.js
```javascript
0 console.log("foo");
```

- intermediate2.js
```javascript
0 function log(x) {
1   console.log(x);
2 }
3 log("bar");
4 console.log("baz");
```

Generated source:
```javascript
0 console.log("foo");
1 console.log("bar");
2 console.log("baz");
```
*/

const originalScopes1: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 0, column: 19 },
    kind: "module",
  }
];

const intermediateGeneratedRanges1: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 0, column: 19 },
  isScope: true,
  original: {
    scope: originalScopes1[0],
  },
};

const originalScopes2: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 3, column: 11 },
    kind: "module",
    variables: ["log"],
    children: [
      {
        start: { line: 0, column: 0 },
        end: { line: 2, column: 1 },
        kind: "function",
        variables: ["x"],
      }
    ]
  },
  {
    start: { line: 0, column: 0 },
    end: { line: 1, column: 11 },
    kind: "module",
    variables: ["log"],
  }
];

const intermediateGeneratedRanges2: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 4, column: 19 },
  isScope: true,
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 3, column: 11 },
      isScope: false,
      original: {
        scope: originalScopes2[0],
        bindings: [undefined],
      },
      children: [
        {
          start: { line: 0, column: 0 },
          end: { line: 2, column: 1 },
          isScope: true,
          original: {
            scope: originalScopes2[0].children![0],
            bindings: ["x"],
          }
        }
      ]
    },
    {
      start: { line: 4, column: 0 },
      end: { line: 4, column: 19 },
      isScope: false,
      original: {
        scope: originalScopes2[1],
        bindings: [undefined]
      },
      children: [
        {
          start: { line: 4, column: 0 },
          end: { line: 4, column: 19 },
          isScope: false,
          original: {
            scope: originalScopes2[0].children![0],
            bindings: ["\"baz\""],
            callsite: { sourceIndex: 1, line: 1, column: 0 },
          }
        }
      ]
    }
  ],
};

const intermediateOriginalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 0, column: 19 },
    kind: "module",
  },
  {
    start: { line: 0, column: 0 },
    end: { line: 4, column: 19 },
    kind: "module",
    variables: ["log"],
    children: [
      {
        start: { line: 0, column: 0 },
        end: { line: 2, column: 1 },
        kind: "function",
        variables: ["x"],
      }
    ]
  }
];

const generatedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 2, column: 19 },
  isScope: true,
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 0, column: 19 },
      isScope: false,
      original: {
        scope: intermediateOriginalScopes[0],
      },
    },
    {
      start: { line: 1, column: 0 },
      end: { line: 2, column: 19 },
      isScope: false,
      original: {
        scope: intermediateOriginalScopes[1],
      },
      children: [
        {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 19 },
          isScope: false,
          original: {
            scope: intermediateOriginalScopes[1].children![0],
            bindings: ["\"bar\""],
            callsite: { sourceIndex: 1, line: 3, column: 0 },
          }
        }
      ]
    }
  ]
};

const sourceMap1_1 = {
  "version": 3 as 3,
  "file": "intermediate1.js",
  "sources": ["original1.js"],
  "mappings": "AAAA",
  "names": [],
  originalScopes: originalScopes1,
  generatedRanges: intermediateGeneratedRanges1,
};

const sourceMap1_2 = {
  "version": 3 as 3,
  "file": "intermediate2.js",
  "sources": ["original2.js", "original3.js"],
  "mappings": "AAAA;AACA;AACA;AACA;AAFA",
  "names": [],
  originalScopes: originalScopes2,
  generatedRanges: intermediateGeneratedRanges2,
};

const sourceMap2 = {
  "version": 3 as 3,
  "file": "generated.js",
  "sources": ["intermediate1.js", "intermediate2.js"],
  "mappings": "AAAA;ACCA;AAGA",
  "names": [],
  originalScopes: intermediateOriginalScopes,
  generatedRanges,
};

test("merged scope map", () => {
  const { generatedRanges: mergedGeneratedRanges } = mergeScopeMaps([sourceMap1_1, sourceMap1_2], sourceMap2);

  expect(mergedGeneratedRanges.start).toStrictEqual({ line: 0, column: 0 });
  expect(mergedGeneratedRanges.end).toStrictEqual({ line: 2, column: 19 });
  expect(mergedGeneratedRanges.original).toBe(undefined);
  expect(mergedGeneratedRanges.children?.length).toBe(2);

  let childRange = mergedGeneratedRanges.children?.[0];
  expect(childRange?.start).toStrictEqual({ line: 0, column: 0 });
  expect(childRange?.end).toStrictEqual({ line: 0, column: 19 });
  expect(childRange?.original?.scope).toBe(originalScopes1[0]);
  expect(childRange?.original?.bindings).toBe(undefined);
  expect(childRange?.children?.length).toBe(0);

  childRange = mergedGeneratedRanges.children?.[1];
  expect(childRange?.start).toStrictEqual({ line: 1, column: 0 });
  expect(childRange?.end).toStrictEqual({ line: 2, column: 19 });
  expect(childRange?.original).toBe(undefined);
  expect(childRange?.children?.length).toBe(2);

  let grandchildRange = childRange?.children?.[0];
  expect(grandchildRange?.start).toStrictEqual({ line: 1, column: 0 });
  expect(grandchildRange?.end).toStrictEqual({ line: 1, column: 19 });
  expect(grandchildRange?.original?.scope).toBe(originalScopes2[0]);
  expect(grandchildRange?.original?.bindings).toStrictEqual([undefined]);
  expect(grandchildRange?.original?.callsite).toBe(undefined);
  expect(grandchildRange?.children?.length).toBe(1);

  let grandgrandchildRange = grandchildRange?.children?.[0];
  expect(grandgrandchildRange?.start).toStrictEqual({ line: 1, column: 0 });
  expect(grandgrandchildRange?.end).toStrictEqual({ line: 1, column: 19 });
  expect(grandgrandchildRange?.original?.scope).toBe(originalScopes2[0].children?.[0]);
  expect(grandgrandchildRange?.original?.bindings).toStrictEqual(['"bar"']);
  expect(grandgrandchildRange?.original?.callsite).toStrictEqual({ sourceIndex: 1, line: 3, column: 0 });
  expect(grandgrandchildRange?.children?.length).toBe(0);

  grandchildRange = childRange?.children?.[1];
  expect(grandchildRange?.start).toStrictEqual({ line: 2, column: 0 });
  expect(grandchildRange?.end).toStrictEqual({ line: 2, column: 0 });
  expect(grandchildRange?.original?.scope).toBe(originalScopes2[1]);
  expect(grandchildRange?.original?.bindings).toStrictEqual([undefined]);
  expect(grandchildRange?.original?.callsite).toBe(undefined);
  expect(grandchildRange?.children?.length).toBe(1);

  grandgrandchildRange = grandchildRange?.children?.[0];
  expect(grandgrandchildRange?.start).toStrictEqual({ line: 2, column: 0 });
  expect(grandgrandchildRange?.end).toStrictEqual({ line: 2, column: 0 });
  expect(grandgrandchildRange?.original?.scope).toBe(originalScopes2[0].children?.[0]);
  expect(grandgrandchildRange?.original?.bindings).toStrictEqual(['"baz"']);
  expect(grandgrandchildRange?.original?.callsite).toStrictEqual({ sourceIndex: 2, line: 1, column: 0 });
  expect(grandgrandchildRange?.children?.length).toBe(0);
});
