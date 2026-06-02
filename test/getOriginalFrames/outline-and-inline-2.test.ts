import { OriginalScope, GeneratedRange } from "../../src/types";
import { createSourceMapWithScopes, decodeScopes, encodeScopes } from "../../src/util";

/**
Taken from https://github.com/tc39/ecma426/issues/255

Original source:
```dart
0  class X<T> {
1    void foo(T a,
2             [T? b = null]) {
3      throw 'ouch';
4    }
5  }
6
7  main() {
8    X<Object> x = X<String>();
9    x.foo('abc');
10   x.foo(123);
11   X<int>().foo(1,2);
12 }
```

Generated source:
```javascript
0  class X {
1    constructor(type) { this.T = type; }
2    foo$body(a, b) { throwExpression('ouch'); }
3    foo$1$unchecked(a) { return this.foo$body(a, null); }
4    foo$2(a, b) { return this.foo$body(checkType(a, this.T), checkTypeNullable(b, this.T)); }
5    foo$1(a) { return this.foo$1$unchecked(checkType(a, this.T)); }
6  }
7  function main() {
8    const x = new X("String");
9    x.foo$1('abc');
10   x.foo$1(123);
11   new X("int").foo$body(1,2);
12 }
13 function checkType(value, type) {
14   if (type === 'String' && typeof value !== 'string') throw new Error(`${value} is not a String`);
15   if (type === 'int' && typeof value !== 'number') throw new Error(`${value} is not an int`);
16   return value;
17 }
18 function checkTypeNullable(value, type) {
19   return value == null ? value : checkType(value, type);
20 }
21 function throwExpression(str) {
22   throw new Error(str);
23 }
24 main();
*/

const scopeNames = ["module", "X", "main", "foo", "function", "a", "b", "x", "null", "'abc'", "undefined", "123"];
const encodedScopes = "BCAAA,DCC,BHBKGI,DGC,CDD,BHDHDA,DC,CFB,CAA,ECAA,GAD,EFBN,FZ,EPBKC,GGH,FjB,EPBRA,GGJ,FmB,EPBHA,GGH,F0C,EPBHA,GGJ,F6B,EHCNC,GI,EDCED,GKL,IAJE,FN,EDBEA,GML,IAKE,FL,EDBPA,GKL,IALL,FO,FBB,EFBS,FEB,EFBa,FCB,EFBY,FCB,FBH";

const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 12, column: 1 },
    kind: "module",
    isStackFrame: false,
    variables: ["X", "main"],
    children: [
      {
        start: { line: 1, column: 10 },
        end: { line: 4, column: 3 },
        kind: "function",
        isStackFrame: true,
        name: "foo",
        variables: ["a", "b"],
        children: [],
      },
      {
        start: { line: 7, column: 7 },
        end: { line: 12, column: 1 },
        kind: "function",
        isStackFrame: true,
        name: "main",
        variables: ["x"],
        children: [],
      }
    ]
  }
];

const generatedRanges: GeneratedRange[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 24, column: 7 },
    isStackFrame: false,
    isHidden: false,
    originalScope: originalScopes[0],
    values: [null, "main"],
    children: [
      {
        start: { line: 1, column: 13 },
        end: { line: 1, column: 38 },
        isStackFrame: true,
        isHidden: false,
        values: [],
        children: [],
      },
      {
        start: { line: 2, column: 10 },
        end: { line: 2, column: 45 },
        isStackFrame: true,
        isHidden: true,
        originalScope: originalScopes[0].children![0],
        values: ["a", "b"],
        children: [],
      },
      {
        start: { line: 3, column: 17 },
        end: { line: 3, column: 55 },
        isStackFrame: true,
        isHidden: true,
        originalScope: originalScopes[0].children![0],
        values: ["a", "null"],
        children: [],
      },
      {
        start: { line: 4, column: 7 },
        end: { line: 4, column: 91 },
        isStackFrame: true,
        isHidden: true,
        originalScope: originalScopes[0].children![0],
        values: ["a", "b"],
        children: [],
      },
      {
        start: { line: 5, column: 7 },
        end: { line: 5, column: 65 },
        isStackFrame: true,
        isHidden: true,
        originalScope: originalScopes[0].children![0],
        values: ["a", "null"],
        children: [],
      },
      {
        start: { line: 7, column: 13 },
        end: { line: 12, column: 1 },
        isStackFrame: true,
        isHidden: false,
        originalScope: originalScopes[0].children![1],
        values: ["x"],
        children: [
          {
            start: { line: 9, column: 4 },
            end: { line: 9, column: 17 },
            isStackFrame: false,
            isHidden: false,
            originalScope: originalScopes[0].children![0],
            values: ["'abc'", "undefined"],
            callSite: { sourceIndex: 0, line: 9, column: 4 },
            children: [],
          },
          {
            start: { line: 10, column: 4 },
            end: { line: 10, column: 15 },
            isStackFrame: false,
            isHidden: false,
            originalScope: originalScopes[0].children![0],
            values: ["123", "undefined"],
            callSite: { sourceIndex: 0, line: 10, column: 4 },
            children: [],
          },
          {
            start: { line: 11, column: 15 },
            end: { line: 11, column: 29 },
            isStackFrame: false,
            isHidden: false,
            originalScope: originalScopes[0].children![0],
            values: ["'abc'", "undefined"],
            callSite: { sourceIndex: 0, line: 11, column: 11 },
            children: [],
          }
        ]
      },
      {
        start: { line: 13, column: 18 },
        end: { line: 17, column: 1 },
        isStackFrame: true,
        isHidden: false,
        values: [],
        children: [],
      },
      {
        start: { line: 18, column: 26 },
        end: { line: 20, column: 1 },
        isStackFrame: true,
        isHidden: false,
        values: [],
        children: [],
      },
      {
        start: { line: 21, column: 24 },
        end: { line: 23, column: 1 },
        isStackFrame: true,
        isHidden: false,
        values: [],
        children: [],
      }
    ]
  }
];

const sourceMap = createSourceMapWithScopes(
  [{
    original: { sourceIndex: 0, line: 3, column: 4 },
    generated: { line: 2, column: 19 },
  }, {
    original: { sourceIndex: 0, line: 3, column: 4 },
    generated: { line: 3, column: 35 },
  }, {
    original: { sourceIndex: 0, line: 3, column: 4 },
    generated: { line: 4, column: 28 },
  }, {
    original: { sourceIndex: 0, line: 1, column: 11 },
    generated: { line: 4, column: 37 },
  }, {
    original: { sourceIndex: 0, line: 2, column: 12 },
    generated: { line: 4, column: 59 },
  }, {
    original: { sourceIndex: 0, line: 3, column: 4 },
    generated: { line: 5, column: 25 },
  }, {
    original: { sourceIndex: 0, line: 1, column: 11 },
    generated: { line: 5, column: 41 },
  }, {
    original: { sourceIndex: 0, line: 9, column: 4 },
    generated: { line: 9, column: 4 },
  }, {
    original: { sourceIndex: 0, line: 10, column: 4 },
    generated: { line: 10, column: 4 },
  }, {
    original: { sourceIndex: 0, line: 11, column: 11 },
    generated: { line: 11, column: 15 },
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
