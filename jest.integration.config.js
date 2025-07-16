// filepath: /Users/yuta/Develop/project-managed-app/jest.integration.config.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

// 結合テスト用のJest設定（Next.jsのcreateJestConfigを使用しない）
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
  // SWCの代わりにts-jestとbabel-jestを使用
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
        },
      },
    ],
    "^.+\\.(js|jsx)$": [
      "babel-jest",
      {
        presets: [
          ["@babel/preset-env", { targets: { node: "current" } }],
          "@babel/preset-react",
        ],
      },
    ],
  },
  transformIgnorePatterns: [
    "/node_modules/",
    "^.+\\.module\\.(css|sass|scss)$",
  ],
};

module.exports = integrationJestConfig;
