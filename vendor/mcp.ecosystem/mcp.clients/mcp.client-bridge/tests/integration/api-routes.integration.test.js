// tests/integration/api-routes.integration.test.js
const request = require('supertest');
const express = require('express');
const app = require('../../index'); // Main app
const MCPClientBridge = require('../../src/services/MCPClientBridge');
const ServerDiscoveryService = require('../../src/services/ServerDiscoveryService');
const discoveryRoutes = require('../../src/routes/discoveryRoutes');

describe('API Routes Integration Tests', () => {
  let server;
  let bridge;

  beforeAll(async () => {
    // Create a bridge instance and initialize it
    bridge = new MCPClientBridge('./data/test-mcp-data.json');
    await bridge.initialize();
    
    // Set the bridge in the app
    app.set('mcpBridge', bridge);
    
    // Set the bridge in the discovery routes
    discoveryRoutes.setClientBridge(bridge);
    
    // Start the server
    server = app.listen(3001, () => {
      console.log('Test server running on port 3001');
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('MCP Routes Integration', () => {
    describe('POST /api/mcp/process', () => {
      test('should process a natural language request successfully', async () => {
        // Mock the parseRequest and executeToolCall methods to avoid external dependencies
        jest.spyOn(bridge, 'parseRequest').mockResolvedValue({
          serverId: 'test-server',
          toolCall: { tool_name: 'read_file', parameters: { path: 'test.txt' } },
          intent: 'file_operations',
          discoveryResults: []
        });
        
        jest.spyOn(bridge, 'executeToolCall').mockResolvedValue({
          success: true,
          content: 'test file content'
        });

        const response = await request(app)
          .post('/api/mcp/process')
          .send({ request: 'Read the test.txt file' })
          .expect(200);
          
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('result');
      });

      test('should return 400 for missing request field', async () => {
        const response = await request(app)
          .post('/api/mcp/process')
          .send({})
          .expect(400);
          
        expect(response.body).toHaveProperty('error');
      });

      test('should handle processing errors', async () => {
        // Mock the parseRequest to throw an error
        jest.spyOn(bridge, 'parseRequest').mockRejectedValue(new Error('Parse error'));

        const response = await request(app)
          .post('/api/mcp/process')
          .send({ request: 'Invalid request' })
          .expect(500);
          
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/mcp/stats', () => {
      test('should return bridge statistics', async () => {
        const response = await request(app)
          .get('/api/mcp/stats')
          .expect(200);
          
        expect(response.body).toHaveProperty('connectionPoolSize');
        expect(response.body).toHaveProperty('cachedRequests');
        expect(response.body).toHaveProperty('activeRequests');
        expect(response.body).toHaveProperty('serverCapabilities');
        expect(response.body).toHaveProperty('metrics');
        expect(response.body).toHaveProperty('cacheStats');
        expect(response.body).toHaveProperty('discoveryStats');
      });
    });

    describe('POST /api/mcp/test-connection', () => {
      test('should test server connection successfully', async () => {
        // Mock the connectToServer method to avoid actual network calls
        jest.spyOn(bridge, 'connectToServer').mockResolvedValue({});

        const response = await request(app)
          .post('/api/mcp/test-connection')
          .send({
            serverId: 'test-server',
            serverConfig: { url: 'http://test.com' }
          })
          .expect(200);
          
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
      });

      test('should return 400 for missing serverId or serverConfig', async () => {
        const response = await request(app)
          .post('/api/mcp/test-connection')
          .send({})
          .expect(400);
          
        expect(response.body).toHaveProperty('error');
      });

      test('should handle connection test errors', async () => {
        // Mock the connectToServer method to throw an error
        jest.spyOn(bridge, 'connectToServer').mockRejectedValue(new Error('Connection failed'));

        const response = await request(app)
          .post('/api/mcp/test-connection')
          .send({
            serverId: 'test-server',
            serverConfig: { url: 'http://invalid.com' }
          })
          .expect(500);
          
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/mcp/server/:serverId/capabilities', () => {
      test('should return server capabilities', async () => {
        // Mock the fetchServerCapabilities method
        jest.spyOn(bridge, 'fetchServerCapabilities').mockResolvedValue({
          tools: [{ name: 'test-tool', description: 'A test tool' }]
        });

        const response = await request(app)
          .get('/api/mcp/server/test-server/capabilities')
          .expect(200);
          
        expect(response.body).toHaveProperty('serverId');
        expect(response.body).toHaveProperty('capabilities');
      });

      test('should return 404 for non-existent server', async () => {
        // Mock the getServer method to return null
        jest.spyOn(require('../../src/services/ConfigService'), 'getServer').mockReturnValue(null);

        const response = await request(app)
          .get('/api/mcp/server/non-existent/capabilities')
          .expect(404);
          
        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Discovery Routes Integration', () => {
    describe('GET /api/mcp/discovery/servers', () => {
      test('should return all servers', async () => {
        // Mock the getAllServers method
        jest.spyOn(bridge, 'getAllServers').mockResolvedValue([
          { id: 'server1', name: 'Server 1' },
          { id: 'server2', name: 'Server 2' }
        ]);

        const response = await request(app)
          .get('/api/mcp/discovery/servers')
          .expect(200);
          
        expect(response.body).toHaveProperty('servers');
        expect(response.body.servers).toHaveLength(2);
      });
    });

    describe('GET /api/mcp/discovery/servers/:serverId', () => {
      test('should return specific server', async () => {
        // Mock the getServerById method
        jest.spyOn(bridge.discoveryService, 'getServerById').mockResolvedValue({
          id: 'test-server',
          name: 'Test Server'
        });

        const response = await request(app)
          .get('/api/mcp/discovery/servers/test-server')
          .expect(200);
          
        expect(response.body).toHaveProperty('server');
        expect(response.body.server.id).toBe('test-server');
      });

      test('should return 404 for non-existent server', async () => {
        // Mock the getServerById method to return null
        jest.spyOn(bridge.discoveryService, 'getServerById').mockResolvedValue(null);

        const response = await request(app)
          .get('/api/mcp/discovery/servers/non-existent')
          .expect(404);
          
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/mcp/discovery/servers/category/:category', () => {
      test('should return servers by category', async () => {
        // Mock the getServersByCategory method
        jest.spyOn(bridge, 'getServersByCategory').mockResolvedValue([
          { id: 'server1', name: 'Server 1', category: 'AI' }
        ]);

        const response = await request(app)
          .get('/api/mcp/discovery/servers/category/AI')
          .expect(200);
          
        expect(response.body).toHaveProperty('servers');
        expect(response.body).toHaveProperty('category');
        expect(response.body.servers).toHaveLength(1);
      });
    });

    describe('GET /api/mcp/discovery/servers/search/:keyword', () => {
      test('should return servers matching keyword', async () => {
        // Mock the searchServers method
        jest.spyOn(bridge, 'searchServers').mockResolvedValue([
          { id: 'server1', name: 'Gemini Server' }
        ]);

        const response = await request(app)
          .get('/api/mcp/discovery/servers/search/gemini')
          .expect(200);
          
        expect(response.body).toHaveProperty('servers');
        expect(response.body).toHaveProperty('keyword');
        expect(response.body.servers).toHaveLength(1);
      });
    });

    describe('POST /api/mcp/discovery/tools/search', () => {
      test('should return tools matching query', async () => {
        // Mock the findToolsForQuery method
        jest.spyOn(bridge, 'findToolsForQuery').mockResolvedValue([
          {
            serverId: 'server1',
            serverName: 'Server 1',
            matchingTools: [{ name: 'read_file', description: 'Read a file' }]
          }
        ]);

        const response = await request(app)
          .post('/api/mcp/discovery/tools/search')
          .send({ query: 'read file' })
          .expect(200);
          
        expect(response.body).toHaveProperty('results');
        expect(response.body).toHaveProperty('query');
        expect(response.body.results).toHaveLength(1);
      });

      test('should return 400 for missing query', async () => {
        const response = await request(app)
          .post('/api/mcp/discovery/tools/search')
          .send({})
          .expect(400);
          
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/mcp/discovery/tools', () => {
      test('should return all tools', async () => {
        // Mock the getAllTools method
        jest.spyOn(bridge, 'getAllTools').mockResolvedValue([
          { serverId: 'server1', tool: { name: 'tool1' } }
        ]);

        const response = await request(app)
          .get('/api/mcp/discovery/tools')
          .expect(200);
          
        expect(response.body).toHaveProperty('tools');
        expect(response.body.tools).toHaveLength(1);
      });
    });

    describe('GET /api/mcp/discovery/index/metadata', () => {
      test('should return index metadata', async () => {
        // Mock the getIndexMetadata method
        jest.spyOn(bridge.discoveryService, 'getIndexMetadata').mockResolvedValue({
          serverCount: 5,
          totalTools: 10,
          lastUpdated: new Date().toISOString()
        });

        const response = await request(app)
          .get('/api/mcp/discovery/index/metadata')
          .expect(200);
          
        expect(response.body).toHaveProperty('metadata');
        expect(response.body.metadata).toHaveProperty('serverCount');
        expect(response.body.metadata).toHaveProperty('totalTools');
        expect(response.body.metadata).toHaveProperty('lastUpdated');
      });
    });
  });

  describe('Config Routes Integration', () => {
    describe('GET /api/config/servers', () => {
      test('should return all server configurations', async () => {
        // Mock the getServers method
        const configService = require('../../src/services/ConfigService');
        jest.spyOn(configService, 'getServers').mockReturnValue([
          { id: 'server1', name: 'Server 1' },
          { id: 'server2', name: 'Server 2' }
        ]);

        const response = await request(app)
          .get('/api/config/servers')
          .expect(200);
          
        expect(response.body).toHaveProperty('servers');
        expect(response.body.servers).toHaveLength(2);
      });
    });

    describe('GET /api/config/servers/:serverId', () => {
      test('should return specific server configuration', async () => {
        // Mock the getServer method
        const configService = require('../../src/services/ConfigService');
        jest.spyOn(configService, 'getServer').mockReturnValue({
          id: 'test-server',
          name: 'Test Server'
        });

        const response = await request(app)
          .get('/api/config/servers/test-server')
          .expect(200);
          
        expect(response.body).toHaveProperty('server');
        expect(response.body.server.id).toBe('test-server');
      });

      test('should return 404 for non-existent server', async () => {
        // Mock the getServer method to return undefined
        const configService = require('../../src/services/ConfigService');
        jest.spyOn(configService, 'getServer').mockReturnValue(undefined);

        const response = await request(app)
          .get('/api/config/servers/non-existent')
          .expect(404);
          
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('POST /api/config/servers', () => {
      test('should add a new server configuration', async () => {
        // Mock the addServer method
        const configService = require('../../src/services/ConfigService');
        jest.spyOn(configService, 'normalizeServerConfig').mockReturnValue({
          id: 'new-server',
          name: 'New Server',
          url: 'http://new-server.com'
        });
        jest.spyOn(configService, 'addServer').mockResolvedValue();

        const response = await request(app)
          .post('/api/config/servers')
          .send({
            id: 'new-server',
            name: 'New Server',
            url: 'http://new-server.com'
          })
          .expect(201);
          
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('server');
        expect(response.body.server.id).toBe('new-server');
      });

      test('should return 400 for invalid server configuration', async () => {
        const response = await request(app)
          .post('/api/config/servers')
          .send({
            id: 'invalid-server'
            // Missing URL
          })
          .expect(400);
          
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('PUT /api/config/servers/:serverId', () => {
      test('should update existing server configuration', async () => {
        // Mock the updateServer method
        const configService = require('../../src/services/ConfigService');
        jest.spyOn(configService, 'normalizeServerConfig').mockReturnValue({
          id: 'existing-server',
          name: 'Updated Server',
          url: 'http://updated.com'
        });
        jest.spyOn(configService, 'updateServer').mockResolvedValue();

        const response = await request(app)
          .put('/api/config/servers/existing-server')
          .send({
            name: 'Updated Server',
            url: 'http://updated.com'
          })
          .expect(200);
          
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('server');
        expect(response.body.server.name).toBe('Updated Server');
      });
    });

    describe('DELETE /api/config/servers/:serverId', () => {
      test('should remove server configuration', async () => {
        // Mock the removeServer method
        const configService = require('../../src/services/ConfigService');
        jest.spyOn(configService, 'removeServer').mockResolvedValue();

        const response = await request(app)
          .delete('/api/config/servers/test-server')
          .expect(200);
          
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('GET /api/config/settings', () => {
      test('should return global settings', async () => {
        // Mock the getGlobalSettings method
        const configService = require('../../src/services/ConfigService');
        jest.spyOn(configService, 'getGlobalSettings').mockReturnValue({
          defaultTimeout: 30000,
          maxRetries: 3
        });

        const response = await request(app)
          .get('/api/config/settings')
          .expect(200);
          
        expect(response.body).toHaveProperty('settings');
        expect(response.body.settings).toHaveProperty('defaultTimeout');
      });
    });

    describe('PUT /api/config/settings', () => {
      test('should update global settings', async () => {
        // Mock the updateGlobalSettings method
        const configService = require('../../src/services/ConfigService');
        jest.spyOn(configService, 'updateGlobalSettings').mockResolvedValue();

        const response = await request(app)
          .put('/api/config/settings')
          .send({ defaultTimeout: 60000 })
          .expect(200);
          
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('GET /api/config/servers/:serverId/capabilities', () => {
      test('should return server capabilities', async () => {
        // Mock the getServerCapabilities method
        const configService = require('../../src/services/ConfigService');
        jest.spyOn(configService, 'getServerCapabilities').mockReturnValue({
          tools: ['read_file', 'write_file']
        });

        const response = await request(app)
          .get('/api/config/servers/test-server/capabilities')
          .expect(200);
          
        expect(response.body).toHaveProperty('serverId');
        expect(response.body).toHaveProperty('capabilities');
        expect(response.body.capabilities).toHaveProperty('tools');
      });
    });

    describe('PUT /api/config/servers/:serverId/capabilities', () => {
      test('should update server capabilities', async () => {
        // Mock the updateServerCapabilities method
        const configService = require('../../src/services/ConfigService');
        jest.spyOn(configService, 'updateServerCapabilities').mockResolvedValue();

        const response = await request(app)
          .put('/api/config/servers/test-server/capabilities')
          .send({ tools: ['new_tool'] })
          .expect(200);
          
        expect(response.body).toHaveProperty('message');
      });
    });
  });

  describe('Health Check Route', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
        
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });
});