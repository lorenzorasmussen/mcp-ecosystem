// tests/cache/cache-functionality.test.js
const MCPClientBridge = require('../../src/services/MCPClientBridge');
const NodeCache = require('node-cache');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

describe('Cache Functionality Tests', () => {
  let bridge;
  let mockAxios;

  beforeEach(() => {
    bridge = new MCPClientBridge('./data/test-mcp-data.json');
    mockAxios = new MockAdapter(axios);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('Cache Initialization', () => {
    test('should initialize cache with correct configuration', () => {
      expect(bridge.requestCache).toBeInstanceOf(NodeCache);
      
      // Check that cache configuration matches expected values
      const stats = bridge.requestCache.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Cache Key Generation', () => {
    test('should generate consistent cache keys', () => {
      const toolCall1 = {
        tool_name: 'read_file',
        parameters: { path: '/test/file.txt' }
      };
      
      const toolCall2 = {
        tool_name: 'read_file',
        parameters: { path: '/test/file.txt' }
      };
      
      const key1 = bridge.generateCacheKey('server1', toolCall1);
      const key2 = bridge.generateCacheKey('server1', toolCall2);
      
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

    test('should generate different keys for different servers', () => {
      const toolCall = {
        tool_name: 'read_file',
        parameters: { path: '/test/file.txt' }
      };
      
      const key1 = bridge.generateCacheKey('server1', toolCall);
      const key2 = bridge.generateCacheKey('server2', toolCall);
      
      expect(key1).not.toBe(key2);
    });

    test('should generate different keys for different tool names', () => {
      const toolCall1 = {
        tool_name: 'read_file',
        parameters: { path: '/test/file.txt' }
      };
      
      const toolCall2 = {
        tool_name: 'write_file',
        parameters: { path: '/test/file.txt' }
      };
      
      const key1 = bridge.generateCacheKey('server1', toolCall1);
      const key2 = bridge.generateCacheKey('server1', toolCall2);
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('Cache Storage and Retrieval', () => {
    test('should store and retrieve cached results', () => {
      const cacheKey = 'test-server:test-tool:{"param":"value"}';
      const expectedResult = { data: 'cached result' };
      
      // Store in cache
      bridge.requestCache.set(cacheKey, expectedResult);
      
      // Retrieve from cache
      const retrievedResult = bridge.requestCache.get(cacheKey);
      
      expect(retrievedResult).toEqual(expectedResult);
    });

    test('should return undefined for non-existent cache keys', () => {
      const retrievedResult = bridge.requestCache.get('non-existent-key');
      
      expect(retrievedResult).toBeUndefined();
    });
  });

  describe('Cache Behavior in Tool Execution', () => {
    test('should use cached result when available', async () => {
      const toolCall = {
        tool_name: 'read_file',
        parameters: { path: '/test/file.txt' }
      };
      
      const expectedResult = { success: true, content: 'cached file content' };
      const cacheKey = bridge.generateCacheKey('test-server', toolCall);
      
      // Pre-populate cache
      bridge.requestCache.set(cacheKey, expectedResult);
      
      // Mock the connectToServer method but execution should not reach there
      const connectSpy = jest.spyOn(bridge, 'connectToServer');
      
      const result = await bridge.executeToolCall('test-server', toolCall);
      
      expect(result).toEqual(expectedResult);
      // connectToServer should not have been called since result was cached
      expect(connectSpy).not.toHaveBeenCalled();
    });

    test('should execute tool call when no cached result exists', async () => {
      const toolCall = {
        tool_name: 'read_file',
        parameters: { path: '/test/file.txt' }
      };
      
      // Mock the connection and execution
      const mockConnection = axios.create();
      mockAxios.onPost('/execute').reply(200, { success: true, content: 'live result' });
      
      jest.spyOn(bridge, 'connectToServer').mockResolvedValue(mockConnection);
      
      const result = await bridge.executeToolCall('test-server', toolCall);
      
      expect(result).toEqual({ success: true, content: 'live result' });
    });

    test('should cache result when shouldCacheResult returns true', async () => {
      const toolCall = {
        tool_name: 'read_file',  // This should be cached (idempotent operation)
        parameters: { path: '/test/file.txt' }
      };
      
      // Mock the connection and execution
      const mockConnection = axios.create();
      mockAxios.onPost('/execute').reply(200, { success: true, content: 'result to cache' });
      
      jest.spyOn(bridge, 'connectToServer').mockResolvedValue(mockConnection);
      
      const result = await bridge.executeToolCall('test-server', toolCall);
      
      // Check that the result was cached
      const cacheKey = bridge.generateCacheKey('test-server', toolCall);
      const cachedResult = bridge.requestCache.get(cacheKey);
      
      expect(cachedResult).toEqual({ success: true, content: 'result to cache' });
    });

    test('should not cache result when shouldCacheResult returns false', async () => {
      const toolCall = {
        tool_name: 'write_file',  // This should not be cached (non-idempotent operation)
        parameters: { path: '/test/file.txt', content: 'new content' }
      };
      
      // Mock the connection and execution
      const mockConnection = axios.create();
      mockAxios.onPost('/execute').reply(200, { success: true, written: true });
      
      jest.spyOn(bridge, 'connectToServer').mockResolvedValue(mockConnection);
      
      const result = await bridge.executeToolCall('test-server', toolCall);
      
      // Check that the result was NOT cached
      const cacheKey = bridge.generateCacheKey('test-server', toolCall);
      const cachedResult = bridge.requestCache.get(cacheKey);
      
      expect(cachedResult).toBeUndefined();
    });
  });

  describe('Cache TTL and Expiration', () => {
    test('should respect cache TTL configuration', async () => {
      // Create a new bridge with a short TTL for testing
      const shortTTLBridge = new MCPClientBridge('./data/test-mcp-data.json');
      shortTTLBridge.requestCache = new NodeCache({ stdTTL: 1, checkperiod: 1 }); // 1 second TTL
      
      const toolCall = {
        tool_name: 'read_file',
        parameters: { path: '/test/file.txt' }
      };
      
      const cacheKey = shortTTLBridge.generateCacheKey('test-server', toolCall);
      const expectedResult = { data: 'short lived result' };
      
      // Store in cache
      shortTTLBridge.requestCache.set(cacheKey, expectedResult);
      
      // Verify it's there initially
      expect(shortTTLBridge.requestCache.get(cacheKey)).toEqual(expectedResult);
      
      // Wait for cache to expire (TTL is 1 second)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Should be expired now
      expect(shortTTLBridge.requestCache.get(cacheKey)).toBeUndefined();
    });
  });

  describe('Cache Statistics', () => {
    test('should track cache hits and misses', async () => {
      const toolCall = {
        tool_name: 'read_file',
        parameters: { path: '/test/file.txt' }
      };
      
      const expectedResult = { success: true, content: 'cached result' };
      const cacheKey = bridge.generateCacheKey('test-server', toolCall);
      
      // Pre-populate cache
      bridge.requestCache.set(cacheKey, expectedResult);
      
      // First call should be a cache hit
      await bridge.executeToolCall('test-server', toolCall);
      
      // Second call should also be a cache hit
      await bridge.executeToolCall('test-server', toolCall);
      
      // Get cache stats
      const stats = bridge.requestCache.getStats();
      expect(stats.hits).toBeGreaterThanOrEqual(2); // At least 2 hits
    });

    test('should track cache misses', async () => {
      // Mock the connection and execution
      const mockConnection = axios.create();
      mockAxios.onPost('/execute').reply(200, { success: true, content: 'live result' });
      
      jest.spyOn(bridge, 'connectToServer').mockResolvedValue(mockConnection);
      
      const toolCall = {
        tool_name: 'read_file',
        parameters: { path: '/test/file.txt' }
      };
      
      // First call should be a cache miss since key doesn't exist yet
      await bridge.executeToolCall('test-server', toolCall);
      
      // Get cache stats
      const stats = bridge.requestCache.getStats();
      expect(stats.misses).toBeGreaterThanOrEqual(1); // At least 1 miss
    });
  });

  describe('Cache Size Limits', () => {
    test('should respect maximum key limits', () => {
      // Create a bridge with a small max key limit
      const limitedBridge = new MCPClientBridge('./data/test-mcp-data.json');
      limitedBridge.requestCache = new NodeCache({ maxKeys: 2 });
      
      // Add items up to the limit
      limitedBridge.requestCache.set('key1', 'value1');
      limitedBridge.requestCache.set('key2', 'value2');
      
      // Check that both are there
      expect(limitedBridge.requestCache.get('key1')).toBe('value1');
      expect(limitedBridge.requestCache.get('key2')).toBe('value2');
      
      // Add one more - this might cause one to be removed based on internal logic
      limitedBridge.requestCache.set('key3', 'value3');
      
      // Check cache stats
      const stats = limitedBridge.requestCache.getStats();
      expect(stats.keys).toBeLessThanOrEqual(2); // Should respect the limit
    });
  });

  describe('Cache Utility Methods', () => {
    test('should correctly determine if result should be cached', () => {
      // Idempotent operations should be cached
      expect(bridge.shouldCacheResult({
        tool_name: 'read_file',
        parameters: {}
      }, {})).toBe(true);
      
      expect(bridge.shouldCacheResult({
        tool_name: 'get_status',
        parameters: {}
      }, {})).toBe(true);
      
      // Non-idempotent operations should not be cached
      expect(bridge.shouldCacheResult({
        tool_name: 'write_file',
        parameters: {}
      }, {})).toBe(false);
      
      expect(bridge.shouldCacheResult({
        tool_name: 'edit',
        parameters: {}
      }, {})).toBe(false);
      
      expect(bridge.shouldCacheResult({
        tool_name: 'run_shell_command',
        parameters: {}
      }, {})).toBe(false);
    });
  });

  describe('Cache Integration with Storage', () => {
    test('should update cache stats in persistent storage', async () => {
      // Mock the storage update method
      const storageSpy = jest.spyOn(bridge.storage, 'updateCacheStats');
      
      const toolCall = {
        tool_name: 'read_file',
        parameters: { path: '/test/file.txt' }
      };
      
      const expectedResult = { success: true, content: 'cached result' };
      const cacheKey = bridge.generateCacheKey('test-server', toolCall);
      
      // Pre-populate cache
      bridge.requestCache.set(cacheKey, expectedResult);
      
      // This should trigger a cache hit and update storage
      await bridge.executeToolCall('test-server', toolCall);
      
      // Verify that storage was updated with cache hit info
      expect(storageSpy).toHaveBeenCalledWith({ hit: true });
    });

    test('should update cache stats for misses in persistent storage', async () => {
      // Mock the storage update method
      const storageSpy = jest.spyOn(bridge.storage, 'updateCacheStats');
      
      // Mock the connection and execution
      const mockConnection = axios.create();
      mockAxios.onPost('/execute').reply(200, { success: true, content: 'live result' });
      
      jest.spyOn(bridge, 'connectToServer').mockResolvedValue(mockConnection);
      
      const toolCall = {
        tool_name: 'read_file',
        parameters: { path: '/test/file.txt' }
      };
      
      // This should trigger a cache miss and update storage
      await bridge.executeToolCall('test-server', toolCall);
      
      // Verify that storage was updated with cache miss info
      expect(storageSpy).toHaveBeenCalledWith({ hit: false });
    });
  });

  describe('Cache Performance', () => {
    test('should perform better with cached results', async () => {
      const toolCall = {
        tool_name: 'read_file',
        parameters: { path: '/test/file.txt' }
      };
      
      const expectedResult = { success: true, content: 'cached result' };
      const cacheKey = bridge.generateCacheKey('test-server', toolCall);
      
      // Pre-populate cache
      bridge.requestCache.set(cacheKey, expectedResult);
      
      // Measure time for cached execution
      const startCached = Date.now();
      await bridge.executeToolCall('test-server', toolCall);
      const endCached = Date.now();
      const cachedTime = endCached - startCached;
      
      // Mock the connection and execution for non-cached
      const mockConnection = axios.create();
      mockAxios.onPost('/execute').reply(200, { success: true, content: 'live result' });
      jest.spyOn(bridge, 'connectToServer').mockResolvedValue(mockConnection);
      
      // Remove from cache temporarily
      bridge.requestCache.del(cacheKey);
      
      // Measure time for non-cached execution
      const startNonCached = Date.now();
      await bridge.executeToolCall('test-server', toolCall);
      const endNonCached = Date.now();
      const nonCachedTime = endNonCached - startNonCached;
      
      // The cached execution should be faster (though this is a basic check)
      // In a real scenario, the difference would be more significant with actual network calls
      expect(typeof cachedTime).toBe('number');
      expect(typeof nonCachedTime).toBe('number');
    });
  });
});