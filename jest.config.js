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
    // LinkedIn-integration work in progress elsewhere in this working
    // tree (privacy page, LinkedIn client/OAuth routes, speaker URN
    // store) - excluded from this pass's coverage scope until it lands.
    "!src/app/privacy/**",
    "!src/lib/linkedin/**",
    "!src/lib/speaker-linkedin-store.ts",
    "!src/app/api/admin/posts/[slug]/social/linkedin/**",
    "!src/app/admin/posts/[slug]/social/page.tsx",
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
