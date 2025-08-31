export default {
  testEnvironment: "node",
  transform: {}, // ESM, no transpile needed
  testMatch: ["**/tests/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup-env.js"],
};
