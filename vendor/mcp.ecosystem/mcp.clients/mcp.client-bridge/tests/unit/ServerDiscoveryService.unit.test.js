// tests/unit/ServerDiscoveryService.unit.test.js
const ServerDiscoveryService = require('../../src/services/ServerDiscoveryService');
const fs = require('fs').promises;
const path = require('path');

describe('ServerDiscoveryService Unit Tests', () => {
  let discoveryService;
  const testIndexPath = path.join(__dirname, '../test-data/test-index.json');

  beforeEach(() => {
    discoveryService = new ServerDiscoveryService(testIndexPath);
  });

  describe('constructor', () => {
    test('should initialize with correct default properties', () => {
      expect(discoveryService.indexFilePath).toBe(testIndexPath);
      expect(discoveryService.serverIndex).toBeNull();
      expect(discoveryService.lastUpdated).toBeNull();
    });
  });

  describe('loadServerIndex', () => {
    test('should load server index from file', async () => {
      // Create a temporary test index file
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          {
            id: 'test-server',
            name: 'Test Server',
            category: 'Test',
            description: 'A test server',
            tools: [
              {
                name: 'test-tool',
                description: 'A test tool',
                parameters: []
              }
            ]
          }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));

      const result = await discoveryService.loadServerIndex();
      expect(result).toEqual(testIndex);
      expect(discoveryService.serverIndex).toEqual(testIndex);
      expect(discoveryService.lastUpdated).toBeInstanceOf(Date);
    });

    test('should throw error if file does not exist', async () => {
      discoveryService = new ServerDiscoveryService('/non-existent/path.json');
      
      await expect(discoveryService.loadServerIndex()).rejects.toThrow();
    });

    test('should throw error if file contains invalid JSON', async () => {
      await fs.writeFile(testIndexPath, 'invalid json content');
      
      await expect(discoveryService.loadServerIndex()).rejects.toThrow();
    });
  });

  describe('getAllServers', () => {
    test('should return all servers from index', async () => {
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          { id: 'server1', name: 'Server 1' },
          { id: 'server2', name: 'Server 2' }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));
      discoveryService = new ServerDiscoveryService(testIndexPath);

      const result = await discoveryService.getAllServers();
      expect(result).toEqual(testIndex.servers);
    });

    test('should load index if not already loaded', async () => {
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          { id: 'server1', name: 'Server 1' }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));

      const result = await discoveryService.getAllServers();
      expect(result).toEqual(testIndex.servers);
    });
  });

  describe('getServerById', () => {
    test('should return server if found by ID', async () => {
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          { id: 'server1', name: 'Server 1' },
          { id: 'server2', name: 'Server 2' }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));

      const result = await discoveryService.getServerById('server1');
      expect(result).toEqual({ id: 'server1', name: 'Server 1' });
    });

    test('should return null if server not found', async () => {
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          { id: 'server1', name: 'Server 1' }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));

      const result = await discoveryService.getServerById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getServersByCategory', () => {
    test('should return servers matching category (case-insensitive)', async () => {
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          { id: 'server1', name: 'Server 1', category: 'AI' },
          { id: 'server2', name: 'Server 2', category: 'ai' },
          { id: 'server3', name: 'Server 3', category: 'DEVOPS' }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));

      const result = await discoveryService.getServersByCategory('AI');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('server1');
      expect(result[1].id).toBe('server2');
    });

    test('should return empty array if no servers match category', async () => {
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          { id: 'server1', name: 'Server 1', category: 'AI' }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));

      const result = await discoveryService.getServersByCategory('NONEXISTENT');
      expect(result).toHaveLength(0);
    });
  });

  describe('searchServers', () => {
    test('should find servers by name', async () => {
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          { id: 'server1', name: 'Gemini AI Server', category: 'AI' },
          { id: 'server2', name: 'File Operations Server', category: 'DEVOPS' }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));

      const result = await discoveryService.searchServers('gemini');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('server1');
    });

    test('should find servers by description', async () => {
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          { id: 'server1', name: 'Server 1', description: 'Handles AI operations', category: 'AI' },
          { id: 'server2', name: 'Server 2', description: 'Manages file operations', category: 'DEVOPS' }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));

      const result = await discoveryService.searchServers('ai');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('server1');
    });

    test('should find servers by category', async () => {
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          { id: 'server1', name: 'Server 1', category: 'ARTIFICIAL INTELLIGENCE' },
          { id: 'server2', name: 'Server 2', category: 'DEVOPS' }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));

      const result = await discoveryService.searchServers('intelligence');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('server1');
    });

    test('should return empty array if no servers match', async () => {
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          { id: 'server1', name: 'Server 1', category: 'AI' }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));

      const result = await discoveryService.searchServers('nonexistent');
      expect(result).toHaveLength(0);
    });
  });

  describe('findToolsForQuery', () => {
    test('should find tools matching query in name', async () => {
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          {
            id: 'server1',
            name: 'File Server',
            category: 'DEVOPS',
            tools: [
              { name: 'read_file', description: 'Reads a file' },
              { name: 'write_file', description: 'Writes a file' }
            ]
          }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));

      const result = await discoveryService.findToolsForQuery('read');
      expect(result).toHaveLength(1);
      expect(result[0].serverId).toBe('server1');
      expect(result[0].matchingTools).toHaveLength(1);
      expect(result[0].matchingTools[0].name).toBe('read_file');
    });

    test('should find tools matching query in description', async () => {
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          {
            id: 'server1',
            name: 'File Server',
            category: 'DEVOPS',
            tools: [
              { name: 'file_op', description: 'Performs file operations' }
            ]
          }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));

      const result = await discoveryService.findToolsForQuery('operations');
      expect(result).toHaveLength(1);
      expect(result[0].serverId).toBe('server1');
      expect(result[0].matchingTools).toHaveLength(1);
    });

    test('should return empty array if no tools match', async () => {
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          {
            id: 'server1',
            name: 'File Server',
            category: 'DEVOPS',
            tools: [
              { name: 'read_file', description: 'Reads a file' }
            ]
          }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));

      const result = await discoveryService.findToolsForQuery('nonexistent');
      expect(result).toHaveLength(0);
    });
  });

  describe('toolMatchesQuery', () => {
    test('should match tool by name', () => {
      const tool = { name: 'read_file', description: 'Reads a file' };
      const result = discoveryService.toolMatchesQuery(tool, 'read');
      expect(result).toBe(true);
    });

    test('should match tool by description', () => {
      const tool = { name: 'file_op', description: 'Performs file operations' };
      const result = discoveryService.toolMatchesQuery(tool, 'operations');
      expect(result).toBe(true);
    });

    test('should not match if neither name nor description contains query', () => {
      const tool = { name: 'read_file', description: 'Reads a file' };
      const result = discoveryService.toolMatchesQuery(tool, 'write');
      expect(result).toBe(false);
    });
  });

  describe('getAllTools', () => {
    test('should return all tools from all servers', async () => {
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          {
            id: 'server1',
            name: 'Server 1',
            tools: [
              { name: 'tool1', description: 'Tool 1' },
              { name: 'tool2', description: 'Tool 2' }
            ]
          },
          {
            id: 'server2',
            name: 'Server 2',
            tools: [
              { name: 'tool3', description: 'Tool 3' }
            ]
          }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));

      const result = await discoveryService.getAllTools();
      expect(result).toHaveLength(3);
      expect(result[0].serverId).toBe('server1');
      expect(result[0].tool.name).toBe('tool1');
      expect(result[1].serverId).toBe('server1');
      expect(result[1].tool.name).toBe('tool2');
      expect(result[2].serverId).toBe('server2');
      expect(result[2].tool.name).toBe('tool3');
    });

    test('should return empty array if no servers have tools', async () => {
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          {
            id: 'server1',
            name: 'Server 1',
            tools: []
          }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));

      const result = await discoveryService.getAllTools();
      expect(result).toHaveLength(0);
    });
  });

  describe('refreshIndex', () => {
    test('should reload the server index', async () => {
      const testIndex1 = {
        last_updated: new Date().toISOString(),
        servers: [{ id: 'server1', name: 'Server 1' }]
      };

      const testIndex2 = {
        last_updated: new Date().toISOString(),
        servers: [{ id: 'server2', name: 'Server 2' }]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex1));
      
      // Load the initial index
      await discoveryService.loadServerIndex();
      expect(discoveryService.serverIndex.servers[0].id).toBe('server1');

      // Update the file with new content
      await fs.writeFile(testIndexPath, JSON.stringify(testIndex2));

      // Refresh the index
      await discoveryService.refreshIndex();
      expect(discoveryService.serverIndex.servers[0].id).toBe('server2');
    });
  });

  describe('getIndexMetadata', () => {
    test('should return correct metadata', async () => {
      const testIndex = {
        last_updated: new Date().toISOString(),
        servers: [
          {
            id: 'server1',
            name: 'Server 1',
            category: 'AI',
            tools: [
              { name: 'tool1', description: 'Tool 1' },
              { name: 'tool2', description: 'Tool 2' }
            ]
          },
          {
            id: 'server2',
            name: 'Server 2',
            category: 'DEVOPS',
            tools: [
              { name: 'tool3', description: 'Tool 3' }
            ]
          }
        ]
      };

      await fs.writeFile(testIndexPath, JSON.stringify(testIndex));

      const metadata = await discoveryService.getIndexMetadata();
      expect(metadata).toHaveProperty('lastUpdated');
      expect(metadata.serverCount).toBe(2);
      expect(metadata.categories).toContain('AI');
      expect(metadata.categories).toContain('DEVOPS');
      expect(metadata.totalTools).toBe(3);
    });
  });
});