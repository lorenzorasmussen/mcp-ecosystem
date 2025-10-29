/**
 * Agent Configuration Manager for Rube MCP Server
 * Handles agent-specific configurations and settings
 */

const { config } = require('../config');
const { logger } = require('../utils/logger');

class AgentConfigManager {
  constructor() {
    this.agentConfigs = new Map();
    this.globalAgentConfig = {
      ...config.agent,
      capabilities: config.agent.defaultCapabilities,
    };
  }

  /**
   * Get global agent configuration
   * @returns {Object} Global agent configuration
   */
  getGlobalConfig() {
    return this.globalAgentConfig;
  }

  /**
   * Set global agent configuration
   * @param {Object} config - New global configuration
   */
  setGlobalConfig(config) {
    this.globalAgentConfig = {
      ...this.globalAgentConfig,
      ...config,
    };
    
    logger.info('Global agent configuration updated', { 
      config: this.globalAgentConfig 
    });
  }

  /**
   * Register a specific agent configuration
   * @param {string} agentId - Agent identifier
   * @param {Object} agentConfig - Agent-specific configuration
   */
  registerAgentConfig(agentId, agentConfig) {
    if (!agentId || typeof agentId !== 'string') {
      throw new Error('Agent ID is required and must be a string');
    }

    const mergedConfig = {
      ...this.globalAgentConfig,
      ...agentConfig,
      id: agentId,
    };

    this.agentConfigs.set(agentId, mergedConfig);
    
    logger.info(`Agent configuration registered: ${agentId}`, { 
      agentId, 
      config: mergedConfig 
    });

    return mergedConfig;
  }

  /**
   * Get agent configuration by ID
   * @param {string} agentId - Agent identifier
   * @returns {Object|null} Agent configuration or null if not found
   */
  getAgentConfig(agentId) {
    if (!agentId) {
      return null;
    }
    
    return this.agentConfigs.get(agentId) || null;
  }

  /**
   * Update agent configuration
   * @param {string} agentId - Agent identifier
   * @param {Object} updates - Configuration updates
   * @returns {Object|null} Updated configuration or null if agent not found
   */
  updateAgentConfig(agentId, updates) {
    const currentConfig = this.getAgentConfig(agentId);
    if (!currentConfig) {
      return null;
    }

    const updatedConfig = {
      ...currentConfig,
      ...updates,
    };

    this.agentConfigs.set(agentId, updatedConfig);
    
    logger.info(`Agent configuration updated: ${agentId}`, { 
      agentId, 
      updates 
    });

    return updatedConfig;
  }

  /**
   * Remove agent configuration
   * @param {string} agentId - Agent identifier
   * @returns {boolean} True if configuration was removed, false otherwise
   */
  removeAgentConfig(agentId) {
    const exists = this.agentConfigs.has(agentId);
    if (exists) {
      this.agentConfigs.delete(agentId);
      logger.info(`Agent configuration removed: ${agentId}`, { agentId });
    }
    return exists;
  }

  /**
   * Get all registered agent configurations
   * @returns {Array} Array of agent configurations
   */
  getAllAgentConfigs() {
    return Array.from(this.agentConfigs.values());
  }

  /**
   * Validate agent configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result with valid flag and errors
   */
  validateConfig(config) {
    const errors = [];

    // Validate required fields
    if (!config.id) {
      errors.push('Agent ID is required');
    }

    // Validate timeout
    if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      errors.push('Timeout must be a positive number');
    }

    // Validate maxRetries
    if (config.maxRetries !== undefined && (typeof config.maxRetries !== 'number' || config.maxRetries < 0)) {
      errors.push('Max retries must be a non-negative number');
    }

    // Validate supported apps format
    if (config.supportedApps && !Array.isArray(config.supportedApps)) {
      errors.push('Supported apps must be an array');
    }

    // Validate capabilities format
    if (config.capabilities && !Array.isArray(config.capabilities)) {
      errors.push('Capabilities must be an array');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create default configuration for a new agent
   * @param {string} agentId - Agent identifier
   * @param {Object} options - Additional options
   * @returns {Object} Default agent configuration
   */
  createDefaultConfig(agentId, options = {}) {
    return {
      id: agentId,
      name: options.name || `Agent-${agentId}`,
      description: options.description || 'Default MCP Agent',
      capabilities: [...this.globalAgentConfig.capabilities],
      supportedApps: options.supportedApps || [],
      timeout: this.globalAgentConfig.timeout || 30000,
      maxRetries: this.globalAgentConfig.retryAttempts,
      retryDelay: this.globalAgentConfig.retryDelay,
      maxConcurrentActions: this.globalAgentConfig.maxConcurrentActions,
      sessionTimeout: this.globalAgentConfig.maxSessionTimeout,
      enabled: options.enabled !== false, // Default to true
      ...options,
    };
  }

  /**
   * Merge configuration with defaults
   * @param {Object} config - Configuration to merge
   * @returns {Object} Merged configuration
   */
  mergeWithDefaults(config) {
    const defaultConfig = this.createDefaultConfig(config.id, config);
    return {
      ...defaultConfig,
      ...config,
    };
  }

  /**
   * Reset to default configuration
   */
  reset() {
    this.agentConfigs.clear();
    logger.info('Agent configuration manager reset');
  }
}

module.exports = {
  agentConfigManager: new AgentConfigManager(),
};