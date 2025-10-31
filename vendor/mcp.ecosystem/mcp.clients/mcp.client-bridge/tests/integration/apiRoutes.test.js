// tests/integration/apiRoutes.test.js
const request = require('supertest');
const express = require('express');

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

const app = require('../../index'); // Main application
const MCPClientBridge = require('../../src/services/MCPClientBridge');
const ServerDiscoveryService = require('../../src/services/ServerDiscoveryService');

// Mock the services to avoid actual initialization
jest.mock('../../src/services/MCPClientBridge');
jest.mock('../../src/services/ServerDiscoveryService');

describe('API Routes Integration Tests', () => {
  let mockMCPBridge;
  let mockDiscoveryService;

  beforeEach(() => {
    // Create mock instances
    mockMCPBridge = {
      processRequest: jest.fn(),
      getStats: jest.fn(),
      connectToServer: jest.fn(),
      fetchServerCapabilities: jest.fn(),
      getAllServers: jest.fn(),
      getServersByCategory: jest.fn(),
      searchServers: jest.fn(),
      findToolsForQuery: jest.fn(),
      getAllTools: jest.fn(),
      discoveryService: {
        getServerById: jest.fn(),
        getIndexMetadata: jest.fn(),
        refreshIndex: jest.fn()
      }
    };

    // Set the mock bridge on the app
    app.set('mcpBridge', mockMCPBridge);
  });

  describe('MCP Routes', () => {
    describe('POST /api/mcp/process', () => {
      test('should process a natural language request successfully', async () => {
        const mockRequest = { request: 'Read the file README.md' };
        const mockResponse = { 
          success: true, 
          result: { content: 'file content' },
          serverId: 'mcp.filesystem',
          intent: 'read_file'
        };
        
        mockMCPBridge.processRequest.mockResolvedValue(mockResponse);

        const response = await request(app)
          .post('/api/mcp/process')
          .send(mockRequest)
          .expect(200);

        expect(response.body).toEqual(mockResponse);
        expect(mockMCPBridge.processRequest).toHaveBeenCalledWith('Read the file README.md');
      });

      test('should return 400 for missing request field', async () => {
        const response = await request(app)
          .post('/api/mcp/process')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('request');
      });

      test('should return 500 for processing errors', async () => {
        mockMCPBridge.processRequest.mockRejectedValue(new Error('Processing failed'));

        const response = await request(app)
          .post('/api/mcp/process')
          .send({ request: 'Test request' })
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/mcp/stats', () => {
      test('should return bridge statistics', async () => {
        const mockStats = {
          connectionPoolSize: 2,
          cachedRequests: { hits: 10, misses: 5 },
          metrics: { totalRequests: 15 }
        };
        
        mockMCPBridge.getStats.mockResolvedValue(mockStats);

        const response = await request(app)
          .get('/api/mcp/stats')
          .expect(200);

        expect(response.body).toEqual(mockStats);
        expect(mockMCPBridge.getStats).toHaveBeenCalled();
      });

      test('should return 500 for stats errors', async () => {
        mockMCPBridge.getStats.mockRejectedValue(new Error('Stats error'));

        const response = await request(app)
          .get('/api/mcp/stats')
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('POST /api/mcp/test-connection', () => {
      test('should test server connection successfully', async () => {
        const mockConnectionData = {
          serverId: 'test-server',
          serverConfig: { url: 'http://localhost:8080' }
        };
        
        mockMCPBridge.connectToServer.mockResolvedValue({});

        const response = await request(app)
          .post('/api/mcp/test-connection')
          .send(mockConnectionData)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Successfully connected to server: test-server'
        });
        expect(mockMCPBridge.connectToServer).toHaveBeenCalledWith(
          'test-server',
          { url: 'http://localhost:8080' }
        );
      });

      test('should return 400 for missing serverId or serverConfig', async () => {
        const response = await request(app)
          .post('/api/mcp/test-connection')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      test('should return 500 for connection errors', async () => {
        mockMCPBridge.connectToServer.mockRejectedValue(new Error('Connection failed'));

        const response = await request(app)
          .post('/api/mcp/test-connection')
          .send({
            serverId: 'test-server',
            serverConfig: { url: 'http://localhost:8080' }
          })
          .expect(500);

        expect(response.body).toHaveProperty('error');
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/mcp/server/:serverId/capabilities', () => {
      test('should return server capabilities', async () => {
        const mockCapabilities = { tools: [{ name: 'read_file' }] };
        
        // Mock config service separately since it's not part of the bridge mock
        jest.mock('../../src/services/ConfigService', () => ({
          getServer: jest.fn().mockReturnValue({ url: 'http://localhost:8080' })
        }));
        
        const ConfigService = require('../../src/services/ConfigService');
        const configServiceMock = require('../../src/services/ConfigService');
        configServiceMock.getServer.mockReturnValue({ url: 'http://localhost:8080' });
        
        mockMCPBridge.fetchServerCapabilities.mockResolvedValue(mockCapabilities);

        const response = await request(app)
          .get('/api/mcp/server/test-server/capabilities')
          .expect(200);

        expect(response.body).toEqual({
          serverId: 'test-server',
          capabilities: mockCapabilities
        });
      });

      test('should return 404 for non-existent server', async () => {
        const ConfigService = require('../../src/services/ConfigService');
        ConfigService.getServer = jest.fn().mockReturnValue(null);

        const response = await request(app)
          .get('/api/mcp/server/non-existent/capabilities')
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Discovery Routes', () => {
    beforeEach(() => {
      // Mock the discovery routes to use our mock bridge
      const discoveryRoutes = require('../../src/routes/discoveryRoutes');
      discoveryRoutes.setClientBridge(mockMCPBridge);
    });

    describe('GET /api/mcp/discovery/servers', () => {
      test('should return all servers', async () => {
        const mockServers = [{ id: 'server1', name: 'Server 1' }];
        mockMCPBridge.getAllServers.mockResolvedValue(mockServers);

        const response = await request(app)
          .get('/api/mcp/discovery/servers')
          .expect(200);

        expect(response.body).toEqual({ servers: mockServers });
      });
    });

    describe('GET /api/mcp/discovery/servers/:serverId', () => {
      test('should return specific server', async () => {
        const mockServer = { id: 'server1', name: 'Server 1' };
        mockMCPBridge.discoveryService.getServerById.mockResolvedValue(mockServer);

        const response = await request(app)
          .get('/api/mcp/discovery/servers/server1')
          .expect(200);

        expect(response.body).toEqual({ server: mockServer });
      });

      test('should return 404 for non-existent server', async () => {
        mockMCPBridge.discoveryService.getServerById.mockResolvedValue(null);

        const response = await request(app)
          .get('/api/mcp/discovery/servers/non-existent')
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/mcp/discovery/servers/category/:category', () => {
      test('should return servers by category', async () => {
        const mockServers = [{ id: 'server1', name: 'Server 1', category: 'AI' }];
        mockMCPBridge.getServersByCategory.mockResolvedValue(mockServers);

        const response = await request(app)
          .get('/api/mcp/discovery/servers/category/AI')
          .expect(200);

        expect(response.body).toEqual({ servers: mockServers, category: 'AI' });
      });
    });

    describe('GET /api/mcp/discovery/servers/search/:keyword', () => {
      test('should return servers matching keyword', async () => {
        const mockServers = [{ id: 'server1', name: 'Test Server' }];
        mockMCPBridge.searchServers.mockResolvedValue(mockServers);

        const response = await request(app)
          .get('/api/mcp/discovery/servers/search/test')
          .expect(200);

        expect(response.body).toEqual({ servers: mockServers, keyword: 'test' });
      });
    });

    describe('POST /api/mcp/discovery/tools/search', () => {
      test('should return tools matching query', async () => {
        const mockResults = [{ serverId: 'server1', matchingTools: [{ name: 'read_file' }] }];
        mockMCPBridge.findToolsForQuery.mockResolvedValue(mockResults);

        const response = await request(app)
          .post('/api/mcp/discovery/tools/search')
          .send({ query: 'read file' })
          .expect(200);

        expect(response.body).toEqual({ results: mockResults, query: 'read file' });
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
        const mockTools = [{ serverId: 'server1', tool: { name: 'read_file' } }];
        mockMCPBridge.getAllTools.mockResolvedValue(mockTools);

        const response = await request(app)
          .get('/api/mcp/discovery/tools')
          .expect(200);

        expect(response.body).toEqual({ tools: mockTools });
      });
    });

    describe('GET /api/mcp/discovery/index/metadata', () => {
      test('should return index metadata', async () => {
        const mockMetadata = { lastUpdated: '2024-10-29T10:00:00Z', serverCount: 2 };
        mockMCPBridge.discoveryService.getIndexMetadata.mockResolvedValue(mockMetadata);

        const response = await request(app)
          .get('/api/mcp/discovery/index/metadata')
          .expect(200);

        expect(response.body).toEqual({ metadata: mockMetadata });
      });
    });

    describe('POST /api/mcp/discovery/index/refresh', () => {
      test('should refresh server index', async () => {
        const mockMetadata = { lastUpdated: '2024-10-29T11:00:00Z', serverCount: 2 };
        mockMCPBridge.discoveryService.refreshIndex.mockResolvedValue();
        mockMCPBridge.discoveryService.getIndexMetadata.mockResolvedValue(mockMetadata);

        const response = await request(app)
          .post('/api/mcp/discovery/index/refresh')
          .expect(200);

        expect(response.body).toEqual({
          message: 'Server index refreshed successfully',
          metadata: mockMetadata
        });
      });
    });
  });

  describe('Config Routes', () => {
    describe('GET /api/config/servers', () => {
      test('should return all server configurations', async () => {
        jest.mock('../../src/services/ConfigService', () => ({
          getServers: jest.fn().mockReturnValue([{ id: 'server1', name: 'Server 1' }])
        }));
        
        const response = await request(app)
          .get('/api/config/servers')
          .expect(200);

        expect(response.body).toHaveProperty('servers');
      });
    });

    describe('GET /api/config/settings', () => {
      test('should return global settings', async () => {
        jest.mock('../../src/services/ConfigService', () => ({
          getGlobalSettings: jest.fn().mockReturnValue({ port: 3000 })
        }));
        
        const response = await request(app)
          .get('/api/config/settings')
          .expect(200);

        expect(response.body).toHaveProperty('settings');
        expect(response.body.settings).toHaveProperty('port');
      });
    });
  });

  describe('Health Check', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.status).toBe('OK');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Route not found');
    });

    test('should handle unhandled errors gracefully', async () => {
      // Create a test route that throws an error
      app.get('/test-error', (req, res, next) => {
        next(new Error('Test error'));
      });

      const response = await request(app)
        .get('/test-error')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});