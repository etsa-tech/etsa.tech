const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/types/**",
    "!src/**/__tests__/**",
    "!src/**/*.test.{ts,tsx}",
    // Privacy page work in progress elsewhere in this working tree -
    // excluded from this pass's coverage scope until it lands. (LinkedIn
    // admin posting, previously excluded here alongside it, now has full
    // test coverage and is included.)
    "!src/app/privacy/**",
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
