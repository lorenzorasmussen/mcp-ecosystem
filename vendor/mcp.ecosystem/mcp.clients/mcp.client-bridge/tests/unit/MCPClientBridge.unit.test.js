// tests/unit/MCPClientBridge.unit.test.js
const MCPClientBridge = require('../../src/services/MCPClientBridge');
const NodeCache = require('node-cache');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

describe('MCPClientBridge Unit Tests', () => {
  let bridge;
  let mockAxios;

  beforeEach(() => {
    bridge = new MCPClientBridge('./data/test-mcp-data.json');
    mockAxios = new MockAdapter(axios);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('constructor', () => {
    test('should initialize with correct default properties', () => {
      expect(bridge.connectionPool).toBeInstanceOf(Map);
      expect(bridge.requestCache).toBeInstanceOf(NodeCache);
      expect(bridge.serverCapabilities).toBeInstanceOf(Map);
      expect(bridge.activeRequests).toBeInstanceOf(Map);
    });
  });

  describe('initialize', () => {
    test('should initialize services correctly', async () => {
      // Mock the storage and discovery service initialization
      jest.spyOn(bridge.storage, 'initialize').mockResolvedValue();
      jest.spyOn(bridge.discoveryService, 'loadServerIndex').mockResolvedValue();
      jest.spyOn(bridge.storage, 'updateAgentState').mockResolvedValue();
      jest.spyOn(bridge, 'loadServerConfigurations').mockResolvedValue();

      await bridge.initialize();

      expect(bridge.storage.initialize).toHaveBeenCalled();
      expect(bridge.discoveryService.loadServerIndex).toHaveBeenCalled();
      expect(bridge.storage.updateAgentState).toHaveBeenCalledWith({
        lastStartup: expect.any(String),
        status: 'running'
      });
      expect(bridge.loadServerConfigurations).toHaveBeenCalled();
    });

    test('should handle initialization errors', async () => {
      jest.spyOn(bridge.storage, 'initialize').mockRejectedValue(new Error('Storage init failed'));

      await expect(bridge.initialize()).rejects.toThrow('Storage init failed');
    });
  });

  describe('connectToServer', () => {
    test('should reuse existing connection if available', async () => {
      const mockConnection = axios.create();
      bridge.connectionPool.set('test-server', mockConnection);

      const result = await bridge.connectToServer('test-server', { url: 'http://test.com' });
      expect(result).toBe(mockConnection);
    });

    test('should create new connection if not available', async () => {
      const serverConfig = {
        url: 'http://test-server.com',
        timeout: 5000,
        headers: { 'X-Test': 'value' }
      };

      const result = await bridge.connectToServer('test-server', serverConfig);
      expect(result).toBeDefined();
      expect(bridge.connectionPool.get('test-server')).toBe(result);
    });

    test('should handle connection errors', async () => {
      const serverConfig = {
        url: 'http://invalid-url-that-does-not-exist.com',
        timeout: 100 // Very short timeout to fail quickly
      };

      await expect(bridge.connectToServer('test-server', serverConfig))
        .rejects.toThrow();
    });
  });

  describe('fetchServerCapabilities', () => {
    test('should fetch and cache server capabilities', async () => {
      const mockCapabilities = { tools: [{ name: 'test-tool', description: 'A test tool' }] };
      mockAxios.onGet('/capabilities').reply(200, mockCapabilities);

      const connection = axios.create({ baseURL: 'http://test.com' });
      const result = await bridge.fetchServerCapabilities('test-server', connection);

      expect(result).toEqual(mockCapabilities);
      expect(bridge.serverCapabilities.get('test-server')).toEqual(mockCapabilities);
    });

    test('should handle capability fetch errors gracefully', async () => {
      mockAxios.onGet('/capabilities').reply(500);

      const connection = axios.create({ baseURL: 'http://test.com' });
      const result = await bridge.fetchServerCapabilities('test-server', connection);

      expect(result).toBeNull();
    });
  });

  describe('parseRequest', () => {
    test('should parse request and return correct structure', async () => {
      // Mock the discovery service to return matching tools
      jest.spyOn(bridge.discoveryService, 'findToolsForQuery').mockResolvedValue([
        {
          serverId: 'test-server',
          serverName: 'Test Server',
          matchingTools: [{ name: 'read_file', description: 'Read a file' }]
        }
      ]);

      const result = await bridge.parseRequest('Read the README.md file');
      expect(result).toHaveProperty('serverId');
      expect(result).toHaveProperty('toolCall');
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('discoveryResults');
    });

    test('should handle request with no matching tools', async () => {
      // Mock the discovery service to return no matching tools
      jest.spyOn(bridge.discoveryService, 'findToolsForQuery').mockResolvedValue([]);
      // Mock the findTargetServer method to return a default server
      jest.spyOn(bridge, 'findTargetServer').mockResolvedValue({
        id: 'default-server',
        url: 'http://default.com'
      });
      // Mock the formatToolCall method
      jest.spyOn(bridge, 'formatToolCall').mockResolvedValue({
        tool_name: 'general',
        parameters: { request: 'Do something general' }
      });

      const result = await bridge.parseRequest('Do something general');
      expect(result).toHaveProperty('serverId');
      expect(result).toHaveProperty('toolCall');
      expect(result).toHaveProperty('intent');
      expect(result.discoveryResults).toHaveLength(0);
    });
  });

  describe('determineIntent', () => {
    test('should identify git operations intent', () => {
      const result = bridge.determineIntent('Show me the git status');
      expect(result).toBe('git_operations');
    });

    test('should identify file operations intent', () => {
      const result = bridge.determineIntent('Read the package.json file');
      expect(result).toBe('file_operations');
    });

    test('should identify search operations intent', () => {
      const result = bridge.determineIntent('Find all JavaScript files');
      expect(result).toBe('search_operations');
    });

    test('should identify general intent', () => {
      const result = bridge.determineIntent('Tell me about the weather');
      expect(result).toBe('general');
    });
  });

  describe('findTargetServer', () => {
    test('should find server that supports the intent', async () => {
      // Mock server capabilities to include a server that supports file operations
      bridge.serverCapabilities.set('file-server', {
        tools: [{ name: 'read_file', description: 'Read a file' }]
      });
      
      jest.spyOn(bridge, 'getServerConfig').mockResolvedValue({
        id: 'file-server',
        url: 'http://file-server.com'
      });

      const result = await bridge.findTargetServer('file_operations');
      expect(result).toBeDefined();
      expect(result.id).toBe('file-server');
    });

    test('should return default server if no specific server found', async () => {
      // Clear server capabilities to simulate no matching server
      bridge.serverCapabilities.clear();
      
      jest.spyOn(bridge, 'getDefaultServer').mockResolvedValue({
        id: 'default',
        url: 'http://default.com'
      });

      const result = await bridge.findTargetServer('unknown_operation');
      expect(result).toBeDefined();
      expect(result.id).toBe('default');
    });
  });

  describe('executeToolCall', () => {
    test('should execute tool call and return result', async () => {
      // Mock connection and response
      const mockConnection = axios.create();
      mockAxios.onPost('/execute').reply(200, { success: true, data: 'test result' });
      
      jest.spyOn(bridge, 'connectToServer').mockResolvedValue(mockConnection);
      jest.spyOn(bridge, 'generateCacheKey').mockReturnValue('test-cache-key');
      jest.spyOn(bridge, 'shouldCacheResult').mockReturnValue(true);

      const toolCall = {
        tool_name: 'test_tool',
        parameters: { file: 'test.txt' }
      };

      const result = await bridge.executeToolCall('test-server', toolCall);
      expect(result).toEqual({ success: true, data: 'test result' });
    });

    test('should return cached result if available', async () => {
      const cachedResult = { cached: true, data: 'cached result' };
      bridge.requestCache.set('test-cache-key', cachedResult);
      
      jest.spyOn(bridge, 'generateCacheKey').mockReturnValue('test-cache-key');

      const toolCall = {
        tool_name: 'test_tool',
        parameters: { file: 'test.txt' }
      };

      const result = await bridge.executeToolCall('test-server', toolCall);
      expect(result).toBe(cachedResult);
    });

    test('should handle execution errors', async () => {
      // Mock connection to throw an error
      const mockConnection = axios.create();
      mockAxios.onPost('/execute').reply(500, { error: 'Server error' });
      
      jest.spyOn(bridge, 'connectToServer').mockResolvedValue(mockConnection);
      jest.spyOn(bridge, 'generateCacheKey').mockReturnValue('test-cache-key');

      const toolCall = {
        tool_name: 'test_tool',
        parameters: { file: 'test.txt' }
      };

      await expect(bridge.executeToolCall('test-server', toolCall))
        .rejects.toThrow();
    });
  });

  describe('executeWithRetry', () => {
    test('should retry on failure and eventually succeed', async () => {
      // Mock the first call to fail and the second to succeed
      let callCount = 0;
      mockAxios.onPost('/execute').reply(() => {
        callCount++;
        if (callCount === 1) {
          return [500, { error: 'First attempt failed' }];
        }
        return [200, { success: true, attempt: callCount }];
      });

      const connection = axios.create();
      const toolCall = { tool_name: 'test_tool', parameters: {} };
      
      const result = await bridge.executeWithRetry(connection, toolCall, 'test-server');
      expect(result).toEqual({ success: true, attempt: 2 });
      expect(callCount).toBe(2);
    });

    test('should fail after max retries', async () => {
      mockAxios.onPost('/execute').reply(500, { error: 'Always fails' });

      const connection = axios.create();
      const toolCall = { tool_name: 'test_tool', parameters: {} };
      
      await expect(bridge.executeWithRetry(connection, toolCall, 'test-server'))
        .rejects.toThrow();
    });
  });

  describe('generateCacheKey', () => {
    test('should generate consistent cache key', () => {
      const toolCall = {
        tool_name: 'read_file',
        parameters: { path: '/test/file.txt' }
      };
      
      const key1 = bridge.generateCacheKey('server1', toolCall);
      const key2 = bridge.generateCacheKey('server1', toolCall);
      
      expect(key1).toBe(key2);
    });

    test('should generate different keys for different parameters', () => {
      const toolCall1 = {
        tool_name: 'read_file',
        parameters: { path: '/test/file1.txt' }
      };
      
      const toolCall2 = {
        tool_name: 'read_file',
        parameters: { path: '/test/file2.txt' }
      };
      
      const key1 = bridge.generateCacheKey('server1', toolCall1);
      const key2 = bridge.generateCacheKey('server1', toolCall2);
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('shouldCacheResult', () => {
    test('should cache idempotent operations', () => {
      const toolCall = {
        tool_name: 'read_file',
        parameters: {}
      };
      
      expect(bridge.shouldCacheResult(toolCall, {})).toBe(true);
    });

    test('should not cache non-idempotent operations', () => {
      const toolCall = {
        tool_name: 'write_file',
        parameters: {}
      };
      
      expect(bridge.shouldCacheResult(toolCall, {})).toBe(false);
    });
  });

  describe('processRequest', () => {
    test('should process request successfully', async () => {
      // Mock the necessary methods
      jest.spyOn(bridge, 'parseRequest').mockResolvedValue({
        serverId: 'test-server',
        toolCall: { tool_name: 'read_file', parameters: { path: 'test.txt' } },
        intent: 'file_operations',
        discoveryResults: []
      });
      
      jest.spyOn(bridge, 'executeToolCall').mockResolvedValue({
        success: true,
        content: 'file content'
      });
      
      jest.spyOn(bridge.storage, 'recordRequest').mockResolvedValue();
      jest.spyOn(bridge.storage, 'updateServerStats').mockResolvedValue();
      jest.spyOn(bridge.todoService, 'validateTodosForOperation').mockResolvedValue();
      jest.spyOn(bridge.todoService, 'updateTodoStatus').mockResolvedValue();

      const result = await bridge.processRequest('Read test.txt file');
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    test('should handle request processing errors', async () => {
      // Mock the necessary methods to throw an error
      jest.spyOn(bridge, 'parseRequest').mockRejectedValue(new Error('Parse error'));
      jest.spyOn(bridge.storage, 'recordRequest').mockResolvedValue();
      jest.spyOn(bridge.todoService, 'validateTodosForOperation').mockResolvedValue();
      jest.spyOn(bridge.todoService, 'updateTodoStatus').mockResolvedValue();

      const result = await bridge.processRequest('Invalid request');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Parse error');
    });
  });

  describe('getStats', () => {
    test('should return comprehensive statistics', async () => {
      // Mock the methods that getStats calls
      jest.spyOn(bridge, 'getMetrics').mockResolvedValue({ total: 10 });
      jest.spyOn(bridge, 'getCacheStats').mockResolvedValue({ hits: 5, misses: 2 });
      jest.spyOn(bridge.discoveryService, 'getIndexMetadata').mockResolvedValue({ serverCount: 3 });

      const stats = await bridge.getStats();
      expect(stats).toHaveProperty('connectionPoolSize');
      expect(stats).toHaveProperty('cachedRequests');
      expect(stats).toHaveProperty('activeRequests');
      expect(stats).toHaveProperty('serverCapabilities');
      expect(stats).toHaveProperty('metrics');
      expect(stats).toHaveProperty('cacheStats');
      expect(stats).toHaveProperty('discoveryStats');
    });
  });

  describe('getAllServers', () => {
    test('should delegate to discovery service', async () => {
      const mockServers = [{ id: 'server1', name: 'Server 1' }];
      jest.spyOn(bridge.discoveryService, 'getAllServers').mockResolvedValue(mockServers);

      const result = await bridge.getAllServers();
      expect(result).toEqual(mockServers);
    });
  });

  describe('getServersByCategory', () => {
    test('should delegate to discovery service', async () => {
      const mockServers = [{ id: 'server1', name: 'Server 1' }];
      jest.spyOn(bridge.discoveryService, 'getServersByCategory').mockResolvedValue(mockServers);

      const result = await bridge.getServersByCategory('AI');
      expect(result).toEqual(mockServers);
    });
  });

  describe('searchServers', () => {
    test('should delegate to discovery service', async () => {
      const mockServers = [{ id: 'server1', name: 'Server 1' }];
      jest.spyOn(bridge.discoveryService, 'searchServers').mockResolvedValue(mockServers);

      const result = await bridge.searchServers('search-term');
      expect(result).toEqual(mockServers);
    });
  });

  describe('findToolsForQuery', () => {
    test('should delegate to discovery service', async () => {
      const mockResults = [{ serverId: 'server1', matchingTools: [] }];
      jest.spyOn(bridge.discoveryService, 'findToolsForQuery').mockResolvedValue(mockResults);

      const result = await bridge.findToolsForQuery('query');
      expect(result).toEqual(mockResults);
    });
  });

  describe('getAllTools', () => {
    test('should delegate to discovery service', async () => {
      const mockTools = [{ serverId: 'server1', tool: { name: 'tool1' } }];
      jest.spyOn(bridge.discoveryService, 'getAllTools').mockResolvedValue(mockTools);

      const result = await bridge.getAllTools();
      expect(result).toEqual(mockTools);
    });
  });
});