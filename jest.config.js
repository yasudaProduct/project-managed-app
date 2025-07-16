// Jestのカスタム設定
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  moduleDirectories: ["node_modules", "<rootDir>"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Next.jsのキャッシュ機能をモック
    "^next/cache$": "<rootDir>/__mocks__/next-cache.js",
  },
  testRegex: ["/src/__tests__/.*\\.[jt]sx?$"],
  // SWCの代わりにBabelトランスフォーマーを明示的に使用
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": [
      "babel-jest",
      {
        presets: ["next/babel"],
        plugins: [["@babel/plugin-proposal-decorators", { legacy: true }]],
      },
    ],
  },
  // ESMパッケージも変換対象に含める
  transformIgnorePatterns: [
    "/node_modules/(?!(lucide-react|@radix-ui)/)",
    "^.+\\.module\\.(css|sass|scss)$",
  ],
  // ESMサポートのための設定
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
};

// createJestConfigは使わず、直接設定をexport（SWC依存を回避）
module.exports = customJestConfig;
