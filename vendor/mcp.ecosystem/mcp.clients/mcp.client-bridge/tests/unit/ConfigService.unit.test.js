// tests/unit/ConfigService.unit.test.js
const ConfigService = require('../../src/services/ConfigService');
const ConfigStorage = require('../../src/models/ConfigStorage');
const fs = require('fs').promises;
const path = require('path');

describe('ConfigService Unit Tests', () => {
  let configService;
  const testStoragePath = path.join(__dirname, '../test-data/test-config.json');

  beforeEach(() => {
    // Create a new instance of ConfigService with test storage path
    configService = {
      storage: new ConfigStorage(testStoragePath),
      initialize: jest.fn(),
      getServers: jest.fn(),
      getServer: jest.fn(),
      addServer: jest.fn(),
      updateServer: jest.fn(),
      removeServer: jest.fn(),
      getGlobalSettings: jest.fn(),
      updateGlobalSettings: jest.fn(),
      getServerCapabilities: jest.fn(),
      updateServerCapabilities: jest.fn(),
      normalizeServerConfig: jest.fn()
    };
    
    // Mock the actual ConfigService methods to use our test storage
    jest.spyOn(ConfigService, 'initialize').mockImplementation(async () => {
      await ConfigService.storage.initialize();
    });
    
    jest.spyOn(ConfigService, 'getServers').mockImplementation(() => {
      return ConfigService.storage.getServers();
    });
    
    jest.spyOn(ConfigService, 'getServer').mockImplementation((serverId) => {
      return ConfigService.storage.getServer(serverId);
    });
  });

  afterEach(async () => {
    // Clean up test file if it exists
    try {
      await fs.unlink(testStoragePath);
    } catch (err) {
      // Ignore error if file doesn't exist
    }
    
    // Restore mocks
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    test('should initialize the configuration service', async () => {
      await ConfigService.initialize();
      // Since initialize just calls storage.initialize, we're testing that the storage
      // is properly initialized by checking if the default config file is created
      const exists = await fs.access(testStoragePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('getServers', () => {
    test('should return all server configurations', async () => {
      await ConfigService.initialize();
      
      // Add a test server
      const testServer = {
        id: 'test-server',
        name: 'Test Server',
        url: 'http://test.com'
      };
      
      await ConfigService.storage.addServer(testServer);
      
      const servers = ConfigService.getServers();
      expect(servers).toHaveLength(1);
      expect(servers[0].id).toBe('test-server');
    });
  });

  describe('getServer', () => {
    test('should return specific server configuration by ID', async () => {
      await ConfigService.initialize();
      
      // Add a test server
      const testServer = {
        id: 'test-server',
        name: 'Test Server',
        url: 'http://test.com'
      };
      
      await ConfigService.storage.addServer(testServer);
      
      const server = ConfigService.getServer('test-server');
      expect(server).toEqual(testServer);
    });

    test('should return undefined if server not found', async () => {
      await ConfigService.initialize();
      
      const server = ConfigService.getServer('non-existent');
      expect(server).toBeUndefined();
    });
  });

  describe('addServer', () => {
    test('should add a new server configuration', async () => {
      await ConfigService.initialize();
      
      const testServer = {
        id: 'test-server',
        name: 'Test Server',
        url: 'http://test.com'
      };
      
      await ConfigService.addServer(testServer);
      
      const servers = ConfigService.getServers();
      expect(servers).toHaveLength(1);
      expect(servers[0].id).toBe('test-server');
    });

    test('should throw error if server ID already exists', async () => {
      await ConfigService.initialize();
      
      const testServer = {
        id: 'test-server',
        name: 'Test Server',
        url: 'http://test.com'
      };
      
      await ConfigService.storage.addServer(testServer);
      
      await expect(ConfigService.addServer(testServer))
        .rejects.toThrow('Server with ID test-server already exists');
    });

    test('should validate server configuration', async () => {
      await ConfigService.initialize();
      
      const invalidServer = {
        id: 'test-server'
        // Missing URL
      };
      
      await expect(ConfigService.addServer(invalidServer))
        .rejects.toThrow('Server configuration must have a URL');
    });
  });

  describe('updateServer', () => {
    test('should update existing server configuration', async () => {
      await ConfigService.initialize();
      
      // Add initial server
      const initialServer = {
        id: 'test-server',
        name: 'Initial Server',
        url: 'http://initial.com'
      };
      
      await ConfigService.storage.addServer(initialServer);
      
      // Update the server
      const updatedServer = {
        name: 'Updated Server',
        url: 'http://updated.com'
      };
      
      await ConfigService.updateServer('test-server', updatedServer);
      
      const server = ConfigService.getServer('test-server');
      expect(server.name).toBe('Updated Server');
      expect(server.url).toBe('http://updated.com');
    });

    test('should throw error if server does not exist', async () => {
      await ConfigService.initialize();
      
      const updatedServer = {
        name: 'Updated Server',
        url: 'http://updated.com'
      };
      
      await expect(ConfigService.updateServer('non-existent', updatedServer))
        .rejects.toThrow('Server with ID non-existent not found');
    });
  });

  describe('removeServer', () => {
    test('should remove server configuration', async () => {
      await ConfigService.initialize();
      
      // Add a server
      const testServer = {
        id: 'test-server',
        name: 'Test Server',
        url: 'http://test.com'
      };
      
      await ConfigService.storage.addServer(testServer);
      
      // Verify it exists
      let servers = ConfigService.getServers();
      expect(servers).toHaveLength(1);
      
      // Remove the server
      await ConfigService.removeServer('test-server');
      
      // Verify it's gone
      servers = ConfigService.getServers();
      expect(servers).toHaveLength(0);
    });

    test('should throw error if server does not exist', async () => {
      await ConfigService.initialize();
      
      await expect(ConfigService.removeServer('non-existent'))
        .rejects.toThrow('Server with ID non-existent not found');
    });
  });

  describe('getGlobalSettings', () => {
    test('should return global settings', async () => {
      await ConfigService.initialize();
      
      const settings = ConfigService.getGlobalSettings();
      expect(settings).toHaveProperty('defaultTimeout');
      expect(settings).toHaveProperty('maxRetries');
      expect(settings).toHaveProperty('retryDelay');
    });
  });

  describe('updateGlobalSettings', () => {
    test('should update global settings', async () => {
      await ConfigService.initialize();
      
      const newSettings = {
        defaultTimeout: 60000,
        maxRetries: 5
      };
      
      await ConfigService.updateGlobalSettings(newSettings);
      
      const settings = ConfigService.getGlobalSettings();
      expect(settings.defaultTimeout).toBe(60000);
      expect(settings.maxRetries).toBe(5);
    });
  });

  describe('getServerCapabilities', () => {
    test('should return server capabilities', async () => {
      await ConfigService.initialize();
      
      // Add a server with capabilities
      const testServer = {
        id: 'test-server',
        name: 'Test Server',
        url: 'http://test.com',
        capabilities: { tools: ['read_file', 'write_file'] }
      };
      
      await ConfigService.storage.addServer(testServer);
      
      const capabilities = ConfigService.getServerCapabilities('test-server');
      expect(capabilities).toEqual({ tools: ['read_file', 'write_file'] });
    });

    test('should return empty object if server has no capabilities', async () => {
      await ConfigService.initialize();
      
      // Add a server without capabilities
      const testServer = {
        id: 'test-server',
        name: 'Test Server',
        url: 'http://test.com'
      };
      
      await ConfigService.storage.addServer(testServer);
      
      const capabilities = ConfigService.getServerCapabilities('test-server');
      expect(capabilities).toEqual({});
    });
  });

  describe('updateServerCapabilities', () => {
    test('should update server capabilities', async () => {
      await ConfigService.initialize();
      
      // Add a server
      const testServer = {
        id: 'test-server',
        name: 'Test Server',
        url: 'http://test.com'
      };
      
      await ConfigService.storage.addServer(testServer);
      
      // Update capabilities
      const newCapabilities = { tools: ['read_file', 'write_file'] };
      await ConfigService.updateServerCapabilities('test-server', newCapabilities);
      
      const server = ConfigService.getServer('test-server');
      expect(server.capabilities).toEqual({ tools: ['read_file', 'write_file'] });
    });

    test('should throw error if server does not exist', async () => {
      await ConfigService.initialize();
      
      const newCapabilities = { tools: ['read_file'] };
      
      await expect(ConfigService.updateServerCapabilities('non-existent', newCapabilities))
        .rejects.toThrow('Server with ID non-existent not found');
    });
  });

  describe('normalizeServerConfig', () => {
    test('should normalize server configuration with defaults', () => {
      const inputConfig = {
        id: 'test-server',
        url: 'http://test.com'
      };
      
      const normalized = ConfigService.normalizeServerConfig(inputConfig);
      
      expect(normalized.id).toBe('test-server');
      expect(normalized.name).toBe('test-server'); // defaults to id
      expect(normalized.url).toBe('http://test.com');
      expect(normalized.enabled).toBe(true); // defaults to true
      expect(normalized.timeout).toBe(30000); // defaults to 30000
      expect(normalized.headers).toEqual({}); // defaults to empty object
      expect(normalized.capabilities).toEqual({}); // defaults to empty object
      expect(normalized.auth).toBeNull(); // defaults to null
    });

    test('should preserve provided values', () => {
      const inputConfig = {
        id: 'test-server',
        name: 'Custom Name',
        url: 'http://test.com',
        description: 'Test server',
        enabled: false,
        timeout: 15000,
        headers: { 'X-Custom': 'value' },
        capabilities: { tools: ['tool1'] },
        auth: { type: 'bearer', token: 'abc123' }
      };
      
      const normalized = ConfigService.normalizeServerConfig(inputConfig);
      
      expect(normalized.id).toBe('test-server');
      expect(normalized.name).toBe('Custom Name');
      expect(normalized.url).toBe('http://test.com');
      expect(normalized.description).toBe('Test server');
      expect(normalized.enabled).toBe(false);
      expect(normalized.timeout).toBe(15000);
      expect(normalized.headers).toEqual({ 'X-Custom': 'value' });
      expect(normalized.capabilities).toEqual({ tools: ['tool1'] });
      expect(normalized.auth).toEqual({ type: 'bearer', token: 'abc123' });
    });
  });
});