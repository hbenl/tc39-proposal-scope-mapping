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
    isStackFrame: false,
    variables: [],
    children: [],
  }
];

const intermediateGeneratedRanges1: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 0, column: 19 },
  isStackFrame: false,
  isHidden: false,
  originalScope: originalScopes1[0],
  values: [],
  children: [],
};

const originalScopes2: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 3, column: 11 },
    kind: "module",
    isStackFrame: false,
    variables: ["log"],
    children: [
      {
        start: { line: 0, column: 0 },
        end: { line: 2, column: 1 },
        kind: "function",
        isStackFrame: true,
        variables: ["x"],
        children: [],
      }
    ]
  },
  {
    start: { line: 0, column: 0 },
    end: { line: 1, column: 11 },
    kind: "module",
    isStackFrame: false,
    variables: ["log"],
    children: [],
  }
];

const intermediateGeneratedRanges2: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 4, column: 19 },
  isStackFrame: false,
  isHidden: false,
  values: [],
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 3, column: 11 },
      isStackFrame: false,
      isHidden: false,
      originalScope: originalScopes2[0],
      values: [null],
      children: [
        {
          start: { line: 0, column: 0 },
          end: { line: 2, column: 1 },
          isStackFrame: true,
          isHidden: false,
          originalScope: originalScopes2[0].children![0],
          values: ["x"],
          children: [],
        }
      ]
    },
    {
      start: { line: 4, column: 0 },
      end: { line: 4, column: 19 },
      isStackFrame: false,
      isHidden: false,
      originalScope: originalScopes2[1],
      values: [null],
      children: [
        {
          start: { line: 4, column: 0 },
          end: { line: 4, column: 19 },
          isStackFrame: false,
          isHidden: false,
          originalScope: originalScopes2[0].children![0],
          values: ['"baz"'],
          callSite: { sourceIndex: 1, line: 1, column: 0 },
          children: [],
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
    isStackFrame: false,
    variables: [],
    children: [],
  },
  {
    start: { line: 0, column: 0 },
    end: { line: 4, column: 19 },
    kind: "module",
    isStackFrame: false,
    variables: ["log"],
    children: [
      {
        start: { line: 0, column: 0 },
        end: { line: 2, column: 1 },
        kind: "function",
        isStackFrame: true,
        variables: ["x"],
        children: [],
      }
    ]
  }
];

const generatedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 2, column: 19 },
  isStackFrame: false,
  isHidden: false,
  values: [],
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 0, column: 19 },
      isStackFrame: false,
      isHidden: false,
      originalScope: intermediateOriginalScopes[0],
      values: [],
      children: [],
    },
    {
      start: { line: 1, column: 0 },
      end: { line: 2, column: 19 },
      isStackFrame: false,
      isHidden: false,
      originalScope: intermediateOriginalScopes[1],
      values: [],
      children: [
        {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 19 },
          isStackFrame: false,
          isHidden: false,
          originalScope: intermediateOriginalScopes[1].children![0],
          values: ['"bar"'],
          callSite: { sourceIndex: 1, line: 3, column: 0 },
          children: [],
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
  expect(mergedGeneratedRanges.originalScope).toBe(undefined);
  expect(mergedGeneratedRanges.children?.length).toBe(2);

  let childRange = mergedGeneratedRanges.children?.[0];
  expect(childRange?.start).toStrictEqual({ line: 0, column: 0 });
  expect(childRange?.end).toStrictEqual({ line: 0, column: 19 });
  expect(childRange?.originalScope).toBe(originalScopes1[0]);
  expect(childRange?.values).toStrictEqual([]);
  expect(childRange?.children?.length).toBe(0);

  childRange = mergedGeneratedRanges.children?.[1];
  expect(childRange?.start).toStrictEqual({ line: 1, column: 0 });
  expect(childRange?.end).toStrictEqual({ line: 2, column: 19 });
  expect(childRange?.originalScope).toBe(undefined);
  expect(childRange?.children?.length).toBe(2);

  let grandchildRange = childRange?.children?.[0];
  expect(grandchildRange?.start).toStrictEqual({ line: 1, column: 0 });
  expect(grandchildRange?.end).toStrictEqual({ line: 1, column: 19 });
  expect(grandchildRange?.originalScope).toBe(originalScopes2[0]);
  expect(grandchildRange?.values).toStrictEqual([null]);
  expect(grandchildRange?.callSite).toBe(undefined);
  expect(grandchildRange?.children?.length).toBe(1);

  let grandgrandchildRange = grandchildRange?.children?.[0];
  expect(grandgrandchildRange?.start).toStrictEqual({ line: 1, column: 0 });
  expect(grandgrandchildRange?.end).toStrictEqual({ line: 1, column: 19 });
  expect(grandgrandchildRange?.originalScope).toBe(originalScopes2[0].children?.[0]);
  expect(grandgrandchildRange?.values).toStrictEqual(['"bar"']);
  expect(grandgrandchildRange?.callSite).toStrictEqual({ sourceIndex: 1, line: 3, column: 0 });
  expect(grandgrandchildRange?.children?.length).toBe(0);

  grandchildRange = childRange?.children?.[1];
  expect(grandchildRange?.start).toStrictEqual({ line: 2, column: 0 });
  expect(grandchildRange?.end).toStrictEqual({ line: 2, column: 0 });
  expect(grandchildRange?.originalScope).toBe(originalScopes2[1]);
  expect(grandchildRange?.values).toStrictEqual([null]);
  expect(grandchildRange?.callSite).toBe(undefined);
  expect(grandchildRange?.children?.length).toBe(1);

  grandgrandchildRange = grandchildRange?.children?.[0];
  expect(grandgrandchildRange?.start).toStrictEqual({ line: 2, column: 0 });
  expect(grandgrandchildRange?.end).toStrictEqual({ line: 2, column: 0 });
  expect(grandgrandchildRange?.originalScope).toBe(originalScopes2[0].children?.[0]);
  expect(grandgrandchildRange?.values).toStrictEqual(['"baz"']);
  expect(grandgrandchildRange?.callSite).toStrictEqual({ sourceIndex: 2, line: 1, column: 0 });
  expect(grandgrandchildRange?.children?.length).toBe(0);
});
