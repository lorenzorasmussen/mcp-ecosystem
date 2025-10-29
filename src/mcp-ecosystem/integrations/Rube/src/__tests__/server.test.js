/**
 * Basic tests for Rube MCP Server
 */

const { MCPServer } = require('../index');

describe('MCPServer', () => {
  let server;

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  test('should create server instance', () => {
    server = new MCPServer({ port: 3001 });
    expect(server).toBeDefined();
    expect(server.port).toBe(3001);
  });

  test('should start and stop server', async () => {
    server = new MCPServer({ port: 3002 });
    
    // Start the server
    const serverInstance = await server.start();
    expect(serverInstance).toBeDefined();
    
    // Stop the server
    await server.stop();
  });

  test('should handle MCP protocol endpoints', async () => {
    server = new MCPServer({ port: 3003 });
    await server.start();
    
    // Test server info endpoint
    const response = await fetch(`http://localhost:3003/mcp/info`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.name).toBe('Rube MCP Server');
    
    await server.stop();
  });
});