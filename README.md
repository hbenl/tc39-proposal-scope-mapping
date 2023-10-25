This repository contains an example implementation of the algorithm for computing original frames and scopes in a debugger
using scope information encoded in the sourcemap according to [this proposal](https://github.com/tc39/source-map-rfc/issues/37#issuecomment-1650027594).
The algorithm can be found in `src/getOriginalFrames.ts`, the `test` directory contains some examples from [here](https://github.com/tc39/source-map-rfc/issues/37#issuecomment-1699356967).
Furthermore it shows how this scope information could be encoded in a VLQ string in `src/encodeScopes.ts`/`src/decodeScopes.ts`.
