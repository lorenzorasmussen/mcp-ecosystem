// tests/unit/PersistentStorage.test.js
const PersistentStorage = require('../../src/models/PersistentStorage');
const fs = require('fs').promises;
const path = require('path');

// Mock logger to avoid console output in tests
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

// Mock fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
  }
}));

describe('PersistentStorage Unit Tests', () => {
  let storage;
  const testStoragePath = './test-data/test-storage.json';

  beforeEach(() => {
    storage = new PersistentStorage(testStoragePath);
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default storage path if none provided', () => {
      const defaultStorage = new PersistentStorage();
      expect(defaultStorage.storagePath).toBe('./data/mcp-data.json');
    });

    test('should initialize with provided storage path', () => {
      expect(storage.storagePath).toBe(testStoragePath);
    });

    test('should create default data structure if file does not exist', async () => {
      fs.promises.access.mockRejectedValue({ code: 'ENOENT' }); // File does not exist
      fs.promises.mkdir.mockResolvedValue();
      fs.promises.writeFile.mockResolvedValue();

      await storage.initialize();

      expect(fs.promises.mkdir).toHaveBeenCalledWith(path.dirname(testStoragePath), { recursive: true });
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        testStoragePath,
        expect.stringContaining('"version": "1.0"'),
        'utf8'
      );
      expect(storage.data).toHaveProperty('agentState');
      expect(storage.data).toHaveProperty('metrics');
      expect(storage.data).toHaveProperty('cacheStats');
    });

    test('should load existing data if file exists', async () => {
      const existingData = {
        version: '1.0',
        agentState: { status: 'running' },
        metrics: { totalRequests: 5 },
        cacheStats: { hits: 2 }
      };
      
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue(JSON.stringify(existingData));

      await storage.initialize();

      expect(storage.data).toEqual(existingData);
      expect(fs.promises.readFile).toHaveBeenCalledWith(testStoragePath, 'utf8');
    });

    test('should throw error if file access fails for reasons other than ENOENT', async () => {
      fs.promises.access.mockRejectedValue(new Error('Permission denied'));

      await expect(storage.initialize()).rejects.toThrow('Permission denied');
    });
  });

  describe('Data Management', () => {
    beforeEach(async () => {
      fs.promises.access.mockRejectedValue({ code: 'ENOENT' }); // File does not exist initially
      fs.promises.mkdir.mockResolvedValue();
      fs.promises.writeFile.mockResolvedValue();
      await storage.initialize();
    });

    test('should save data to storage', async () => {
      const testData = { test: 'data' };
      storage.data = testData;

      await storage.saveData();

      expect(fs.promises.mkdir).toHaveBeenCalledWith(path.dirname(testStoragePath), { recursive: true });
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        testStoragePath,
        JSON.stringify(testData, null, 2),
        'utf8'
      );
    });

    test('should load data from storage', async () => {
      const testData = { test: 'data' };
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue(JSON.stringify(testData));

      await storage.loadData();

      expect(storage.data).toEqual(testData);
    });

    test('should return default data structure', () => {
      const defaultData = storage.getDefaultData();

      expect(defaultData).toHaveProperty('version');
      expect(defaultData).toHaveProperty('agentState');
      expect(defaultData).toHaveProperty('metrics');
      expect(defaultData).toHaveProperty('cacheStats');
      expect(defaultData.version).toBe('1.0');
      expect(defaultData.agentState.status).toBe('stopped');
    });
  });

  describe('Agent State Management', () => {
    beforeEach(async () => {
      fs.promises.access.mockRejectedValue({ code: 'ENOENT' });
      fs.promises.mkdir.mockResolvedValue();
      fs.promises.writeFile.mockResolvedValue();
      await storage.initialize();
    });

    test('should update agent state', async () => {
      const newState = { status: 'running', lastShutdown: null };
      await storage.updateAgentState(newState);

      expect(storage.data.agentState.status).toBe('running');
      expect(storage.data.agentState.lastUpdate).toBeDefined();
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    test('should get agent state', () => {
      const state = storage.getAgentState();
      expect(state).toEqual(storage.data.agentState);
    });
  });

  describe('Metrics Management', () => {
    beforeEach(async () => {
      fs.promises.access.mockRejectedValue({ code: 'ENOENT' });
      fs.promises.mkdir.mockResolvedValue();
      fs.promises.writeFile.mockResolvedValue();
      await storage.initialize();
    });

    test('should record successful request', async () => {
      const request = 'Test request';
      const result = { success: true, serverId: 'test-server', intent: 'test-intent' };
      
      await storage.recordRequest(request, result);

      expect(storage.data.metrics.totalRequests).toBe(1);
      expect(storage.data.metrics.successfulRequests).toBe(1);
      expect(storage.data.metrics.failedRequests).toBe(0);
      expect(storage.data.metrics.requestHistory.length).toBe(1);
      expect(storage.data.metrics.requestHistory[0]).toHaveProperty('timestamp');
      expect(storage.data.metrics.requestHistory[0].request).toBe(request);
      expect(storage.data.metrics.requestHistory[0].result).toBe(true);
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    test('should record failed request', async () => {
      const request = 'Test request';
      const result = { success: false, serverId: 'test-server', intent: 'test-intent' };
      
      await storage.recordRequest(request, result);

      expect(storage.data.metrics.totalRequests).toBe(1);
      expect(storage.data.metrics.successfulRequests).toBe(0);
      expect(storage.data.metrics.failedRequests).toBe(1);
      expect(storage.data.metrics.requestHistory[0].result).toBe(false);
    });

    test('should maintain only last 1000 request history entries', async () => {
      // Add 1001 requests to test history limit
      for (let i = 0; i < 1001; i++) {
        await storage.recordRequest(`Request ${i}`, { success: true });
      }

      expect(storage.data.metrics.requestHistory.length).toBe(1000);
      // Check that the first entry was removed (should be request 1, not request 0)
      expect(storage.data.metrics.requestHistory[0].request).toBe('Request 1');
    });

    test('should update server statistics', async () => {
      await storage.updateServerStats('test-server', {
        successful: true,
        responseTime: 150
      });

      expect(storage.data.metrics.serverStats['test-server']).toBeDefined();
      expect(storage.data.metrics.serverStats['test-server'].requests).toBe(1);
      expect(storage.data.metrics.serverStats['test-server'].successful).toBe(1);
      expect(storage.data.metrics.serverStats['test-server'].avgResponseTime).toBe(150);
    });

    test('should update server statistics for failed requests', async () => {
      await storage.updateServerStats('test-server', {
        successful: false,
        responseTime: 200
      });

      expect(storage.data.metrics.serverStats['test-server'].failed).toBe(1);
      expect(storage.data.metrics.serverStats['test-server'].avgResponseTime).toBe(200);
    });

    test('should get metrics', () => {
      const metrics = storage.getMetrics();
      expect(metrics).toEqual(storage.data.metrics);
    });
  });

  describe('Cache Statistics Management', () => {
    beforeEach(async () => {
      fs.promises.access.mockRejectedValue({ code: 'ENOENT' });
      fs.promises.mkdir.mockResolvedValue();
      fs.promises.writeFile.mockResolvedValue();
      await storage.initialize();
    });

    test('should update cache stats for hit', async () => {
      await storage.updateCacheStats({ hit: true });

      expect(storage.data.cacheStats.hits).toBe(1);
      expect(storage.data.cacheStats.misses).toBe(0);
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    test('should update cache stats for miss', async () => {
      await storage.updateCacheStats({ hit: false });

      expect(storage.data.cacheStats.hits).toBe(0);
      expect(storage.data.cacheStats.misses).toBe(1);
    });

    test('should update cache stats for eviction', async () => {
      await storage.updateCacheStats({ eviction: true });

      expect(storage.data.cacheStats.evictions).toBe(1);
    });

    test('should get cache stats', () => {
      const cacheStats = storage.getCacheStats();
      expect(cacheStats).toEqual(storage.data.cacheStats);
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      fs.promises.access.mockRejectedValue({ code: 'ENOENT' });
      fs.promises.mkdir.mockResolvedValue();
      fs.promises.writeFile.mockResolvedValue();
      await storage.initialize();
    });

    test('should reset metrics', async () => {
      // First add some data
      await storage.recordRequest('test', { success: true });
      await storage.updateServerStats('test-server', { successful: true, responseTime: 100 });

      await storage.resetMetrics();

      expect(storage.data.metrics.totalRequests).toBe(0);
      expect(storage.data.metrics.successfulRequests).toBe(0);
      expect(storage.data.metrics.failedRequests).toBe(0);
      expect(storage.data.metrics.requestHistory).toEqual([]);
      expect(storage.data.metrics.serverStats).toEqual({});
    });

    test('should get request history with limit', async () => {
      // Add a few requests
      for (let i = 0; i < 5; i++) {
        await storage.recordRequest(`Request ${i}`, { success: true });
      }

      const history = storage.getRequestHistory(3);
      expect(history.length).toBe(3);
      expect(history[0].request).toBe('Request 2'); // Should get the last 3 requests
      expect(history[2].request).toBe('Request 4');
    });

    test('should get full request history when limit exceeds available', async () => {
      // Add 3 requests
      for (let i = 0; i < 3; i++) {
        await storage.recordRequest(`Request ${i}`, { success: true });
      }

      const history = storage.getRequestHistory(10);
      expect(history.length).toBe(3);
    });
  });
});