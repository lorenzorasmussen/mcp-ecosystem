// tests/error-handling/error-handling.test.js
const request = require('supertest');
const app = require('../../index'); // Main app
const MCPClientBridge = require('../../src/services/MCPClientBridge');
const ServerDiscoveryService = require('../../src/services/ServerDiscoveryService');
const ConfigService = require('../../src/services/ConfigService');

describe('Error Handling Tests', () => {
  let bridge;

  beforeAll(async () => {
    bridge = new MCPClientBridge('./data/test-mcp-data.json');
    await bridge.initialize();
    app.set('mcpBridge', bridge);
  });

  describe('MCPClientBridge Error Handling', () => {
    test('should handle connection errors gracefully', async () => {
      // Mock a connection that fails
      const serverConfig = {
        url: 'http://invalid-url-that-does-not-exist.com',
        timeout: 100 // Very short timeout to fail quickly
      };

      await expect(bridge.connectToServer('invalid-server', serverConfig))
        .rejects.toThrow();
    });

    test('should handle capability fetch errors', async () => {
      // Mock an axios instance that returns an error
      const failingConnection = {
        get: jest.fn().mockRejectedValue(new Error('Network error'))
      };

      const result = await bridge.fetchServerCapabilities('failing-server', failingConnection);
      expect(result).toBeNull();
    });

    test('should handle parse request errors', async () => {
      // Mock discovery service to throw an error
      jest.spyOn(bridge.discoveryService, 'findToolsForQuery').mockRejectedValue(new Error('Discovery error'));

      await expect(bridge.parseRequest('Test request')).rejects.toThrow('Discovery error');
    });

    test('should handle tool call execution errors', async () => {
      // Mock connection to throw an error during execution
      const errorConnection = {
        post: jest.fn().mockRejectedValue(new Error('Execution error'))
      };

      jest.spyOn(bridge, 'connectToServer').mockResolvedValue(errorConnection);

      const toolCall = {
        tool_name: 'test_tool',
        parameters: {}
      };

      await expect(bridge.executeToolCall('test-server', toolCall))
        .rejects.toThrow('Execution error');
    });

    test('should handle retry failures after max attempts', async () => {
      // Mock connection to always fail
      const failingConnection = {
        post: jest.fn().mockRejectedValue(new Error('Always fails'))
      };

      const result = await bridge.executeWithRetry(failingConnection, 
        { tool_name: 'test_tool', parameters: {} }, 
        'test-server'
      ).catch(err => err);

      // Should have thrown an error after max retries
      expect(result).toBeInstanceOf(Error);
    });

    test('should handle request processing errors', async () => {
      // Mock parseRequest to throw an error
      jest.spyOn(bridge, 'parseRequest').mockRejectedValue(new Error('Parse error'));
      jest.spyOn(bridge.todoService, 'validateTodosForOperation').mockResolvedValue();

      const result = await bridge.processRequest('Invalid request');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Parse error');
    });
  });

  describe('API Routes Error Handling', () => {
    test('should handle missing request body in process endpoint', async () => {
      const response = await request(app)
        .post('/api/mcp/process')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle server connection test errors', async () => {
      // Mock connectToServer to throw an error
      jest.spyOn(bridge, 'connectToServer').mockRejectedValue(new Error('Connection failed'));

      const response = await request(app)
        .post('/api/mcp/test-connection')
        .send({
          serverId: 'test-server',
          serverConfig: { url: 'http://test.com' }
        })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('should handle missing server ID in capabilities endpoint', async () => {
      // Mock getServer to return null
      const configService = require('../../src/services/ConfigService');
      jest.spyOn(configService, 'getServer').mockReturnValue(null);

      const response = await request(app)
        .get('/api/mcp/server/non-existent/capabilities')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle discovery route errors', async () => {
      // Mock discovery service to throw an error
      jest.spyOn(bridge, 'searchServers').mockRejectedValue(new Error('Search error'));

      const response = await request(app)
        .get('/api/mcp/discovery/servers/search/test')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle tool search errors', async () => {
      // Mock discovery service to throw an error
      jest.spyOn(bridge, 'findToolsForQuery').mockRejectedValue(new Error('Tool search error'));

      const response = await request(app)
        .post('/api/mcp/discovery/tools/search')
        .send({ query: 'test' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle config route errors', async () => {
      // Mock config service to throw an error
      const configService = require('../../src/services/ConfigService');
      jest.spyOn(configService, 'getServers').mockImplementation(() => {
        throw new Error('Config service error');
      });

      const response = await request(app)
        .get('/api/config/servers')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle invalid server configuration in add server', async () => {
      const response = await request(app)
        .post('/api/config/servers')
        .send({
          id: 'invalid-server'
          // Missing required url field
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle server not found in update server', async () => {
      // Mock config service to throw a "not found" error
      const configService = require('../../src/services/ConfigService');
      jest.spyOn(configService, 'updateServer').mockRejectedValue(new Error('Server with ID non-existent not found'));

      const response = await request(app)
        .put('/api/config/servers/non-existent')
        .send({ name: 'Updated Name' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('ServerDiscoveryService Error Handling', () => {
    test('should handle missing index file', async () => {
      const discoveryService = new ServerDiscoveryService('/non-existent/path.json');

      await expect(discoveryService.loadServerIndex()).rejects.toThrow();
    });

    test('should handle invalid JSON in index file', async () => {
      // Create a temporary file with invalid JSON
      const fs = require('fs').promises;
      const path = require('path');
      const testIndexPath = path.join(__dirname, '../test-data/invalid-json.json');
      
      await fs.writeFile(testIndexPath, 'invalid json content');
      
      const discoveryService = new ServerDiscoveryService(testIndexPath);

      await expect(discoveryService.loadServerIndex()).rejects.toThrow();
      
      // Clean up
      await fs.unlink(testIndexPath);
    });
  });

  describe('ConfigService Error Handling', () => {
    test('should handle server already exists error', async () => {
      const configService = require('../../src/services/ConfigService');
      
      // First, add a server
      const testServer = {
        id: 'test-server',
        name: 'Test Server',
        url: 'http://test.com'
      };
      
      try {
        await configService.addServer(testServer);
      } catch (e) {
        // Ignore if already exists from previous test
      }
      
      // Try to add the same server again
      await expect(configService.addServer(testServer))
        .rejects.toThrow('Server with ID test-server already exists');
    });

    test('should handle missing server in update', async () => {
      const configService = require('../../src/services/ConfigService');
      
      await expect(configService.updateServer('non-existent', { name: 'New Name' }))
        .rejects.toThrow('Server with ID non-existent not found');
    });

    test('should handle missing server in remove', async () => {
      const configService = require('../../src/services/ConfigService');
      
      await expect(configService.removeServer('non-existent'))
        .rejects.toThrow('Server with ID non-existent not found');
    });

    test('should handle invalid server configuration', async () => {
      const configService = require('../../src/services/ConfigService');
      
      const invalidServer = {
        id: 'invalid-server'
        // Missing URL
      };
      
      await expect(configService.addServer(invalidServer))
        .rejects.toThrow('Server configuration must have a URL');
    });

    test('should handle invalid URL in server configuration', async () => {
      const configService = require('../../src/services/ConfigService');
      
      const invalidServer = {
        id: 'invalid-server',
        url: 'not-a-valid-url'
      };
      
      await expect(configService.addServer(invalidServer))
        .rejects.toThrow('Server URL is not valid');
    });
  });

  describe('General Error Scenarios', () => {
    test('should handle unhandled promise rejections', (done) => {
      // Set up a listener for unhandled promise rejections
      const originalHandler = process.listeners('unhandledRejection')[0] || (() => {});
      process.removeAllListeners('unhandledRejection');
      
      let rejectionHandled = false;
      process.on('unhandledRejection', (reason, promise) => {
        rejectionHandled = true;
        // Restore original handler
        process.removeAllListeners('unhandledRejection');
        process.on('unhandledRejection', originalHandler);
        done();
      });
      
      // Trigger an unhandled promise rejection
      Promise.reject(new Error('Test unhandled rejection'));
      
      // If the rejection isn't handled within 100ms, fail the test
      setTimeout(() => {
        if (!rejectionHandled) {
          process.removeAllListeners('unhandledRejection');
          process.on('unhandledRejection', originalHandler);
          done.fail('Unhandled promise rejection was not caught');
        }
      }, 100);
    });

    test('should handle API route not found', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle method not allowed', async () => {
      const response = await request(app)
        .patch('/api/mcp/process') // Using PATCH on a POST endpoint
        .send({ request: 'Test' })
        .expect(404); // Express will route this to the 404 handler

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Network and External Service Errors', () => {
    test('should handle network timeout errors', async () => {
      // This tests the retry mechanism with timeout errors
      const mockConnection = {
        post: jest.fn()
          .mockRejectedValueOnce(new Error('timeout'))  // First attempt fails
          .mockResolvedValueOnce({ data: { success: true } })  // Second attempt succeeds
      };

      // Mock the delay function to not actually delay
      const originalDelay = bridge.delay;
      bridge.delay = jest.fn().mockResolvedValue();

      const result = await bridge.executeWithRetry(
        mockConnection,
        { tool_name: 'test_tool', parameters: {} },
        'test-server'
      );

      expect(result).toEqual({ success: true });
      expect(mockConnection.post).toHaveBeenCalledTimes(2); // Called twice due to retry

      // Restore original delay function
      bridge.delay = originalDelay;
    });

    test('should handle server unavailable errors', async () => {
      // Mock a connection that always returns 503 (Service Unavailable)
      const mockAxios = require('axios-mock-adapter');
      const mockConnection = require('axios').create();
      const mockAdapter = new mockAxios(mockConnection);
      
      mockAdapter.onPost('/execute').reply(503, { error: 'Service Unavailable' });

      const result = await bridge.executeWithRetry(
        mockConnection,
        { tool_name: 'test_tool', parameters: {} },
        'test-server'
      ).catch(err => err);

      // Should have thrown an error after max retries
      expect(result).toBeInstanceOf(Error);
      
      mockAdapter.restore();
    });
  });
});