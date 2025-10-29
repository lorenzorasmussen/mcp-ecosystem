// mcp.ecosystem/mcp.clients/mcp.client-bridge/tests/serverDiscovery.test.js
const ServerDiscoveryService = require('../src/services/ServerDiscoveryService');
const path = require('path');
const fs = require('fs').promises;

describe('ServerDiscoveryService', () => {
  let discoveryService;
  
  beforeEach(() => {
    // Use the actual index file for testing
    const indexPath = path.join(__dirname, '../MCP_SERVER_INDEX.json');
    discoveryService = new ServerDiscoveryService(indexPath);
  });
  
  test('should load server index successfully', async () => {
    const index = await discoveryService.loadServerIndex();
    expect(index).toBeDefined();
    expect(index.servers).toBeDefined();
    expect(Array.isArray(index.servers)).toBe(true);
    expect(index.servers.length).toBeGreaterThan(0);
  });
  
  test('should get all servers', async () => {
    const servers = await discoveryService.getAllServers();
    expect(Array.isArray(servers)).toBe(true);
    expect(servers.length).toBeGreaterThan(0);
  });
  
  test('should get server by ID', async () => {
    const server = await discoveryService.getServerById('mcp.gemini-bridge');
    expect(server).toBeDefined();
    expect(server.id).toBe('mcp.gemini-bridge');
    expect(server.name).toBe('Gemini AI Bridge');
  });
  
  test('should return null for non-existent server', async () => {
    const server = await discoveryService.getServerById('non-existent-server');
    expect(server).toBeNull();
  });
  
  test('should search servers by category', async () => {
    const servers = await discoveryService.getServersByCategory('AI');
    expect(Array.isArray(servers)).toBe(true);
    // Should have at least one AI server
    expect(servers.length).toBeGreaterThanOrEqual(1);
  });
  
  test('should search servers by keyword', async () => {
    const servers = await discoveryService.searchServers('gemini');
    expect(Array.isArray(servers)).toBe(true);
    // Should find the gemini bridge server
    expect(servers.length).toBeGreaterThanOrEqual(1);
  });
  
  test('should find tools for query', async () => {
    const results = await discoveryService.findToolsForQuery('read file');
    expect(Array.isArray(results)).toBe(true);
    // Should find file system tools
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
  
  test('should get all tools', async () => {
    const tools = await discoveryService.getAllTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });
  
  test('should get index metadata', async () => {
    const metadata = await discoveryService.getIndexMetadata();
    expect(metadata).toBeDefined();
    expect(metadata.lastUpdated).toBeDefined();
    expect(typeof metadata.serverCount).toBe('number');
    expect(typeof metadata.totalTools).toBe('number');
  });
});