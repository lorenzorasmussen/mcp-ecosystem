/**
 * Simple Jest Test Setup
 */

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.CI = "true";

// Global test timeout
jest.setTimeout(30000);

// Error handling for unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
