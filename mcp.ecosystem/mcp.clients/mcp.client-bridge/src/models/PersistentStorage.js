// src/models/PersistentStorage.js
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class PersistentStorage {
  constructor(storagePath = './data/mcp-data.json') {
    this.storagePath = storagePath;
    this.data = null;
  }

  /**
   * Initialize the persistent storage
   */
  async initialize() {
    logger.info('Initializing persistent storage...');
    
    // Ensure the storage directory exists
    const dir = path.dirname(this.storagePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Load existing data or create default
    await this.loadData();
    
    logger.info('Persistent storage initialized');
  }

  /**
   * Load data from storage
   */
  async loadData() {
    try {
      await fs.access(this.storagePath);
      const data = await fs.readFile(this.storagePath, 'utf8');
      this.data = JSON.parse(data);
      logger.info(`Data loaded from ${this.storagePath}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create default data structure
        logger.info('Data file not found, creating default data structure');
        this.data = this.getDefaultData();
        await this.saveData();
      } else {
        logger.error('Error loading data:', error);
        throw error;
      }
    }
  }

  /**
   * Save data to storage
   */
  async saveData() {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(this.storagePath);
      await fs.mkdir(dir, { recursive: true });
      
      const data = JSON.stringify(this.data, null, 2);
      await fs.writeFile(this.storagePath, data, 'utf8');
      logger.info(`Data saved to ${this.storagePath}`);
    } catch (error) {
      logger.error('Error saving data:', error);
      throw error;
    }
  }

  /**
   * Get default data structure
   */
  getDefaultData() {
    return {
      version: '1.0',
      agentState: {
        lastStartup: null,
        lastShutdown: null,
        status: 'stopped', // 'running', 'stopped', 'error'
        uptime: 0
      },
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        requestHistory: [],
        serverStats: {},
        performanceMetrics: {}
      },
      cacheStats: {
        hits: 0,
        misses: 0,
        evictions: 0
      }
    };
  }

  /**
   * Update agent state
   */
  async updateAgentState(stateUpdate) {
    this.data.agentState = { ...this.data.agentState, ...stateUpdate };
    this.data.agentState.lastUpdate = new Date().toISOString();
    await this.saveData();
  }

  /**
   * Record a request in metrics
   */
  async recordRequest(request, result) {
    this.data.metrics.totalRequests += 1;
    
    if (result.success) {
      this.data.metrics.successfulRequests += 1;
    } else {
      this.data.metrics.failedRequests += 1;
    }
    
    // Add to request history (keep only last 1000 entries)
    const historyEntry = {
      timestamp: new Date().toISOString(),
      request: typeof request === 'string' ? request : JSON.stringify(request),
      result: result.success,
      serverId: result.serverId,
      intent: result.intent
    };
    
    this.data.metrics.requestHistory.push(historyEntry);
    if (this.data.metrics.requestHistory.length > 1000) {
      this.data.metrics.requestHistory = this.data.metrics.requestHistory.slice(-1000);
    }
    
    await this.saveData();
  }

  /**
   * Update server statistics
   */
  async updateServerStats(serverId, statsUpdate) {
    if (!this.data.metrics.serverStats[serverId]) {
      this.data.metrics.serverStats[serverId] = {
        requests: 0,
        successful: 0,
        failed: 0,
        avgResponseTime: 0,
        totalResponseTime: 0
      };
    }
    
    const serverStats = this.data.metrics.serverStats[serverId];
    serverStats.requests += 1;
    
    if (statsUpdate.successful !== undefined) {
      if (statsUpdate.successful) {
        serverStats.successful += 1;
      } else {
        serverStats.failed += 1;
      }
    }
    
    if (statsUpdate.responseTime !== undefined) {
      serverStats.totalResponseTime += statsUpdate.responseTime;
      serverStats.avgResponseTime = serverStats.totalResponseTime / serverStats.requests;
    }
    
    await this.saveData();
  }

  /**
   * Update cache statistics
   */
  async updateCacheStats(statsUpdate) {
    if (statsUpdate.hit !== undefined) {
      if (statsUpdate.hit) {
        this.data.cacheStats.hits += 1;
      } else {
        this.data.cacheStats.misses += 1;
      }
    }
    
    if (statsUpdate.eviction !== undefined) {
      this.data.cacheStats.evictions += 1;
    }
    
    await this.saveData();
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return this.data.metrics;
  }

  /**
   * Get agent state
   */
  getAgentState() {
    return this.data.agentState;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.data.cacheStats;
  }

  /**
   * Reset metrics
   */
  async resetMetrics() {
    this.data.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      requestHistory: [],
      serverStats: {},
      performanceMetrics: {}
    };
    
    await this.saveData();
  }

  /**
   * Get recent request history
   */
  getRequestHistory(limit = 50) {
    const history = this.data.metrics.requestHistory || [];
    return history.slice(-limit);
  }
}

module.exports = PersistentStorage;