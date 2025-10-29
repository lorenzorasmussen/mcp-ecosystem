// tests/e2e/bridge-e2e.test.js
const request = require('supertest');
const app = require('../../index'); // Main app
const MCPClientBridge = require('../../src/services/MCPClientBridge');
const ServerDiscoveryService = require('../../src/services/ServerDiscoveryService');
const ConfigService = require('../../src/services/ConfigService');
const path = require('path');

describe('End-to-End Tests for MCP Client Bridge', () => {
  let bridge;
  const testStoragePath = './data/test-mcp-data.json';

  beforeAll(async () => {
    // Initialize the bridge with test storage
    bridge = new MCPClientBridge(testStoragePath);
    await bridge.initialize();
    
    // Set the bridge in the app
    app.set('mcpBridge', bridge);
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('Complete Bridge Workflow', () => {
    test('should process a complete request from API to service to external call', async () => {
      // This test simulates a complete workflow:
      // 1. API receives request
      // 2. Bridge processes request
      // 3. Tool is identified and executed
      
      // Mock the discovery service to return a matching tool
      jest.spyOn(bridge.discoveryService, 'findToolsForQuery').mockResolvedValue([
        {
          serverId: 'test-server',
          serverName: 'Test Server',
          matchingTools: [{ name: 'read_file', description: 'Read a file' }]
        }
      ]);
      
      // Mock the connection to a server and tool execution
      const mockConnection = require('axios').create();
      const mockAxios = require('axios-mock-adapter');
      const mockAdapter = new mockAxios(mockConnection);
      
      // Mock the connectToServer method to return our mock connection
      jest.spyOn(bridge, 'connectToServer').mockResolvedValue(mockConnection);
      
      // Mock the server response for tool execution
      mockAdapter.onPost('/execute').reply(200, {
        success: true,
        content: 'File content from test file'
      });
      
      // Mock the formatToolCall method to return a proper tool call
      jest.spyOn(bridge, 'formatToolCall').mockResolvedValue({
        tool_name: 'read_file',
        parameters: { path: 'test.txt' }
      });
      
      // Make the API call
      const response = await request(app)
        .post('/api/mcp/process')
        .send({ request: 'Read the content of test.txt file' })
        .expect(200);
      
      // Verify the response
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('success', true);
      expect(response.body.result).toHaveProperty('content');
      
      // Cleanup
      mockAdapter.restore();
    });

    test('should handle server discovery and tool execution flow', async () => {
      // Test the flow: request -> discovery -> server selection -> execution
      
      // Mock server discovery
      const mockServers = [
        {
          id: 'file-server',
          name: 'File Operations Server',
          category: 'File',
          tools: [
            { name: 'read_file', description: 'Read a file' },
            { name: 'write_file', description: 'Write a file' }
          ]
        }
      ];
      
      jest.spyOn(bridge.discoveryService, 'searchServers').mockResolvedValue(mockServers);
      jest.spyOn(bridge.discoveryService, 'findToolsForQuery').mockResolvedValue([
        {
          serverId: 'file-server',
          serverName: 'File Operations Server',
          matchingTools: [{ name: 'read_file', description: 'Read a file' }]
        }
      ]);
      
      // Mock the connection and execution
      const mockConnection = require('axios').create();
      const mockAxios = require('axios-mock-adapter');
      const mockAdapter = new mockAxios(mockConnection);
      
      jest.spyOn(bridge, 'connectToServer').mockResolvedValue(mockConnection);
      mockAdapter.onPost('/execute').reply(200, { success: true, data: 'test result' });
      jest.spyOn(bridge, 'formatToolCall').mockResolvedValue({
        tool_name: 'read_file',
        parameters: { path: 'example.txt' }
      });
      
      // Test server discovery API
      const discoveryResponse = await request(app)
        .get('/api/mcp/discovery/servers/search/file')
        .expect(200);
      
      expect(discoveryResponse.body.servers).toHaveLength(1);
      expect(discoveryResponse.body.keyword).toBe('file');
      
      // Test tool discovery API
      const toolResponse = await request(app)
        .post('/api/mcp/discovery/tools/search')
        .send({ query: 'read file' })
        .expect(200);
      
      expect(toolResponse.body.results).toHaveLength(1);
      expect(toolResponse.body.results[0].serverId).toBe('file-server');
      
      // Test processing a request
      const processResponse = await request(app)
        .post('/api/mcp/process')
        .send({ request: 'Read the example.txt file' })
        .expect(200);
      
      expect(processResponse.body).toHaveProperty('success', true);
      
      // Cleanup
      mockAdapter.restore();
    });

    test('should maintain consistent state across multiple operations', async () => {
      // Test that the bridge maintains state correctly across multiple operations
      
      // Mock consistent responses
      jest.spyOn(bridge.discoveryService, 'findToolsForQuery').mockResolvedValue([
        {
          serverId: 'state-test-server',
          serverName: 'State Test Server',
          matchingTools: [{ name: 'get_state', description: 'Get current state' }]
        }
      ]);
      
      const mockConnection = require('axios').create();
      const mockAxios = require('axios-mock-adapter');
      const mockAdapter = new mockAxios(mockConnection);
      
      jest.spyOn(bridge, 'connectToServer').mockResolvedValue(mockConnection);
      mockAdapter.onPost('/execute').reply(200, { success: true, state: 'active' });
      jest.spyOn(bridge, 'formatToolCall').mockResolvedValue({
        tool_name: 'get_state',
        parameters: {}
      });
      
      // First operation
      const response1 = await request(app)
        .post('/api/mcp/process')
        .send({ request: 'Get current state' })
        .expect(200);
      
      expect(response1.body).toHaveProperty('success', true);
      
      // Get stats to verify state is maintained
      const statsResponse = await request(app)
        .get('/api/mcp/stats')
        .expect(200);
      
      expect(statsResponse.body).toHaveProperty('connectionPoolSize');
      expect(statsResponse.body).toHaveProperty('cachedRequests');
      expect(statsResponse.body).toHaveProperty('serverCapabilities');
      
      // Verify metrics have been updated
      expect(statsResponse.body.metrics).toHaveProperty('totalRequests');
      expect(statsResponse.body.metrics).toHaveProperty('successfulRequests');
      
      // Cleanup
      mockAdapter.restore();
    });
  });

  describe('Configuration Management E2E', () => {
    test('should handle server configuration lifecycle', async () => {
      // Test adding, retrieving, updating, and removing server configurations
      
      const testServer = {
        id: 'e2e-test-server',
        name: 'E2E Test Server',
        url: 'http://e2e-test-server.com',
        description: 'Test server for E2E tests'
      };
      
      // Add server
      const addResponse = await request(app)
        .post('/api/config/servers')
        .send(testServer)
        .expect(201);
      
      expect(addResponse.body).toHaveProperty('message');
      expect(addResponse.body.server.id).toBe('e2e-test-server');
      
      // Get all servers
      const getAllResponse = await request(app)
        .get('/api/config/servers')
        .expect(200);
      
      const serverExists = getAllResponse.body.servers.some(s => s.id === 'e2e-test-server');
      expect(serverExists).toBe(true);
      
      // Get specific server
      const getResponse = await request(app)
        .get('/api/config/servers/e2e-test-server')
        .expect(200);
      
      expect(getResponse.body.server.id).toBe('e2e-test-server');
      
      // Update server
      const updateData = { name: 'Updated E2E Test Server' };
      const updateResponse = await request(app)
        .put('/api/config/servers/e2e-test-server')
        .send(updateData)
        .expect(200);
      
      expect(updateResponse.body.server.name).toBe('Updated E2E Test Server');
      
      // Remove server
      const deleteResponse = await request(app)
        .delete('/api/config/servers/e2e-test-server')
        .expect(200);
      
      expect(deleteResponse.body).toHaveProperty('message');
      
      // Verify server is removed
      await request(app)
        .get('/api/config/servers/e2e-test-server')
        .expect(404);
    });

    test('should handle global settings management', async () => {
      // Test getting and updating global settings
      
      // Get initial settings
      const getSettingsResponse = await request(app)
        .get('/api/config/settings')
        .expect(200);
      
      expect(getSettingsResponse.body).toHaveProperty('settings');
      expect(getSettingsResponse.body.settings).toHaveProperty('defaultTimeout');
      
      // Update settings
      const newSettings = { defaultTimeout: 45000, maxRetries: 5 };
      const updateSettingsResponse = await request(app)
        .put('/api/config/settings')
        .send(newSettings)
        .expect(200);
      
      expect(updateSettingsResponse.body).toHaveProperty('message');
      
      // Verify settings were updated
      const verifySettingsResponse = await request(app)
        .get('/api/config/settings')
        .expect(200);
      
      expect(verifySettingsResponse.body.settings.defaultTimeout).toBe(45000);
      expect(verifySettingsResponse.body.settings.maxRetries).toBe(5);
    });
  });

  describe('Discovery and Search E2E', () => {
    test('should handle comprehensive discovery workflows', async () => {
      // Mock discovery service responses
      const mockServers = [
        {
          id: 'ai-server',
          name: 'AI Processing Server',
          category: 'AI',
          description: 'Handles AI operations',
          tools: [
            { name: 'generate_text', description: 'Generate text content' },
            { name: 'analyze_sentiment', description: 'Analyze sentiment' }
          ]
        },
        {
          id: 'file-server',
          name: 'File Operations Server',
          category: 'File',
          description: 'Handles file operations',
          tools: [
            { name: 'read_file', description: 'Read a file' },
            { name: 'write_file', description: 'Write a file' }
          ]
        }
      ];
      
      jest.spyOn(bridge.discoveryService, 'getAllServers').mockResolvedValue(mockServers);
      jest.spyOn(bridge.discoveryService, 'getServersByCategory').mockImplementation((category) => {
        return mockServers.filter(s => s.category.toLowerCase() === category.toLowerCase());
      });
      jest.spyOn(bridge.discoveryService, 'searchServers').mockImplementation((keyword) => {
        return mockServers.filter(s => 
          s.name.toLowerCase().includes(keyword.toLowerCase()) ||
          s.description.toLowerCase().includes(keyword.toLowerCase())
        );
      });
      jest.spyOn(bridge.discoveryService, 'findToolsForQuery').mockImplementation((query) => {
        const results = [];
        for (const server of mockServers) {
          const matchingTools = server.tools.filter(tool => 
            tool.name.toLowerCase().includes(query.toLowerCase()) ||
            tool.description.toLowerCase().includes(query.toLowerCase())
          );
          
          if (matchingTools.length > 0) {
            results.push({
              serverId: server.id,
              serverName: server.name,
              serverDescription: server.description,
              category: server.category,
              matchingTools: matchingTools
            });
          }
        }
        return results;
      });
      
      // Test getting all servers
      const allServersResponse = await request(app)
        .get('/api/mcp/discovery/servers')
        .expect(200);
      
      expect(allServersResponse.body.servers).toHaveLength(2);
      
      // Test getting servers by category
      const aiServersResponse = await request(app)
        .get('/api/mcp/discovery/servers/category/AI')
        .expect(200);
      
      expect(aiServersResponse.body.servers).toHaveLength(1);
      expect(aiServersResponse.body.category).toBe('AI');
      
      // Test searching servers
      const searchResponse = await request(app)
        .get('/api/mcp/discovery/servers/search/ai')
        .expect(200);
      
      expect(searchResponse.body.servers).toHaveLength(1);
      expect(searchResponse.body.keyword).toBe('ai');
      
      // Test searching tools
      const toolSearchResponse = await request(app)
        .post('/api/mcp/discovery/tools/search')
        .send({ query: 'read' })
        .expect(200);
      
      expect(toolSearchResponse.body.results).toHaveLength(1);
      expect(toolSearchResponse.body.results[0].matchingTools[0].name).toBe('read_file');
      
      // Test getting all tools
      const allToolsResponse = await request(app)
        .get('/api/mcp/discovery/tools')
        .expect(200);
      
      expect(allToolsResponse.body.tools).toHaveLength(4); // 2 servers * 2 tools each
      
      // Test getting index metadata
      const metadataResponse = await request(app)
        .get('/api/mcp/discovery/index/metadata')
        .expect(200);
      
      expect(metadataResponse.body.metadata).toHaveProperty('serverCount');
      expect(metadataResponse.body.metadata).toHaveProperty('totalTools');
      expect(metadataResponse.body.metadata).toHaveProperty('lastUpdated');
    });
  });

  describe('Health and Monitoring E2E', () => {
    test('should provide comprehensive health and metrics information', async () => {
      // Test health endpoint
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);
      
      expect(healthResponse.body).toHaveProperty('status', 'OK');
      expect(healthResponse.body).toHaveProperty('timestamp');
      expect(healthResponse.body).toHaveProperty('uptime');
      expect(typeof healthResponse.body.uptime).toBe('number');
      
      // Test stats endpoint (this should include various metrics)
      const statsResponse = await request(app)
        .get('/api/mcp/stats')
        .expect(200);
      
      expect(statsResponse.body).toHaveProperty('connectionPoolSize');
      expect(statsResponse.body).toHaveProperty('cachedRequests');
      expect(statsResponse.body).toHaveProperty('activeRequests');
      expect(statsResponse.body).toHaveProperty('serverCapabilities');
      expect(statsResponse.body).toHaveProperty('metrics');
      expect(statsResponse.body).toHaveProperty('cacheStats');
      expect(statsResponse.body).toHaveProperty('discoveryStats');
      
      // Verify specific metrics exist
      expect(statsResponse.body.metrics).toHaveProperty('totalRequests');
      expect(statsResponse.body.metrics).toHaveProperty('successfulRequests');
      expect(statsResponse.body.metrics).toHaveProperty('failedRequests');
      expect(statsResponse.body.metrics).toHaveProperty('agentState');
    });
  });
});