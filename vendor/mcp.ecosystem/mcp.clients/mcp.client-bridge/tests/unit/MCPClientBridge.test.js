// tests/unit/MCPClientBridge.test.js
const MCPClientBridge = require('../../src/services/MCPClientBridge');
const ServerDiscoveryService = require('../../src/services/ServerDiscoveryService');
const TodoEnforcementService = require('../../src/services/TodoEnforcementService');
const PersistentStorage = require('../../src/models/PersistentStorage');
const { mockData } = require('../testHelpers');

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

// Mock external dependencies
jest.mock('../../src/services/ServerDiscoveryService');
jest.mock('../../src/services/TodoEnforcementService');
jest.mock('../../src/models/PersistentStorage');
jest.mock('axios');

describe('MCPClientBridge Unit Tests', () => {
  let mcpBridge;
  let mockStorage;
  let mockDiscoveryService;
  let mockTodoService;

  beforeEach(() => {
    // Setup mocks
    mockStorage = {
      initialize: jest.fn().mockResolvedValue(),
      updateAgentState: jest.fn().mockResolvedValue(),
      recordRequest: jest.fn().mockResolvedValue(),
      updateServerStats: jest.fn().mockResolvedValue(),
      getMetrics: jest.fn().mockResolvedValue({}),
      getCacheStats: jest.fn().mockResolvedValue({}),
      updateCacheStats: jest.fn().mockResolvedValue(),
    };

    mockDiscoveryService = {
      loadServerIndex: jest.fn().mockResolvedValue(),
      findToolsForQuery: jest.fn().mockResolvedValue(mockData.mockDiscoveryResults),
      getAllServers: jest.fn().mockResolvedValue([]),
      getServersByCategory: jest.fn().mockResolvedValue([]),
      searchServers: jest.fn().mockResolvedValue([]),
      findToolsForQuery: jest.fn().mockResolvedValue([]),
      getAllTools: jest.fn().mockResolvedValue([]),
      getIndexMetadata: jest.fn().mockResolvedValue({}),
    };

    mockTodoService = {
      validateTodosForOperation: jest.fn().mockResolvedValue({ valid: true }),
      updateTodoStatus: jest.fn().mockResolvedValue(),
    };

    // Mock the constructor dependencies
    PersistentStorage.mockImplementation(() => mockStorage);
    ServerDiscoveryService.mockImplementation(() => mockDiscoveryService);
    TodoEnforcementService.mockImplementation(() => mockTodoService);

    mcpBridge = new MCPClientBridge('./data/test.json');
    mcpBridge.discoveryService = mockDiscoveryService;
    mcpBridge.todoService = mockTodoService;
    mcpBridge.storage = mockStorage;
  });

  describe('Initialization', () => {
    test('should initialize without errors', async () => {
      await expect(mcpBridge.initialize()).resolves.not.toThrow();
      expect(mockStorage.initialize).toHaveBeenCalled();
      expect(mockDiscoveryService.loadServerIndex).toHaveBeenCalled();
      expect(mockStorage.updateAgentState).toHaveBeenCalledWith({
        lastStartup: expect.any(String),
        status: 'running',
      });
    });
  });

  describe('Connection Management', () => {
    test('should connect to server and create connection in pool', async () => {
      const mockAxiosInstance = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
        get: jest.fn().mockResolvedValue({ data: {} }),
      };
      
      jest.mock('axios', () => ({
        create: jest.fn(() => mockAxiosInstance),
      }));

      const result = await mcpBridge.connectToServer('test-server', mockData.mockServerConfig);
      
      expect(mcpBridge.connectionPool.has('test-server')).toBe(true);
      expect(result).toBe(mockAxiosInstance);
    });

    test('should reuse existing connection if available', async () => {
      const mockExistingConnection = { get: jest.fn() };
      mcpBridge.connectionPool.set('test-server', mockExistingConnection);

      const result = await mcpBridge.connectToServer('test-server', mockData.mockServerConfig);
      
      expect(result).toBe(mockExistingConnection);
    });

    test('should fetch server capabilities if not cached', async () => {
      const mockAxiosInstance = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
        get: jest.fn().mockResolvedValue({ data: { tools: [] } }),
      };
      
      jest.mock('axios', () => ({
        create: jest.fn(() => mockAxiosInstance),
      }));

      await mcpBridge.connectToServer('test-server', mockData.mockServerConfig);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/capabilities');
    });
  });

  describe('Request Parsing', () => {
    test('should parse natural language request and return server and tool call', async () => {
      mockDiscoveryService.findToolsForQuery.mockResolvedValue(mockData.mockDiscoveryResults);
      
      const result = await mcpBridge.parseRequest('Read the file README.md');
      
      expect(result.serverId).toBe('mcp.filesystem');
      expect(result.toolCall).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(result.discoveryResults).toEqual(mockData.mockDiscoveryResults);
    });

    test('should handle request with no matching tools using fallback intent detection', async () => {
      mockDiscoveryService.findToolsForQuery.mockResolvedValue([]);
      
      const result = await mcpBridge.parseRequest('Git commit changes');
      
      expect(result.intent).toBe('git_operations');
      expect(result.serverId).toBeDefined();
      expect(result.toolCall).toBeDefined();
    });

    test('should determine correct intent for file operations', () => {
      const intent = mcpBridge.determineIntent('Read the file README.md');
      expect(intent).toBe('file_operations');
    });

    test('should determine correct intent for git operations', () => {
      const intent = mcpBridge.determineIntent('Commit changes to repository');
      expect(intent).toBe('git_operations');
    });

    test('should determine correct intent for search operations', () => {
      const intent = mcpBridge.determineIntent('Find files containing keyword');
      expect(intent).toBe('search_operations');
    });
  });

  describe('Tool Execution', () => {
    test('should execute tool call and return result', async () => {
      const mockAxiosInstance = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
        post: jest.fn().mockResolvedValue({ data: mockData.mockServerResponse }),
      };
      
      jest.mock('axios', () => ({
        create: jest.fn(() => mockAxiosInstance),
      }));

      // Mock the connection pool to return our mock instance
      mcpBridge.connectionPool.set('test-server', mockAxiosInstance);
      
      const result = await mcpBridge.executeToolCall('test-server', mockData.mockToolCall);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/execute', mockData.mockToolCall);
      expect(result).toEqual(mockData.mockServerResponse);
    });

    test('should cache result when appropriate', async () => {
      const mockAxiosInstance = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
        post: jest.fn().mockResolvedValue({ data: mockData.mockServerResponse }),
      };
      
      jest.mock('axios', () => ({
        create: jest.fn(() => mockAxiosInstance),
      }));

      mcpBridge.connectionPool.set('test-server', mockAxiosInstance);
      
      await mcpBridge.executeToolCall('test-server', mockData.mockToolCall);
      
      // Verify that the result was cached
      const cacheKey = mcpBridge.generateCacheKey('test-server', mockData.mockToolCall);
      const cachedResult = mcpBridge.requestCache.get(cacheKey);
      expect(cachedResult).toEqual(mockData.mockServerResponse);
    });

    test('should return cached result if available', async () => {
      const cacheKey = mcpBridge.generateCacheKey('test-server', mockData.mockToolCall);
      mcpBridge.requestCache.set(cacheKey, mockData.mockServerResponse);
      
      const result = await mcpBridge.executeToolCall('test-server', mockData.mockToolCall);
      
      expect(result).toEqual(mockData.mockServerResponse);
    });

    test('should execute with retry logic on failure', async () => {
      const mockAxiosInstance = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
        post: jest
          .fn()
          .mockRejectedValueOnce(new Error('First attempt failed'))
          .mockRejectedValueOnce(new Error('Second attempt failed'))
          .mockResolvedValue({ data: mockData.mockServerResponse }),
      };
      
      jest.mock('axios', () => ({
        create: jest.fn(() => mockAxiosInstance),
      }));

      mcpBridge.connectionPool.set('test-server', mockAxiosInstance);
      
      // Mock delay function to avoid actual delays in tests
      mcpBridge.delay = jest.fn().mockResolvedValue();
      
      const result = await mcpBridge.executeToolCall('test-server', mockData.mockToolCall);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3); // First + 2 retries
      expect(result).toEqual(mockData.mockServerResponse);
    });
  });

  describe('Request Processing', () => {
    test('should process natural language request successfully', async () => {
      mockDiscoveryService.findToolsForQuery.mockResolvedValue(mockData.mockDiscoveryResults);
      
      const mockAxiosInstance = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
        post: jest.fn().mockResolvedValue({ data: mockData.mockServerResponse }),
      };
      
      jest.mock('axios', () => ({
        create: jest.fn(() => mockAxiosInstance),
      }));

      mcpBridge.connectionPool.set('mcp.filesystem', mockAxiosInstance);
      
      const result = await mcpBridge.processRequest('Read the file README.md');
      
      expect(result.success).toBe(true);
      expect(result.result).toEqual(mockData.mockServerResponse);
      expect(mockStorage.recordRequest).toHaveBeenCalled();
      expect(mockStorage.updateServerStats).toHaveBeenCalled();
    });

    test('should handle processing errors gracefully', async () => {
      mockDiscoveryService.findToolsForQuery.mockRejectedValue(new Error('Discovery failed'));
      
      const result = await mcpBridge.processRequest('Invalid request');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockStorage.recordRequest).toHaveBeenCalled();
    });
  });

  describe('Statistics and Metrics', () => {
    test('should return comprehensive statistics', async () => {
      mockStorage.getMetrics.mockResolvedValue(mockData.mockMetrics);
      mockStorage.getCacheStats.mockResolvedValue(mockData.mockCacheStats);
      mockDiscoveryService.getIndexMetadata.mockResolvedValue({ lastUpdated: '2024-10-29T10:00:00Z' });
      
      const stats = await mcpBridge.getStats();
      
      expect(stats.connectionPoolSize).toBeDefined();
      expect(stats.cachedRequests).toBeDefined();
      expect(stats.metrics).toEqual(mockData.mockMetrics);
      expect(stats.cacheStats).toEqual(mockData.mockCacheStats);
      expect(stats.discoveryStats).toBeDefined();
    });
  });

  describe('Discovery Methods', () => {
    test('should get all servers from discovery service', async () => {
      const mockServers = [{ id: 'test-server', name: 'Test Server' }];
      mockDiscoveryService.getAllServers.mockResolvedValue(mockServers);
      
      const result = await mcpBridge.getAllServers();
      
      expect(result).toEqual(mockServers);
    });

    test('should search servers by category', async () => {
      const mockServers = [{ id: 'test-server', name: 'Test Server', category: 'AI' }];
      mockDiscoveryService.getServersByCategory.mockResolvedValue(mockServers);
      
      const result = await mcpBridge.getServersByCategory('AI');
      
      expect(result).toEqual(mockServers);
    });

    test('should search servers by keyword', async () => {
      const mockServers = [{ id: 'test-server', name: 'Test Server' }];
      mockDiscoveryService.searchServers.mockResolvedValue(mockServers);
      
      const result = await mcpBridge.searchServers('test');
      
      expect(result).toEqual(mockServers);
    });

    test('should find tools for query', async () => {
      mockDiscoveryService.findToolsForQuery.mockResolvedValue(mockData.mockDiscoveryResults);
      
      const result = await mcpBridge.findToolsForQuery('read file');
      
      expect(result).toEqual(mockData.mockDiscoveryResults);
    });

    test('should get all tools', async () => {
      const mockTools = [{ serverId: 'test-server', tool: { name: 'test-tool' } }];
      mockDiscoveryService.getAllTools.mockResolvedValue(mockTools);
      
      const result = await mcpBridge.getAllTools();
      
      expect(result).toEqual(mockTools);
    });
  });

  describe('Utility Methods', () => {
    test('should generate correct cache key', () => {
      const cacheKey = mcpBridge.generateCacheKey('test-server', mockData.mockToolCall);
      expect(cacheKey).toContain('test-server');
      expect(cacheKey).toContain('read_file');
      expect(cacheKey).toContain('path');
    });

    test('should correctly determine if result should be cached', () => {
      const shouldCache = mcpBridge.shouldCacheResult({ tool_name: 'read_file' }, {});
      expect(shouldCache).toBe(true);
      
      const shouldNotCache = mcpBridge.shouldCacheResult({ tool_name: 'write_file' }, {});
      expect(shouldNotCache).toBe(false);
    });

    test('should track active requests', () => {
      mcpBridge.trackActiveRequest('test-server');
      expect(mcpBridge.activeRequests.get('test-server')).toBe(1);
    });

    test('should untrack active requests', () => {
      mcpBridge.activeRequests.set('test-server', 1);
      mcpBridge.untrackActiveRequest('test-server');
      expect(mcpBridge.activeRequests.has('test-server')).toBe(false);
    });
  });
});