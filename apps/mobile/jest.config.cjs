module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/src/test/**/*.test.ts?(x)"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  transformIgnorePatterns: ["node_modules/(?!(react-native|@react-native|expo|@expo)/)"]
};
