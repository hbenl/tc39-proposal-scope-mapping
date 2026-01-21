import { mapStackTrace } from "../../src/getOriginalFrames";
import { OriginalScope, GeneratedRange } from "../../src/types";
import { createSourceMapWithScopes, decodeScopes, encodeScopes } from "../../src/util";

/**
Original source:
```javascript
0 function foo() {
1   for (const x of [1, 2, 3]) {
2     console.log(() => x);
3     throw new Error("Boom!");
4   }
5 }
6 foo();
```

Generated source:
```javascript
0 var _loop_1 = function (x) {
1     console.log(function () { return x; });
2     throw new Error("Boom!");
3 };
4 for (var _i = 0, _a = [1, 2, 3]; _i < _a.length; _i++) {
5     var x = _a[_i];
6     _loop_1(x);
7 }
```
*/

const scopeNames = ["module", "foo", "function", "for-loop", "x"];
const encodedScopes = "BCAAA,DC,BHAPCE,BCBdC,DG,CDD,CBB,CBG,ECAA,GA,ECAC,IAGA,EObC,GF,FDB,EBB3B,FDB,FA,FA";

const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 6, column: 6 },
    kind: "module",
    isStackFrame: false,
    variables: ["foo"],
    children: [
      {
        start: { line: 0, column: 15 },
        end: { line: 5, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "foo",
        variables: [],
        children: [
          {
            start: { line: 1, column: 29 },
            end: { line: 4, column: 3 },
            kind: "for-loop",
            isStackFrame: false,
            variables: ["x"],
            children: [],
          }
        ],
      }
    ],
  }
];

const generatedRanges: GeneratedRange[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 7, column: 1 },
    isStackFrame: false,
    isHidden: false,
    originalScope: originalScopes[0],
    values: [null],
    children: [
      {
        start: { line: 0, column: 0 },
        end: { line: 7, column: 1 },
        isStackFrame: false,
        isHidden: false,
        originalScope: originalScopes[0].children[0],
        values: [],
        callSite: { sourceIndex: 0, line: 6, column: 0 },
        children: [
          {
            start: { line: 0, column: 27 },
            end: { line: 3, column: 1 },
            isStackFrame: true,
            isHidden: true,
            originalScope: originalScopes[0].children[0].children[0],
            values: ["x"],
            children: []
          },
          {
            start: { line: 4, column: 55 },
            end: { line: 7, column: 1 },
            isStackFrame: false,
            isHidden: false,
            values: [],
            children: [],
          }
        ],
      }
    ],
  }
];

const sourceMap = createSourceMapWithScopes(
  [{
    original: { sourceIndex: 0, line: 3, column: 10 },
    generated: { line: 2, column: 10 },
  }],
  encodedScopes,
  scopeNames
);

test("decode scopes from sourcemap", () => {
  const { scopes, ranges } = decodeScopes(encodedScopes, scopeNames);
  expect(scopes).toStrictEqual(originalScopes);
  expect(ranges).toStrictEqual(generatedRanges);
});

test("encode scopes to sourcemap", () => {
  const { scopes, names } = encodeScopes(originalScopes, generatedRanges);
  expect(scopes).toStrictEqual(encodedScopes);
  expect(names).toStrictEqual(scopeNames);
});

test("symbolize stacktrace", () => {
  expect(mapStackTrace(sourceMap, [
    { line: 2, column: 10 },
    { line: 6, column: 4 }]
  )).toMatchInlineSnapshot(`
[
  {
    "generatedFrameIndex": 0,
    "name": "foo",
    "originalLocation": {
      "column": 10,
      "line": 3,
      "sourceIndex": 0,
    },
  },
  {
    "generatedFrameIndex": 1,
    "name": undefined,
    "originalLocation": {
      "column": 0,
      "line": 6,
      "sourceIndex": 0,
    },
  },
]
`);
});
