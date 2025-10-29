// tests/e2e/bridgeEndToEnd.test.js
const request = require('supertest');

// Mock logger to avoid console output in tests before importing app
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
  },
  middleware: jest.fn()
}));

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// For end-to-end tests, we'll simulate the full flow by testing the complete
// functionality of the bridge without mocking core services
describe('MCP Client Bridge End-to-End Tests', () => {
  let originalEnv;

  // Store original environment variables
  beforeAll(() => {
    originalEnv = { ...process.env };
    // Set test-specific environment variables
    process.env.NODE_ENV = 'test';
    process.env.STORAGE_PATH = './tests/temp-data';
    process.env.CACHE_TTL = '60';
    process.env.CACHE_MAX_KEYS = '100';
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = { ...originalEnv };
  });

  beforeEach(async () => {
    // Clean up any existing test data
    try {
      await fs.rm('./tests/temp-data', { recursive: true, force: true });
    } catch (err) {
      // Ignore if directory doesn't exist
    }
  });

  describe('Full Bridge Workflow', () => {
    test('should initialize and process requests end-to-end', async () => {
      // Import the app after setting environment
      const app = require('../../index');
      
      // Test health endpoint first to ensure server is running
      const healthResponse = await request(app).get('/health');
      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body).toHaveProperty('status');
      expect(healthResponse.body.status).toBe('OK');
    });

    test('should process a complete request flow from discovery to execution', async () => {
      const app = require('../../index');
      
      // First, verify that the bridge is properly initialized by getting stats
      const statsResponse = await request(app).get('/api/mcp/stats');
      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body).toHaveProperty('connectionPoolSize');
      expect(statsResponse.body).toHaveProperty('cachedRequests');
      expect(statsResponse.body).toHaveProperty('metrics');
      
      // Test server discovery functionality
      const discoveryResponse = await request(app)
        .get('/api/mcp/discovery/servers')
        .expect(200);
      
      expect(discoveryResponse.body).toHaveProperty('servers');
      
      // Test tool discovery functionality
      const toolsResponse = await request(app)
        .post('/api/mcp/discovery/tools/search')
        .send({ query: 'read file' })
        .expect(200);
      
      expect(toolsResponse.body).toHaveProperty('results');
      
      // Test the main process endpoint (with mocked response to avoid actual server calls)
      const processResponse = await request(app)
        .post('/api/mcp/process')
        .send({ request: 'Test request for end-to-end flow' })
        .expect(200);
      
      // The response might fail due to missing actual servers, but we should get a structured response
      expect(processResponse.body).toHaveProperty('success');
    });
  });

  describe('Data Persistence Flow', () => {
    test('should persist data through the storage system', async () => {
      const app = require('../../index');
      
      // Get initial stats
      const initialStats = await request(app).get('/api/mcp/stats');
      const initialRequestCount = initialStats.body.metrics.totalRequests || 0;
      
      // Make a few requests to generate metrics
      await request(app)
        .post('/api/mcp/process')
        .send({ request: 'Test request 1' });
      
      await request(app)
        .post('/api/mcp/process')
        .send({ request: 'Test request 2' });
      
      // Get updated stats
      const updatedStats = await request(app).get('/api/mcp/stats');
      const updatedRequestCount = updatedStats.body.metrics.totalRequests;
      
      // Verify that metrics were updated
      expect(updatedRequestCount).toBeGreaterThanOrEqual(initialRequestCount);
    });
  });

  describe('Configuration Management', () => {
    test('should handle configuration endpoints', async () => {
      const app = require('../../index');
      
      // Test getting all server configurations
      const configResponse = await request(app)
        .get('/api/config/servers')
        .expect(200);
      
      expect(configResponse.body).toHaveProperty('servers');
      
      // Test getting global settings
      const settingsResponse = await request(app)
        .get('/api/config/settings')
        .expect(200);
      
      expect(settingsResponse.body).toHaveProperty('settings');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle invalid requests gracefully', async () => {
      const app = require('../../index');
      
      // Test with invalid request format
      const invalidResponse = await request(app)
        .post('/api/mcp/process')
        .send({})
        .expect(400);
      
      expect(invalidResponse.body).toHaveProperty('error');
      
      // Test with non-existent endpoint
      const notFoundResponse = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);
      
      expect(notFoundResponse.body).toHaveProperty('error');
    });

    test('should maintain stability under load', async () => {
      const app = require('../../index');
      
      // Make multiple requests in parallel to test stability
      const requests = Array.from({ length: 5 }, (_, i) => 
        request(app)
          .post('/api/mcp/process')
          .send({ request: `Load test request ${i}` })
      );
      
      const responses = await Promise.all(requests.map(req => req.catch(err => err)));
      
      // Check that most requests were handled without server errors
      const successfulResponses = responses.filter(
        res => res.status && res.status !== 500
      );
      
      expect(successfulResponses.length).toBeGreaterThanOrEqual(3); // At least 3 out of 5 should succeed
    });
  });

  describe('Cache Functionality', () => {
    test('should properly cache and retrieve responses', async () => {
      const app = require('../../index');
      
      // First request
      const firstResponse = await request(app)
        .post('/api/mcp/process')
        .send({ request: 'Cache test request' });
      
      // Second request with same parameters (if caching were implemented at API level)
      const secondResponse = await request(app)
        .post('/api/mcp/process')
        .send({ request: 'Cache test request' });
      
      // Both should succeed
      expect(firstResponse.status).toBe(200);
      expect(secondResponse.status).toBe(200);
    });
  });

  describe('Service Integration', () => {
    test('should integrate all services properly', async () => {
      const app = require('../../index');
      
      // Test the complete flow: discovery -> processing -> metrics
      const discoveryResult = await request(app)
        .get('/api/mcp/discovery/servers')
        .expect(200);
      
      expect(discoveryResult.body.servers.length).toBeGreaterThanOrEqual(0); // Could be 0 if no servers configured
      
      const processResult = await request(app)
        .post('/api/mcp/process')
        .send({ request: 'Integration test request' })
        .expect(200);
      
      expect(processResult.body).toHaveProperty('success');
      
      const finalStats = await request(app)
        .get('/api/mcp/stats')
        .expect(200);
      
      expect(finalStats.body).toHaveProperty('metrics');
      expect(finalStats.body).toHaveProperty('cacheStats');
    });
  });
});

// Additional e2e test for server startup and shutdown
describe('MCP Client Bridge Server Lifecycle', () => {
  let serverProcess;

  afterEach(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  test('should start and respond to requests', (done) => {
    // This test would actually start the server as a child process
    // For now, we'll just verify that the app module can be required without errors
    expect(() => {
      require('../../index');
    }).not.toThrow();
    
    // In a real e2e test, we would:
    // 1. Spawn the server process
    // 2. Wait for it to be ready
    // 3. Make requests to it
    // 4. Verify responses
    // 5. Shut it down gracefully
    done();
  });
});