// src/models/ConfigStorage.js
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class ConfigStorage {
  constructor(storagePath = './config/mcp-servers.json') {
    this.storagePath = storagePath;
    this.config = null;
  }

  /**
   * Initialize the configuration storage
   */
  async initialize() {
    logger.info('Initializing configuration storage...');
    
    // Ensure the storage directory exists
    const dir = path.dirname(this.storagePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Load existing configuration or create default
    await this.loadConfig();
    
    logger.info('Configuration storage initialized');
  }

  /**
   * Load configuration from storage
   */
  async loadConfig() {
    try {
      await fs.access(this.storagePath);
      const data = await fs.readFile(this.storagePath, 'utf8');
      this.config = JSON.parse(data);
      logger.info(`Configuration loaded from ${this.storagePath}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create default configuration
        logger.info('Configuration file not found, creating default configuration');
        this.config = this.getDefaultConfig();
        await this.saveConfig();
      } else {
        logger.error('Error loading configuration:', error);
        throw error;
      }
    }
  }

  /**
   * Save configuration to storage
   */
  async saveConfig() {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(this.storagePath);
      await fs.mkdir(dir, { recursive: true });
      
      const data = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.storagePath, data, 'utf8');
      logger.info(`Configuration saved to ${this.storagePath}`);
    } catch (error) {
      logger.error('Error saving configuration:', error);
      throw error;
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      version: '1.0',
      servers: [],
      globalSettings: {
        defaultTimeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
        connectionPool: {
          maxConnections: 10,
          minConnections: 2,
          idleTimeout: 30000
        }
      }
    };
  }

  /**
   * Get all server configurations
   */
  getServers() {
    return this.config.servers || [];
  }

  /**
   * Get a specific server configuration by ID
   */
  getServer(serverId) {
    return this.config.servers.find(server => server.id === serverId);
  }

  /**
   * Add a new server configuration
   */
  async addServer(serverConfig) {
    // Validate the server configuration
    this.validateServerConfig(serverConfig);
    
    // Check if server with this ID already exists
    if (this.getServer(serverConfig.id)) {
      throw new Error(`Server with ID ${serverConfig.id} already exists`);
    }
    
    // Add the server to the configuration
    this.config.servers.push(serverConfig);
    
    // Save the updated configuration
    await this.saveConfig();
    
    logger.info(`Server added: ${serverConfig.id}`);
  }

  /**
   * Update an existing server configuration
   */
  async updateServer(serverId, serverConfig) {
    // Validate the server configuration
    this.validateServerConfig(serverConfig);
    
    const index = this.config.servers.findIndex(server => server.id === serverId);
    if (index === -1) {
      throw new Error(`Server with ID ${serverId} not found`);
    }
    
    // Update the server configuration
    this.config.servers[index] = { ...this.config.servers[index], ...serverConfig };
    
    // Save the updated configuration
    await this.saveConfig();
    
    logger.info(`Server updated: ${serverId}`);
  }

  /**
   * Remove a server configuration
   */
  async removeServer(serverId) {
    const initialLength = this.config.servers.length;
    this.config.servers = this.config.servers.filter(server => server.id !== serverId);
    
    if (this.config.servers.length === initialLength) {
      throw new Error(`Server with ID ${serverId} not found`);
    }
    
    // Save the updated configuration
    await this.saveConfig();
    
    logger.info(`Server removed: ${serverId}`);
  }

  /**
   * Validate server configuration
   */
  validateServerConfig(serverConfig) {
    if (!serverConfig.id) {
      throw new Error('Server configuration must have an ID');
    }
    
    if (!serverConfig.url) {
      throw new Error('Server configuration must have a URL');
    }
    
    // Validate URL format
    try {
      new URL(serverConfig.url);
    } catch (error) {
      throw new Error('Server URL is not valid');
    }
  }

  /**
   * Get global settings
   */
  getGlobalSettings() {
    return this.config.globalSettings || this.getDefaultConfig().globalSettings;
  }

  /**
   * Update global settings
   */
  async updateGlobalSettings(settings) {
    this.config.globalSettings = { ...this.config.globalSettings, ...settings };
    await this.saveConfig();
    logger.info('Global settings updated');
  }

  /**
   * Get server capabilities
   */
  getServerCapabilities(serverId) {
    const server = this.getServer(serverId);
    return server ? server.capabilities || {} : {};
  }

  /**
   * Update server capabilities
   */
  async updateServerCapabilities(serverId, capabilities) {
    const server = this.getServer(serverId);
    if (!server) {
      throw new Error(`Server with ID ${serverId} not found`);
    }
    
    server.capabilities = { ...server.capabilities, ...capabilities };
    await this.saveConfig();
    logger.info(`Capabilities updated for server: ${serverId}`);
  }
}

module.exports = ConfigStorage;