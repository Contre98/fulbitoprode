module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/src/test/**/*.test.ts?(x)"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  transformIgnorePatterns: ["node_modules/(?!((?:\\.pnpm/)?(?:react-native|@react-native|expo|@expo|@react-navigation)))"]
};
