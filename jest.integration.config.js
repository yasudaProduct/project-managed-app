// filepath: /Users/yuta/Develop/project-managed-app/jest.integration.config.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require("next/jest");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

const createJestConfig = nextJest({
  dir: "./",
});

// 結合テスト用のJest設定
const integrationJestConfig = {
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["**/__integration_tests__/**/*.test.[jt]s?(x)"],
  setupFilesAfterEnv: [
    path.resolve(__dirname, "./src/__integration_tests__/setup.ts"),
  ],
  globalSetup: path.resolve(__dirname, "./src/__integration_tests__/setup.ts"),
  globalTeardown: path.resolve(
    __dirname,
    "./src/__integration_tests__/setup.ts"
  ),
  moduleDirectories: ["node_modules", "<rootDir>"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testTimeout: 20000,
  verbose: true,
  setupFiles: [
    path.resolve(__dirname, "./src/__integration_tests__/load-env.ts"),
  ],
};

module.exports = createJestConfig(integrationJestConfig);
