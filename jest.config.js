module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testMatch: ["**/test/**/*.test.ts"],
  testPathIgnorePatterns: ["<rootDir>/.worktrees/"],
  modulePathIgnorePatterns: ["<rootDir>/.worktrees/"],
  moduleNameMapper: {
    "^obsidian$": "<rootDir>/__mocks__/obsidian.ts"
  }
};
