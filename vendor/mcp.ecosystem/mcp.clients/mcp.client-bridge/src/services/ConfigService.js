// src/services/ConfigService.js
const ConfigStorage = require('../models/ConfigStorage');
const logger = require('../utils/logger');

class ConfigService {
  constructor() {
    this.storage = new ConfigStorage('./config/mcp-servers.json');
  }

  /**
   * Initialize the configuration service
   */
  async initialize() {
    logger.info('Initializing configuration service...');
    await this.storage.initialize();
    logger.info('Configuration service initialized');
  }

  /**
   * Get all server configurations
   */
  getServers() {
    return this.storage.getServers();
  }

  /**
   * Get a specific server configuration by ID
   */
  getServer(serverId) {
    return this.storage.getServer(serverId);
  }

  /**
   * Add a new server configuration
   */
  async addServer(serverConfig) {
    await this.storage.addServer(serverConfig);
  }

  /**
   * Update an existing server configuration
   */
  async updateServer(serverId, serverConfig) {
    await this.storage.updateServer(serverId, serverConfig);
  }

  /**
   * Remove a server configuration
   */
  async removeServer(serverId) {
    await this.storage.removeServer(serverId);
  }

  /**
   * Get global settings
   */
  getGlobalSettings() {
    return this.storage.getGlobalSettings();
  }

  /**
   * Update global settings
   */
  async updateGlobalSettings(settings) {
    await this.storage.updateGlobalSettings(settings);
  }

  /**
   * Get server capabilities
   */
  getServerCapabilities(serverId) {
    return this.storage.getServerCapabilities(serverId);
  }

  /**
   * Update server capabilities
   */
  async updateServerCapabilities(serverId, capabilities) {
    await this.storage.updateServerCapabilities(serverId, capabilities);
  }

  /**
   * Validate and normalize server configuration
   */
  normalizeServerConfig(config) {
    return {
      id: config.id,
      name: config.name || config.id,
      url: config.url,
      description: config.description || '',
      enabled: config.enabled !== false, // default to true
      timeout: config.timeout || 30000,
      headers: config.headers || {},
      capabilities: config.capabilities || {},
      auth: config.auth || null
    };
  }
}

// Singleton instance
const configService = new ConfigService();

module.exports = configService;