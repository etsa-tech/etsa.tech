// @types/jest isn't picked up by TypeScript's default automatic @types
// inclusion in this project - this reference makes jest's globals
// (describe/it/expect/jest.mock/...) available to *.test.ts files without
// restricting the default auto-inclusion of every other @types package.
/// <reference types="jest" />
