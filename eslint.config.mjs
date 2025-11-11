import nextConfig from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  // Global ignores
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/tsconfig.tsbuildinfo",
      "**/next-env.d.ts", // Next.js generated file with triple-slash references
    ],
  },

  // Extend Next.js recommended configs
  ...nextConfig,

  // Custom rules
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      "react-hooks/set-state-in-effect": "off", // Allow setState in effects for mounting checks and localStorage
    },
  },

  // Allow CommonJS in scripts directory
  {
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
