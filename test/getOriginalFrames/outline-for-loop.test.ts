import { symbolizeStackTrace } from "../../src/getOriginalFrames";
import { OriginalScope, GeneratedRange } from "../../src/types";
import { addDecodedScopes, decodeScopes, encodeScopes } from "../../src/util";

/**
Taken from https://docs.google.com/presentation/d/1MUQ1F_KxrWRNReOhIKhSV7QYYNo6eqrxk1oP72MSrv0

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
0  "use strict";
1
2  function foo() {
3      var _loop_1 = function (x) {
4          console.log(function () { return x; });
5          throw new Error("Boom!");
6      };
7      for (var _i = 0, _a = [1, 2, 3]; _i < _a.length; _i++) {
8          var x = _a[_i];
9          _loop_1(x);
10     }
11 }
12 foo();
```
*/

const scopeNames = ["module", "foo", "function", "for-loop", "x"];
const encodedScopes = "BCAAA,DC,BHAPCE,BCBdC,DG,CDD,CBB,CBG,ECAA,GA,EHCPC,EPBfC,GF,FDF,EBB7B,FDF,FBB,FBG";

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
    end: { line: 12, column: 6 },
    isStackFrame: false,
    isHidden: false,
    originalScope: originalScopes[0],
    values: [null],
    children: [
      {
        start: { line: 2, column: 15 },
        end: { line: 11, column: 1 },
        isStackFrame: true,
        isHidden: false,
        originalScope: originalScopes[0].children[0],
        values: [],
        children: [
          {
            start: { line: 3, column: 31 },
            end: { line: 6, column: 5 },
            isStackFrame: true,
            isHidden: true,
            originalScope: originalScopes[0].children[0].children[0],
            values: ["x"],
            children: []
          },
          {
            start: { line: 7, column: 59 },
            end: { line: 10, column: 5 },
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

const sourceMap: any = {
  version: 3,
  sources: ["original.js"],
  names: scopeNames,
  mappings: ";;AAAA,SAAS,GAAG;4BACC,CAAC;QACV,OAAO,CAAC,GAAG,CAAC,cAAM,OAAA,CAAC,EAAD,CAAC,CAAC,CAAC;QACrB,MAAM,IAAI,KAAK,CAAC,OAAO,CAAC,CAAC;;IAF3B,KAAgB,UAAS,EAAT,MAAC,CAAC,EAAE,CAAC,EAAE,CAAC,CAAC,EAAT,cAAS,EAAT,IAAS;QAApB,IAAM,CAAC,SAAA;gBAAD,CAAC;KAGX;AACH,CAAC;AACD,GAAG,EAAE,CAAC",
  scopes: encodedScopes
};
addDecodedScopes(sourceMap);

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
  expect(symbolizeStackTrace(sourceMap, [
    { line: 5, column: 14 },
    { line: 9, column: 15 },
    { line: 12, column: 0 }]
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
    "generatedFrameIndex": 2,
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
