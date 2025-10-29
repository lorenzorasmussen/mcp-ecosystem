// tests/setup.js
// Setup file for Jest tests

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.STORAGE_PATH = './tests/temp-data';
process.env.CACHE_TTL = '60';
process.env.CACHE_MAX_KEYS = '100';
process.env.MCP_DEFAULT_TIMEOUT = '5000';
process.env.MCP_MAX_RETRIES = '1';
process.env.MCP_RETRY_DELAY = '100';

// Clean up test data before each test run
const fs = require('fs').promises;
const path = require('path');

beforeAll(async () => {
  const testDataPath = path.join(__dirname, 'temp-data');
  try {
    await fs.rm(testDataPath, { recursive: true, force: true });
    await fs.mkdir(testDataPath, { recursive: true });
  } catch (err) {
    // Ignore errors if directory doesn't exist
  }
});

// Clean up after all tests
afterAll(async () => {
  const testDataPath = path.join(__dirname, 'temp-data');
  try {
    await fs.rm(testDataPath, { recursive: true, force: true });
  } catch (err) {
    // Ignore errors during cleanup
  }
});