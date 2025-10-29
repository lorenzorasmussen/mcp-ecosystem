// tests/unit/ServerDiscoveryService.test.js
const ServerDiscoveryService = require('../../src/services/ServerDiscoveryService');
const fs = require('fs').promises;
const path = require('path');

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

// Mock fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn(),
    access: jest.fn(),
  }
}));

describe('ServerDiscoveryService Unit Tests', () => {
  let discoveryService;
  const mockIndexPath = path.join(__dirname, '../__mocks__/mockServerIndex.json');
  const mockServerIndex = {
    last_updated: "2024-10-29T10:00:00Z",
    servers: [
      {
        id: "mcp.gemini-bridge",
        name: "Gemini AI Bridge",
        description: "MCP bridge for Gemini AI services",
        category: "AI",
        url: "http://localhost:8081",
        tools: [
          {
            name: "generate_text",
            description: "Generate text using Gemini AI",
            parameters: [
              {
                name: "prompt",
                type: "string",
                required: true
              }
            ]
          }
        ]
      },
      {
        id: "mcp.filesystem",
        name: "File System Bridge",
        description: "MCP bridge for file system operations",
        category: "System",
        url: "http://localhost:8082",
        tools: [
          {
            name: "read_file",
            description: "Read a file from the file system",
            parameters: [
              {
                name: "path",
                type: "string",
                required: true
              }
            ]
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    discoveryService = new ServerDiscoveryService(mockIndexPath);
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default index file path if none provided', () => {
      const serviceWithDefaultPath = new ServerDiscoveryService();
      expect(serviceWithDefaultPath.indexFilePath).toContain('MCP_SERVER_INDEX.json');
    });

    test('should initialize with provided index file path', () => {
      expect(discoveryService.indexFilePath).toBe(mockIndexPath);
    });
  });

  describe('Loading Server Index', () => {
    test('should load server index successfully', async () => {
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockServerIndex));
      fs.promises.access.mockResolvedValue();

      const result = await discoveryService.loadServerIndex();

      expect(result).toEqual(mockServerIndex);
      expect(discoveryService.serverIndex).toEqual(mockServerIndex);
      expect(discoveryService.lastUpdated).toBeInstanceOf(Date);
      expect(fs.promises.readFile).toHaveBeenCalledWith(mockIndexPath, 'utf8');
    });

    test('should throw error if file reading fails', async () => {
      fs.promises.readFile.mockRejectedValue(new Error('File not found'));

      await expect(discoveryService.loadServerIndex()).rejects.toThrow('File not found');
    });
  });

  describe('Server Retrieval', () => {
    beforeEach(async () => {
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockServerIndex));
      fs.promises.access.mockResolvedValue();
      await discoveryService.loadServerIndex();
    });

    test('should get all servers', async () => {
      const servers = await discoveryService.getAllServers();

      expect(servers).toEqual(mockServerIndex.servers);
      expect(servers.length).toBe(2);
    });

    test('should get server by ID', async () => {
      const server = await discoveryService.getServerById('mcp.gemini-bridge');

      expect(server).toEqual(mockServerIndex.servers[0]);
      expect(server.id).toBe('mcp.gemini-bridge');
    });

    test('should return null for non-existent server ID', async () => {
      const server = await discoveryService.getServerById('non-existent');

      expect(server).toBeNull();
    });
  });

  describe('Server Search', () => {
    beforeEach(async () => {
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockServerIndex));
      fs.promises.access.mockResolvedValue();
      await discoveryService.loadServerIndex();
    });

    test('should search servers by category', async () => {
      const servers = await discoveryService.getServersByCategory('AI');

      expect(servers.length).toBe(1);
      expect(servers[0].category).toBe('AI');
    });

    test('should search servers by keyword in name', async () => {
      const servers = await discoveryService.searchServers('Gemini');

      expect(servers.length).toBe(1);
      expect(servers[0].name).toContain('Gemini');
    });

    test('should search servers by keyword in description', async () => {
      const servers = await discoveryService.searchServers('file system');

      expect(servers.length).toBe(1);
      expect(servers[0].description).toContain('file system');
    });

    test('should search servers by keyword in category', async () => {
      const servers = await discoveryService.searchServers('System');

      expect(servers.length).toBe(1);
      expect(servers[0].category).toBe('System');
    });

    test('should return empty array for non-matching search', async () => {
      const servers = await discoveryService.searchServers('nonexistent');

      expect(servers).toEqual([]);
    });
  });

  describe('Tool Discovery', () => {
    beforeEach(async () => {
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockServerIndex));
      fs.promises.access.mockResolvedValue();
      await discoveryService.loadServerIndex();
    });

    test('should find tools matching query in name', async () => {
      const results = await discoveryService.findToolsForQuery('read file');

      expect(results.length).toBe(1);
      expect(results[0].serverId).toBe('mcp.filesystem');
      expect(results[0].matchingTools[0].name).toBe('read_file');
    });

    test('should find tools matching query in description', async () => {
      const results = await discoveryService.findToolsForQuery('Generate text');

      expect(results.length).toBe(1);
      expect(results[0].serverId).toBe('mcp.gemini-bridge');
      expect(results[0].matchingTools[0].name).toBe('generate_text');
    });

    test('should find tools using toolMatchesQuery helper', async () => {
      const results = await discoveryService.findToolsForQuery('prompt');

      // Should match tools that have 'prompt' in parameters or description
      expect(results.length).toBe(1);
      expect(results[0].matchingTools[0].name).toBe('generate_text');
    });

    test('should return empty results for non-matching query', async () => {
      const results = await discoveryService.findToolsForQuery('nonexistent');

      expect(results).toEqual([]);
    });
  });

  describe('Tool Retrieval', () => {
    beforeEach(async () => {
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockServerIndex));
      fs.promises.access.mockResolvedValue();
      await discoveryService.loadServerIndex();
    });

    test('should get all tools from all servers', async () => {
      const tools = await discoveryService.getAllTools();

      expect(tools.length).toBe(2); // 2 tools total from both servers
      expect(tools[0]).toHaveProperty('serverId');
      expect(tools[0]).toHaveProperty('serverName');
      expect(tools[0]).toHaveProperty('tool');
    });
  });

  describe('Index Management', () => {
    test('should refresh the server index', async () => {
      fs.promises.readFile
        .mockResolvedValueOnce(JSON.stringify(mockServerIndex))
        .mockResolvedValueOnce(JSON.stringify({
          ...mockServerIndex,
          last_updated: "2024-10-29T11:00:00Z"
        }));
      fs.promises.access.mockResolvedValue();

      // First load
      await discoveryService.loadServerIndex();
      const originalLastUpdated = discoveryService.lastUpdated;

      // Refresh
      const refreshedIndex = await discoveryService.refreshIndex();

      expect(refreshedIndex).toEqual({
        ...mockServerIndex,
        last_updated: "2024-10-29T11:00:00Z"
      });
      expect(discoveryService.serverIndex).toEqual(refreshedIndex);
      expect(discoveryService.lastUpdated).not.toEqual(originalLastUpdated);
    });
  });

  describe('Index Metadata', () => {
    beforeEach(async () => {
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockServerIndex));
      fs.promises.access.mockResolvedValue();
      await discoveryService.loadServerIndex();
    });

    test('should return index metadata', async () => {
      const metadata = await discoveryService.getIndexMetadata();

      expect(metadata).toHaveProperty('lastUpdated');
      expect(metadata).toHaveProperty('serverCount');
      expect(metadata).toHaveProperty('categories');
      expect(metadata).toHaveProperty('totalTools');
      expect(metadata.serverCount).toBe(2);
      expect(metadata.totalTools).toBe(2);
      expect(metadata.categories).toContain('AI');
      expect(metadata.categories).toContain('System');
    });
  });

  describe('Tool Matching Helper', () => {
    test('should match tool by name', () => {
      const tool = { name: 'read_file', description: 'Read a file' };
      const result = discoveryService.toolMatchesQuery(tool, 'read');
      
      expect(result).toBe(true);
    });

    test('should match tool by description', () => {
      const tool = { name: 'read_file', description: 'Read a file from system' };
      const result = discoveryService.toolMatchesQuery(tool, 'system');
      
      expect(result).toBe(true);
    });

    test('should not match non-matching query', () => {
      const tool = { name: 'read_file', description: 'Read a file' };
      const result = discoveryService.toolMatchesQuery(tool, 'nonexistent');
      
      expect(result).toBe(false);
    });
  });
});