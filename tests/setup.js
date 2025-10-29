/**
 * Jest Test Setup
 * Global configuration and mocks for all tests
 */

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.CI = "true";

// Mock console methods to reduce noise in tests
const originalConsole = global.console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    // Suppress console.log in tests unless explicitly needed
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    // Keep these for debugging
    group: originalConsole.group,
    groupEnd: originalConsole.groupEnd,
    groupCollapsed: originalConsole.groupCollapsed,
    trace: originalConsole.trace,
    table: originalConsole.table,
    clear: originalConsole.clear,
    count: originalConsole.count,
    countReset: originalConsole.countReset,
    assert: originalConsole.assert,
    dir: originalConsole.dir,
    dirxml: originalConsole.dirxml,
    profile: originalConsole.profile,
    profileEnd: originalConsole.profileEnd,
    time: originalConsole.time,
    timeLog: originalConsole.timeLog,
    timeEnd: originalConsole.timeEnd,
    timeStamp: originalConsole.timeStamp,
    context: originalConsole.context,
    createTask: originalConsole.createTask,
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// Global test timeout
jest.setTimeout(30000);

// Mock external dependencies that might not be available in test environment
jest.mock("pm2", () => ({
  start: jest.fn(),
  stop: jest.fn(),
  restart: jest.fn(),
  delete: jest.fn(),
  describe: jest.fn(),
  list: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock file system operations for tests
jest.mock("fs/promises", () => ({
  ...jest.requireActual("fs/promises"),
  // Add specific mocks as needed
}));

// Global test utilities
global.testUtils = {
  // Helper to create mock file system
  mockFileSystem: (files) => {
    const fs = require("fs");
    const mockFs = {
      ...fs,
      readFileSync: jest.fn((path) => {
        if (files[path]) {
          return files[path];
        }
        throw new Error(`File not found: ${path}`);
      }),
      existsSync: jest.fn((path) => files.hasOwnProperty(path)),
      writeFileSync: jest.fn(),
      mkdirSync: jest.fn(),
    };
    return mockFs;
  },

  // Helper to create mock process
  mockProcess: (overrides = {}) => {
    return {
      cwd: () => "/test/project",
      exit: jest.fn(),
      env: { NODE_ENV: "test", ...overrides.env },
      ...overrides,
    };
  },

  // Helper to wait for async operations
  waitFor: (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms)),
};

// Error handling for unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
