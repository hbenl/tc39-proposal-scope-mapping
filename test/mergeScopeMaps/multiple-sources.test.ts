import { encode } from "@chrome-devtools/source-map-scopes-codec";
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

const { scopes: sourceMap1_1Scopes, names: sourceMap1_1Names } = encode({ scopes: originalScopes1, ranges: [intermediateGeneratedRanges1] });
const sourceMap1_1 = {
  version: 3 as 3,
  file: "intermediate1.js",
  sources: ["original1.js"],
  mappings: "AAAA",
  names: sourceMap1_1Names!,
  scopes: sourceMap1_1Scopes!,
};

const { scopes: sourceMap1_2Scopes, names: sourceMap1_2Names } = encode({ scopes: originalScopes2, ranges: [intermediateGeneratedRanges2] });
const sourceMap1_2 = {
  version: 3 as 3,
  file: "intermediate2.js",
  sources: ["original2.js", "original3.js"],
  mappings: "AAAA;AACA;AACA;AACA;AAFA",
  names: sourceMap1_2Names!,
  scopes: sourceMap1_2Scopes!,
};

const { scopes: sourceMap2Scopes, names: sourceMap2Names } = encode({ scopes: intermediateOriginalScopes, ranges: [generatedRanges] });
const sourceMap2 = {
  version: 3 as 3,
  file: "generated.js",
  sources: ["intermediate1.js", "intermediate2.js"],
  mappings: "AAAA;ACCA;AAGA",
  names: sourceMap2Names!,
  scopes: sourceMap2Scopes!,
};

test("merged scope map", () => {
  const { generatedRanges: mergedGeneratedRanges } = mergeScopeMaps([sourceMap1_1, sourceMap1_2], sourceMap2);

  let range = mergedGeneratedRanges[0];
  expect(range?.start).toStrictEqual({ line: 0, column: 0 });
  expect(range?.end).toStrictEqual({ line: 0, column: 19 });
  expect(range?.originalScope!.start).toStrictEqual(originalScopes1[0].start);
  expect(range?.values).toStrictEqual([]);
  expect(range?.children?.length).toBe(0);

  range = mergedGeneratedRanges[1];
  expect(range?.start).toStrictEqual({ line: 1, column: 0 });
  expect(range?.end).toStrictEqual({ line: 2, column: 19 });
  expect(range?.originalScope).toBe(undefined);
  expect(range?.children?.length).toBe(2);

  let childRange = range?.children?.[0];
  expect(childRange?.start).toStrictEqual({ line: 1, column: 0 });
  expect(childRange?.end).toStrictEqual({ line: 1, column: 19 });
  expect(childRange?.originalScope!.start).toStrictEqual(originalScopes2[0].start);
  expect(childRange?.originalScope!.end).toStrictEqual(originalScopes2[0].end);
  expect(childRange?.values).toStrictEqual([null]);
  expect(childRange?.callSite).toBe(undefined);
  expect(childRange?.children?.length).toBe(1);

  let grandchildRange = childRange?.children?.[0];
  expect(grandchildRange?.start).toStrictEqual({ line: 1, column: 0 });
  expect(grandchildRange?.end).toStrictEqual({ line: 1, column: 19 });
  expect(grandchildRange?.originalScope!.start).toStrictEqual(originalScopes2[0].children?.[0].start);
  expect(grandchildRange?.originalScope!.end).toStrictEqual(originalScopes2[0].children?.[0].end);
  expect(grandchildRange?.values).toStrictEqual(['"bar"']);
  expect(grandchildRange?.callSite).toStrictEqual({ sourceIndex: 1, line: 3, column: 0 });
  expect(grandchildRange?.children?.length).toBe(0);

  childRange = range?.children?.[1];
  expect(childRange?.start).toStrictEqual({ line: 2, column: 0 });
  expect(childRange?.end).toStrictEqual({ line: 2, column: 0 });
  expect(childRange?.originalScope!.start).toStrictEqual(originalScopes2[1].start);
  expect(childRange?.originalScope!.end).toStrictEqual(originalScopes2[1].end);
  expect(childRange?.values).toStrictEqual([null]);
  expect(childRange?.callSite).toBe(undefined);
  expect(childRange?.children?.length).toBe(1);

  grandchildRange = childRange?.children?.[0];
  expect(grandchildRange?.start).toStrictEqual({ line: 2, column: 0 });
  expect(grandchildRange?.end).toStrictEqual({ line: 2, column: 0 });
  expect(grandchildRange?.originalScope!.start).toStrictEqual(originalScopes2[0].children?.[0].start);
  expect(grandchildRange?.originalScope!.end).toStrictEqual(originalScopes2[0].children?.[0].end);
  expect(grandchildRange?.values).toStrictEqual(['"baz"']);
  expect(grandchildRange?.callSite).toStrictEqual({ sourceIndex: 2, line: 1, column: 0 });
  expect(grandchildRange?.children?.length).toBe(0);
});
