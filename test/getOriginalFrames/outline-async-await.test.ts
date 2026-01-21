import { mapStackTrace } from "../../src/getOriginalFrames";
import { OriginalScope, GeneratedRange } from "../../src/types";
import { addDecodedScopes, decodeScopes, encodeScopes } from "../../src/util";

/**
Taken from https://docs.google.com/presentation/d/1MUQ1F_KxrWRNReOhIKhSV7QYYNo6eqrxk1oP72MSrv0

Original source:
```javascript
0 async function fn() {
1   return await 42;
2 }
3 fn();
```

Generated source:
```javascript
0  "use strict";
1  var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
2      function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
3      return new (P || (P = Promise))(function (resolve, reject) {
4          function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
5          function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
6          function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
7          step((generator = generator.apply(thisArg, _arguments || [])).next());
8      });
9  };
10 var __generator = (this && this.__generator) || function (thisArg, body) {
11     var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
12     return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
13     function verb(n) { return function (v) { return step([n, v]); }; }
14     function step(op) {
15         if (f) throw new TypeError("Generator is already executing.");
16         while (g && (g = 0, op[0] && (_ = 0)), _) try {
17             if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
18             if (y = 0, t) op = [op[0] & 2, t.value];
19             switch (op[0]) {
20                 case 0: case 1: t = op; break;
21                 case 4: _.label++; return { value: op[1], done: false };
22                 case 5: _.label++; y = op[1]; op = [0]; continue;
23                 case 7: op = _.ops.pop(); _.trys.pop(); continue;
24                 default:
25                     if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
26                     if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
27                     if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
28                     if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
29                     if (t[2]) _.ops.pop();
30                     _.trys.pop(); continue;
31             }
32             op = body.call(thisArg, _);
33         } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
34         if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
35     }
36 };
37
38 function fn() {
39     return __awaiter(this, void 0, void 0, function () {
40         return __generator(this, function (_a) {
41             switch (_a.label) {
42                 case 0: return [4, 42];
43                 case 1: return [2, _a.sent()];
44             }
45         });
46     });
47 }
48 fn();
```
*/

const scopeNames = ["module", "fn", "function"];
const encodedScopes = "BCAAA,DC,BHAUCE,CCB,CBF,ECAA,GC,ENB5C,ENBa,EM/B,FT,FE,ENB/B,ENBiB,FhC,ENBhB,FlC,ENBf,F3C,FCF,FBB,ENBpC,ENBpB,FqB,ENBrE,FQ,ENBV,EMW,FY,FD,ENBW,FVF,FBB,EHCOC,ENB3B,ENBvB,FFJ,FBF,FBB,FBF";

const originalScopes: OriginalScope[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 3, column: 5 },
    kind: "module",
    isStackFrame: false,
    variables: ["fn"],
    children: [
      {
        start: { line: 0, column: 20 },
        end: { line: 2, column: 1 },
        kind: "function",
        name: "fn",
        isStackFrame: true,
        variables: [],
        children: [],
      }
    ],
  }
];

const generatedRanges: GeneratedRange[] = [
  {
    start: { line: 0, column: 0 },
    end: { line: 48, column: 5 },
    isStackFrame: false,
    isHidden: false,
    originalScope: originalScopes[0],
    values: ["fn"],
    children: [
      {
        start: { line: 1, column: 89 },
        end: { line: 9, column: 1 },
        isStackFrame: true,
        isHidden: true,
        values: [],
        children: [
          {
            start: { line: 2, column: 26 },
            end: { line: 2, column: 112 },
            isStackFrame: true,
            isHidden: true,
            values: [],
            children: [
              {
                start: { line: 2, column: 89 },
                end: { line: 2, column: 108 },
                isStackFrame: true,
                isHidden: true,
                values: [],
                children: [],
              }
            ],
          },
          {
            start: { line: 3, column: 63 },
            end: { line: 8, column: 5 },
            isStackFrame: true,
            isHidden: true,
            values: [],
            children: [
              {
                start: { line: 4, column: 34 },
                end: { line: 4, column: 99 },
                isStackFrame: true,
                isHidden: true,
                values: [],
                children: [],
              },
              {
                start: { line: 5, column: 33 },
                end: { line: 5, column: 102 },
                isStackFrame: true,
                isHidden: true,
                values: [],
                children: [],
              },
              {
                start: { line: 6, column: 31 },
                end: { line: 6, column: 118 },
                isStackFrame: true,
                isHidden: true,
                values: [],
                children: [],
              },
            ]
          }
        ],
      },
      {
        start: { line: 10, column: 73 },
        end: { line: 36, column: 1 },
        isStackFrame: true,
        isHidden: true,
        values: [],
        children: [
          {
            start: { line: 11, column: 41 },
            end: { line: 11, column: 83 },
            isStackFrame: true,
            isHidden: true,
            values: [],
            children: [],
          },
          {
            start: { line: 12, column: 139 },
            end: { line: 12, column: 155 },
            isStackFrame: true,
            isHidden: true,
            values: [],
            children: [],
          },
          {
            start: { line: 13, column: 21 },
            end: { line: 13, column: 70 },
            isStackFrame: true,
            isHidden: true,
            values: [],
            children: [
              {
                start: { line: 13, column: 43 },
                end: { line: 13, column: 67 },
                isStackFrame: true,
                isHidden: true,
                values: [],
                children: [],
              }
            ],
          },
          {
            start: { line: 14, column: 22 },
            end: { line: 35, column: 5 },
            isStackFrame: true,
            isHidden: true,
            values: [],
            children: [],
          },
        ],
      },
      {
        start: { line: 38, column: 14 },
        end: { line: 47, column: 1 },
        isStackFrame: true,
        isHidden: false,
        originalScope: originalScopes[0].children[0],
        values: [],
        children: [
          {
            start: { line: 39, column: 55 },
            end: { line: 46, column: 5 },
            isStackFrame: true,
            isHidden: true,
            values: [],
            children: [
              {
                start: { line: 40, column: 47 },
                end: { line: 45, column: 9 },
                isStackFrame: true,
                isHidden: true,
                values: [],
                children: [],
              }
            ],
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
  mappings: ";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;AAAA,SAAe,EAAE;;;;wBACR,qBAAM,EAAE,EAAA;wBAAf,sBAAO,SAAQ,EAAC;;;;CACjB;AACD,EAAE,EAAE,CAAC",
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
  expect(mapStackTrace(sourceMap, [
    { line: 42, column: 30 },
    { line: 32, column: 22 },
    { line: 13, column: 52 },
    { line: 7, column: 70 },
    { line: 3, column: 11 },
    { line: 39, column: 11 },
    { line: 48, column: 0 }
  ])).toMatchInlineSnapshot(`
[
  {
    "generatedFrameIndex": 0,
    "name": "fn",
    "originalLocation": {
      "column": 9,
      "line": 1,
      "sourceIndex": 0,
    },
  },
  {
    "generatedFrameIndex": 6,
    "name": undefined,
    "originalLocation": {
      "column": 0,
      "line": 3,
      "sourceIndex": 0,
    },
  },
]
`);
});
