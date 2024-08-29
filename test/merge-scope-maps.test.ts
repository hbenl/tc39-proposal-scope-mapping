import { GeneratedRange, OriginalScope } from "../src/types";
import { mergeScopeMaps } from "../src/mergeScopeMaps";

/**
Original source:
```javascript
0 {
1   let x = 1;
2   console.log(x);
3   {
4     let x = 2;
5     console.log(x);
6   }
7   console.log(x);
8 }
```

Intermediate source:
```javascript
0 {
1   let a = 1;
2   console.log(a);
3   {
4     let b = 2;
5     console.log(b);
6   }
7   console.log(a);
8 }
```

Generated source:
```javascript
0 {
1   var x1 = 1;
2   console.log(x1);
3   var x2 = 2;
4   console.log(x2);
5   console.log(x1);
6 }
```
*/

const originalScopes: OriginalScope[] = [
  {
    start: { sourceIndex: 0, line: 0, column: 0 },
    end: { sourceIndex: 0, line: 9, column: 0 },
    kind: "module",
    variables: [],
    children: [
      {
        start: { sourceIndex: 0, line: 0, column: 0 },
        end: { sourceIndex: 0, line: 8, column: 1 },
        variables: ["x"],
        kind: "block",
        children: [
          {
            start: { sourceIndex: 0, line: 3, column: 2 },
            end: { sourceIndex: 0, line: 6, column: 3 },
            kind: "block",
            variables: ["x"],
          }
        ],
      }
    ],
  }
];

const intermediateGeneratedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 9, column: 0 },
  isScope: true,
  original: {
    scope: originalScopes[0],
    bindings: []
  },
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 8, column: 1 },
      isScope: true,
      original: {
        scope: originalScopes[0].children![0],
        bindings: ["a"]
      },
      children: [
        {
          start: { line: 3, column: 2 },
          end: { line: 6, column: 3 },
          isScope: true,
          original: {
            scope: originalScopes[0].children![0].children![0],
            bindings: ["b"]
          },
        }
      ],
    }
  ],
};

const intermediateOriginalScopes: OriginalScope[] = [
  {
    start: { sourceIndex: 0, line: 0, column: 0 },
    end: { sourceIndex: 0, line: 9, column: 0 },
    kind: "module",
    variables: [],
    children: [
      {
        start: { sourceIndex: 0, line: 0, column: 0 },
        end: { sourceIndex: 0, line: 8, column: 1 },
        variables: ["a"],
        kind: "block",
        children: [
          {
            start: { sourceIndex: 0, line: 3, column: 2 },
            end: { sourceIndex: 0, line: 6, column: 3 },
            kind: "block",
            variables: ["b"],
          }
        ],
      }
    ],
  }
];

const generatedRanges: GeneratedRange = {
  start: { line: 0, column: 0 },
  end: { line: 7, column: 0 },
  isScope: true,
  original: {
    scope: intermediateOriginalScopes[0],
    bindings: [],
  },
  children: [
    {
      start: { line: 0, column: 0 },
      end: { line: 6, column: 1 },
      isScope: true,
      original: {
        scope: intermediateOriginalScopes[0].children![0],
        bindings: ["x1"],
      },
      children: [
        {
          start: { line: 3, column: 2 },
          end: { line: 4, column: 18 },
          isScope: false,
          original: {
            scope: intermediateOriginalScopes[0].children![0].children![0],
            bindings: ["x2"],
          },
        }
      ],
    }
  ],
};

test("merged scope map", () => {
  const { generatedRanges: mergedGeneratedRanges } = mergeScopeMaps({
    originalScopes,
    generatedRanges: intermediateGeneratedRanges
  }, {
    originalScopes: intermediateOriginalScopes,
    generatedRanges
  });

  expect(mergedGeneratedRanges.original?.scope).toEqual(originalScopes[0]);
  expect(mergedGeneratedRanges.original?.bindings).toEqual([]);

  expect(mergedGeneratedRanges.children![0].original?.scope).toEqual(originalScopes[0].children![0]);
  expect(mergedGeneratedRanges.children![0].original?.bindings).toEqual(["x1"]);

  expect(mergedGeneratedRanges.children![0].children![0].original?.scope).toEqual(originalScopes[0].children![0].children![0]);
  expect(mergedGeneratedRanges.children![0].children![0].original?.bindings).toEqual(["x2"]);
});
