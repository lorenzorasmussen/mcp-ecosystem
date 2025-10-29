// tests/mcpClientBridge.test.js
const request = require('supertest');
const app = require('../index');
const MCPClientBridge = require('../src/services/MCPClientBridge');

describe('MCP Client Bridge', () => {
  describe('MCP Routes', () => {
    test('should process a natural language request', async () => {
      const response = await request(app)
        .post('/api/mcp/process')
        .send({ request: 'Test request' })
        .expect(200);
        
      expect(response.body).toHaveProperty('success');
    });

    test('should return bridge statistics', async () => {
      const response = await request(app)
        .get('/api/mcp/stats')
        .expect(200);
        
      expect(response.body).toHaveProperty('connectionPoolSize');
      expect(response.body).toHaveProperty('cachedRequests');
    });
  });

  describe('Config Routes', () => {
    test('should get all server configurations', async () => {
      const response = await request(app)
        .get('/api/config/servers')
        .expect(200);
        
      expect(response.body).toHaveProperty('servers');
    });

    test('should get global settings', async () => {
      const response = await request(app)
        .get('/api/config/settings')
        .expect(200);
        
      expect(response.body).toHaveProperty('settings');
    });
  });

  describe('Health Check', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
        
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('OK');
    });
  });
});

describe('MCPClientBridge Class', () => {
  let bridge;

  beforeEach(() => {
    bridge = new MCPClientBridge();
  });

  test('should initialize without errors', async () => {
    await expect(bridge.initialize()).resolves.not.toThrow();
  });

  test('should parse a simple request', async () => {
    const result = await bridge.parseRequest('Find all JavaScript files');
    expect(result).toHaveProperty('intent');
    expect(result).toHaveProperty('serverId');
    expect(result).toHaveProperty('toolCall');
  });
});