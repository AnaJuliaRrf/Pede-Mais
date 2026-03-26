module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  setupFiles: ["<rootDir>/tests/setup/jest.env.js"],
  clearMocks: true,
};
