/**
 * Agent Resource Management for Rube MCP Server
 * Handles resource management specifically for agent interactions
 */

const { logger } = require('../utils/logger');
const { agentAuthManager } = require('./agentAuthManager');
const { agentService } = require('./agentService');

class AgentResourceService {
  constructor() {
    this.resources = new Map(); // Store agent-specific resources
    this.resourceTemplates = new Map(); // Store resource templates
    this.initializeResourceTemplates();
  }

  /**
   * Initialize default resource templates
   * @private
   */
  initializeResourceTemplates() {
    // Gmail resource templates
    this.registerResourceTemplate('gmail-email', {
      name: 'gmail-email',
      description: 'Gmail email resource',
      mimeType: 'application/json',
      properties: {
        id: { type: 'string', description: 'Email ID' },
        threadId: { type: 'string', description: 'Thread ID' },
        from: { type: 'string', description: 'Sender email' },
        to: { type: 'string', description: 'Recipient email' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body' },
        date: { type: 'string', description: 'Email date' },
      },
    });

    // GitHub resource templates
    this.registerResourceTemplate('github-issue', {
      name: 'github-issue',
      description: 'GitHub issue resource',
      mimeType: 'application/json',
      properties: {
        id: { type: 'string', description: 'Issue ID' },
        number: { type: 'number', description: 'Issue number' },
        title: { type: 'string', description: 'Issue title' },
        body: { type: 'string', description: 'Issue description' },
        state: { type: 'string', description: 'Issue state (open/closed)' },
        author: { type: 'string', description: 'Issue author' },
        createdAt: { type: 'string', description: 'Creation date' },
      },
    });

    // Slack resource templates
    this.registerResourceTemplate('slack-message', {
      name: 'slack-message',
      description: 'Slack message resource',
      mimeType: 'application/json',
      properties: {
        id: { type: 'string', description: 'Message ID' },
        ts: { type: 'string', description: 'Timestamp' },
        channel: { type: 'string', description: 'Channel ID' },
        user: { type: 'string', description: 'User ID' },
        text: { type: 'string', description: 'Message text' },
        threadTs: { type: 'string', description: 'Thread timestamp' },
      },
    });

    // Generic app resource template
    this.registerResourceTemplate('app-resource', {
      name: 'app-resource',
      description: 'Generic app resource',
      mimeType: 'application/json',
      properties: {
        id: { type: 'string', description: 'Resource ID' },
        appId: { type: 'string', description: 'App identifier' },
        type: { type: 'string', description: 'Resource type' },
        name: { type: 'string', description: 'Resource name' },
        data: { type: 'object', description: 'Resource data' },
        metadata: { type: 'object', description: 'Resource metadata' },
      },
    });

    logger.info('Agent resource templates initialized', { 
      count: this.resourceTemplates.size 
    });
  }

  /**
   * Register a resource template
   * @param {string} templateId - Template identifier
   * @param {Object} template - Template definition
   */
  registerResourceTemplate(templateId, template) {
    this.resourceTemplates.set(templateId, {
      id: templateId,
      ...template,
    });
  }

  /**
   * List all available resource templates
   * @returns {Array} Array of resource templates
   */
  async listResourceTemplates() {
    return Array.from(this.resourceTemplates.values()).map(template => ({
      name: template.name,
      description: template.description,
      mime_type: template.mimeType,
    }));
  }

  /**
   * Get specific resource template
   * @param {string} templateId - Template identifier
   * @returns {Object|null} Template or null if not found
   */
  async getResourceTemplate(templateId) {
    return this.resourceTemplates.get(templateId) || null;
  }

  /**
   * List resources for a user
   * @param {string} userId - User identifier
   * @param {Object} options - Query options
   * @returns {Array} Array of resources
   */
  async listResources(userId, options = {}) {
    // Filter resources by user
    const userResources = [];
    
    for (const [resourceId, resource] of this.resources) {
      if (resource.userId === userId) {
        // Apply filters from options if provided
        if (options.appId && resource.appId !== options.appId) {
          continue;
        }
        if (options.type && resource.type !== options.type) {
          continue;
        }
        
        userResources.push({
          id: resource.id,
          name: resource.name,
          uri: resource.uri,
          appId: resource.appId,
          type: resource.type,
          createdAt: resource.createdAt,
          updatedAt: resource.updatedAt,
        });
      }
    }
    
    return userResources;
  }

  /**
   * Get specific resource
   * @param {string} resourceId - Resource identifier
   * @param {string} userId - User identifier
   * @returns {Object|null} Resource or null if not found
   */
  async getResource(resourceId, userId) {
    const resource = this.resources.get(resourceId);
    if (!resource || resource.userId !== userId) {
      return null;
    }
    
    return {
      id: resource.id,
      name: resource.name,
      uri: resource.uri,
      appId: resource.appId,
      type: resource.type,
      content: resource.content,
      metadata: resource.metadata,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };
  }

  /**
   * Create a new resource
   * @param {Object} resourceData - Resource data
   * @param {string} userId - User identifier
   * @returns {Object} Created resource
   */
  async createResource(resourceData, userId) {
    const resourceId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate required fields
    if (!resourceData.name) {
      throw new Error('Resource name is required');
    }
    
    const resource = {
      id: resourceId,
      userId,
      name: resourceData.name,
      uri: resourceData.uri || `rube://${resourceData.appId || 'app'}/${resourceId}`,
      appId: resourceData.appId,
      type: resourceData.type || 'generic',
      content: resourceData.content || null,
      metadata: {
        ...resourceData.metadata,
        createdAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.resources.set(resourceId, resource);
    
    logger.info(`Resource created: ${resourceId}`, {
      userId,
      appId: resource.appId,
      type: resource.type,
    });
    
    return resource;
  }

  /**
   * Update an existing resource
   * @param {string} resourceId - Resource identifier
   * @param {Object} updates - Updates to apply
   * @param {string} userId - User identifier
   * @returns {Object|null} Updated resource or null if not found
   */
  async updateResource(resourceId, updates, userId) {
    const resource = this.resources.get(resourceId);
    if (!resource || resource.userId !== userId) {
      return null;
    }
    
    // Update allowed fields
    if (updates.name !== undefined) resource.name = updates.name;
    if (updates.content !== undefined) resource.content = updates.content;
    if (updates.metadata !== undefined) {
      resource.metadata = { ...resource.metadata, ...updates.metadata };
    }
    
    resource.updatedAt = new Date().toISOString();
    
    logger.info(`Resource updated: ${resourceId}`, {
      userId,
      appId: resource.appId,
    });
    
    return resource;
  }

  /**
   * Delete a resource
   * @param {string} resourceId - Resource identifier
   * @param {string} userId - User identifier
   * @returns {boolean} True if resource was deleted, false otherwise
   */
  async deleteResource(resourceId, userId) {
    const resource = this.resources.get(resourceId);
    if (!resource || resource.userId !== userId) {
      return false;
    }
    
    this.resources.delete(resourceId);
    
    logger.info(`Resource deleted: ${resourceId}`, {
      userId,
      appId: resource.appId,
    });
    
    return true;
  }

  /**
   * Sync resources from external apps
   * @param {string} appId - App identifier
   * @param {string} userId - User identifier
   * @param {Object} options - Sync options
   * @returns {Object} Sync result
   */
  async syncResourcesFromApp(appId, userId, options = {}) {
    // Validate user has connection to the app
    const AppConnection = require('../database/models/AppConnection');
    const connection = await AppConnection.findByUserIdAndAppId(userId, appId);
    if (!connection || !connection.active) {
      throw new Error(`User ${userId} does not have active connection to app: ${appId}`);
    }

    // Based on app type, call the appropriate sync method
    let resources = [];
    let syncResult;
    
    switch (appId) {
      case 'gmail':
        resources = await this.syncGmailResources(userId, options);
        break;
      case 'github':
        resources = await this.syncGithubResources(userId, options);
        break;
      case 'slack':
        resources = await this.syncSlackResources(userId, options);
        break;
      default:
        // For other apps, use generic sync
        resources = await this.syncGenericAppResources(appId, userId, options);
    }
    
    // Store the synced resources
    const storedResources = [];
    for (const resource of resources) {
      const storedResource = await this.createResource({
        name: resource.name,
        appId: appId,
        type: resource.type,
        content: resource.content,
        metadata: resource.metadata,
      }, userId);
      
      storedResources.push(storedResource);
    }
    
    syncResult = {
      appId,
      userId,
      syncedAt: new Date().toISOString(),
      totalResources: storedResources.length,
      resources: storedResources,
    };
    
    logger.info(`Resources synced from ${appId} for user ${userId}`, {
      total: storedResources.length,
      appId,
      userId,
    });
    
    return syncResult;
  }

  /**
   * Sync Gmail resources
   * @private
   */
  async syncGmailResources(userId, options = {}) {
    // This would integrate with the app integration service
    // For now, return empty array
    return [];
  }

  /**
   * Sync GitHub resources
   * @private
   */
  async syncGithubResources(userId, options = {}) {
    // This would integrate with the app integration service
    // For now, return empty array
    return [];
  }

  /**
   * Sync Slack resources
   * @private
   */
  async syncSlackResources(userId, options = {}) {
    // This would integrate with the app integration service
    // For now, return empty array
    return [];
  }

  /**
   * Sync resources from generic app
   * @private
   */
  async syncGenericAppResources(appId, userId, options = {}) {
    // This would integrate with the app integration service
    // For now, return empty array
    return [];
  }

  /**
   * Get resources by app
   * @param {string} appId - App identifier
   * @param {string} userId - User identifier
   * @returns {Array} Array of resources from the app
   */
  async getResourcesByApp(appId, userId) {
    const resources = [];
    
    for (const [resourceId, resource] of this.resources) {
      if (resource.userId === userId && resource.appId === appId) {
        resources.push(resource);
      }
    }
    
    return resources;
  }

  /**
   * Search resources
   * @param {string} query - Search query
   * @param {string} userId - User identifier
   * @param {Object} options - Search options
   * @returns {Array} Array of matching resources
   */
  async searchResources(query, userId, options = {}) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [resourceId, resource] of this.resources) {
      if (resource.userId !== userId) {
        continue;
      }
      
      // Search in name, content, and metadata
      const searchableText = [
        resource.name,
        resource.content,
        JSON.stringify(resource.metadata),
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (searchableText.includes(lowerQuery)) {
        results.push({
          id: resource.id,
          name: resource.name,
          uri: resource.uri,
          appId: resource.appId,
          type: resource.type,
          relevance: 1.0, // Simplified relevance
        });
      }
    }
    
    // Apply additional filters from options
    if (options.appId) {
      results.filter(r => r.appId === options.appId);
    }
    if (options.type) {
      results.filter(r => r.type === options.type);
    }
    
    return results;
  }

  /**
   * Get resource statistics
   * @param {string} userId - User identifier
   * @returns {Object} Resource statistics
   */
  async getResourceStats(userId) {
    const userResources = await this.listResources(userId);
    const byApp = {};
    const byType = {};
    
    for (const resource of userResources) {
      byApp[resource.appId] = (byApp[resource.appId] || 0) + 1;
      byType[resource.type] = (byType[resource.type] || 0) + 1;
    }
    
    return {
      total: userResources.length,
      byApp,
      byType,
      lastSync: userResources.length > 0 
        ? Math.max(...userResources.map(r => new Date(r.updatedAt).getTime()))
        : null,
    };
  }

  /**
   * Clean up resources for a user
   * @param {string} userId - User identifier
   * @returns {number} Number of resources cleaned up
   */
  async cleanupUserResources(userId) {
    let cleanedCount = 0;
    
    for (const [resourceId, resource] of this.resources) {
      if (resource.userId === userId) {
        this.resources.delete(resourceId);
        cleanedCount++;
      }
    }
    
    logger.info(`Cleaned up ${cleanedCount} resources for user ${userId}`);
    
    return cleanedCount;
  }
}

module.exports = {
  agentResourceService: new AgentResourceService(),
};