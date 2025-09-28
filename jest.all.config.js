module.exports = {
  projects: [
    "<rootDir>/jest.config.js",
    "<rootDir>/jest.integration.config.js",
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx,js,jsx}",
    "!src/**/__tests__/**",
    "!src/**/__integration_tests__/**",
    "!src/**/*.d.ts",
    "!src/**/types/**",
  ],
  coverageReporters: ["text", "lcov", "html", "json-summary"],
  coverageDirectory: "<rootDir>/coverage",
};
