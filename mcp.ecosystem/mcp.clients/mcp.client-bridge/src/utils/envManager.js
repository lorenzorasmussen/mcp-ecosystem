// src/utils/envManager.js
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class EnvironmentManager {
  constructor(envFilePath = './.env') {
    this.envFilePath = envFilePath;
  }

  /**
   * Load environment variables from .env file
   */
  async loadEnvFile() {
    try {
      await fs.access(this.envFilePath);
      const content = await fs.readFile(this.envFilePath, 'utf8');
      const envVars = this.parseEnvFile(content);
      
      // Set environment variables
      Object.keys(envVars).forEach(key => {
        if (!(key in process.env)) {
          process.env[key] = envVars[key];
        }
      });
      
      logger.info(`Environment variables loaded from ${this.envFilePath}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info(`.env file not found at ${this.envFilePath}, using system environment variables`);
      } else {
        logger.error('Error loading .env file:', error);
        throw error;
      }
    }
  }

  /**
   * Parse environment file content
   */
  parseEnvFile(content) {
    const envVars = {};
    const lines = content.split(/\r?\n/);
    
    lines.forEach(line => {
      // Skip empty lines and comments
      if (!line.trim() || line.startsWith('#')) {
        return;
      }
      
      // Parse key=value pairs
      const separatorIndex = line.indexOf('=');
      if (separatorIndex !== -1) {
        const key = line.substring(0, separatorIndex).trim();
        let value = line.substring(separatorIndex + 1).trim();
        
        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        
        envVars[key] = value;
      }
    });
    
    return envVars;
  }

  /**
   * Save environment variables to .env file
   */
  async saveEnvFile(envVars) {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(this.envFilePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Format environment variables
      const content = Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n') + '\n';  // Add final newline
      
      await fs.writeFile(this.envFilePath, content, 'utf8');
      logger.info(`Environment variables saved to ${this.envFilePath}`);
    } catch (error) {
      logger.error('Error saving .env file:', error);
      throw error;
    }
  }

  /**
   * Add or update an environment variable
   */
  async setEnvVar(key, value) {
    // Load current environment variables
    const currentEnv = await this.loadCurrentEnvVars();
    
    // Update the specific variable
    currentEnv[key] = value;
    
    // Save back to file
    await this.saveEnvFile(currentEnv);
    
    // Also set in current process
    process.env[key] = value;
  }

  /**
   * Remove an environment variable
   */
  async removeEnvVar(key) {
    // Load current environment variables
    const currentEnv = await this.loadCurrentEnvVars();
    
    // Delete the specific variable
    delete currentEnv[key];
    
    // Remove from process environment as well
    delete process.env[key];
    
    // Save back to file
    await this.saveEnvFile(currentEnv);
  }

  /**
   * Load current environment variables from file
   */
  async loadCurrentEnvVars() {
    try {
      await fs.access(this.envFilePath);
      const content = await fs.readFile(this.envFilePath, 'utf8');
      return this.parseEnvFile(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {};
      } else {
        throw error;
      }
    }
  }

  /**
   * Get configuration for MCP servers from environment
   */
  getMCPServersFromEnv() {
    // Check if MCP_SERVERS is defined as a JSON string
    if (process.env.MCP_SERVERS) {
      try {
        return JSON.parse(process.env.MCP_SERVERS);
      } catch (error) {
        logger.error('Invalid MCP_SERVERS environment variable format:', error);
        return [];
      }
    }
    
    // Alternative: Define servers through individual environment variables
    const servers = [];
    
    // Look for environment variables that follow the pattern MCP_SERVER_{ID}_{PROPERTY}
    const serverRegex = /^MCP_SERVER_([A-Z0-9_]+)_URL$/;
    for (const [key, value] of Object.entries(process.env)) {
      const match = key.match(serverRegex);
      if (match) {
        const serverId = match[1].toLowerCase().replace(/_/g, '-');
        
        // Get other properties for this server
        const server = {
          id: serverId,
          url: value,
          name: process.env[`MCP_SERVER_${match[1]}_NAME`] || serverId,
          description: process.env[`MCP_SERVER_${match[1]}_DESCRIPTION`] || '',
          timeout: parseInt(process.env[`MCP_SERVER_${match[1]}_TIMEOUT`]) || 30000,
          enabled: process.env[`MCP_SERVER_${match[1]}_ENABLED`] !== 'false',
          headers: {}
        };
        
        // Add authentication if present
        if (process.env[`MCP_SERVER_${match[1]}_API_KEY`]) {
          server.headers['Authorization'] = `Bearer ${process.env['MCP_SERVER_' + match[1] + '_API_KEY']}`;
        }
        
        servers.push(server);
      }
    }
    
    return servers;
  }

  /**
   * Validate MCP server configurations
   */
  validateMCPServers(servers) {
    const errors = [];
    
    servers.forEach((server, index) => {
      if (!server.id) {
        errors.push(`Server at index ${index} is missing required 'id' property`);
      }
      
      if (!server.url) {
        errors.push(`Server with id '${server.id}' is missing required 'url' property`);
      } else {
        try {
          new URL(server.url);
        } catch (urlError) {
          errors.push(`Server with id '${server.id}' has invalid URL: ${server.url}`);
        }
      }
    });
    
    if (errors.length > 0) {
      throw new Error(`Invalid MCP server configurations:\n${errors.join('\n')}`);
    }
  }
}

module.exports = EnvironmentManager;