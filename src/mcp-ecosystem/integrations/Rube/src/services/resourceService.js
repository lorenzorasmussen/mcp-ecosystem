/**
 * Resource Service for Rube MCP Server
 * Manages resources and resource templates
 */

const { logger } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { agentResourceService } = require('./agentResourceService');
const { ResourceNotFoundError, ResourceTemplateNotFoundError } = require('../utils/errors');

class ResourceService {
  constructor() {
    // In-memory storage for demo purposes
    // In production, this would use a database
    this.resources = new Map();
    this.resourceTemplates = [
      {
        name: 'document',
        description: 'A text document resource',
        mimeType: 'text/plain',
        properties: {
          title: { type: 'string', required: true },
          content: { type: 'string', required: true },
          format: { type: 'string', default: 'plain' },
        },
      },
      {
        name: 'spreadsheet',
        description: 'A spreadsheet resource',
        mimeType: 'application/vnd.google-apps.spreadsheet',
        properties: {
          title: { type: 'string', required: true },
          data: { type: 'array', items: { type: 'object' }, required: true },
        },
      },
    ];
  }

  // List all resources for a user
  async listResources(userId) {
    // First get regular resources
    const userResources = [];
    for (const [id, resource] of this.resources) {
      if (resource.userId === userId) {
        userResources.push(resource);
      }
    }
    
    // Then get agent-specific resources
    const agentResources = await agentResourceService.listResources(userId);
    
    // Combine both sets of resources
    return [...userResources, ...agentResources];
  }

  // Get specific resource
  async getResource(resourceId, userId) {
    // First check regular resources
    const resource = this.resources.get(resourceId);
    if (resource) {
      if (resource.userId !== userId) {
        throw new ResourceNotFoundError(resourceId);
      }
      return resource;
    }
    
    // If not found, check agent resources
    const agentResource = await agentResourceService.getResource(resourceId, userId);
    if (agentResource) {
      return agentResource;
    }
    
    throw new ResourceNotFoundError(resourceId);
  }

  // Create a resource
  async createResource(resourceData) {
    // Check if this is an agent-specific resource
    if (resourceData.appId) {
      // Use agent resource service for app-specific resources
      return await agentResourceService.createResource(resourceData, resourceData.userId);
    }
    
    // Use regular resource service for general resources
    const id = uuidv4();
    const newResource = {
      id,
      name: resourceData.name,
      uri: resourceData.uri,
      content: resourceData.content,
      userId: resourceData.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.resources.set(id, newResource);
    logger.info(`Created resource: ${id}`, { userId: resourceData.userId });
    
    return newResource;
  }

  // Update a resource
  async updateResource(resourceId, updates, userId) {
    // First check regular resources
    const resource = this.resources.get(resourceId);
    if (resource) {
      if (resource.userId !== userId) {
        throw new ResourceNotFoundError(resourceId);
      }
      
      // Update only allowed fields
      if (updates.name !== undefined) resource.name = updates.name;
      if (updates.uri !== undefined) resource.uri = updates.uri;
      if (updates.content !== undefined) resource.content = updates.content;
      resource.updatedAt = new Date().toISOString();
      
      this.resources.set(resourceId, resource);
      logger.info(`Updated resource: ${resourceId}`, { userId });
      
      return resource;
    }
    
    // If not found in regular resources, try agent resources
    const agentResource = await agentResourceService.updateResource(resourceId, updates, userId);
    if (agentResource) {
      return agentResource;
    }
    
    throw new ResourceNotFoundError(resourceId);
  }

  // Delete a resource
  async deleteResource(resourceId, userId) {
    // First check regular resources
    const resource = this.resources.get(resourceId);
    if (resource) {
      if (resource.userId !== userId) {
        throw new ResourceNotFoundError(resourceId);
      }
      
      this.resources.delete(resourceId);
      logger.info(`Deleted resource: ${resourceId}`, { userId });
      
      return true;
    }
    
    // If not found in regular resources, try agent resources
    const deleted = await agentResourceService.deleteResource(resourceId, userId);
    if (deleted) {
      return true;
    }
    
    throw new ResourceNotFoundError(resourceId);
  }

  // List resource templates
  async listResourceTemplates() {
    // Combine regular templates with agent templates
    const regularTemplates = this.resourceTemplates;
    const agentTemplates = await agentResourceService.listResourceTemplates();
    
    return [...regularTemplates, ...agentTemplates];
  }

  // Get specific resource template
  async getResourceTemplate(templateId) {
    // First check regular templates
    const template = this.resourceTemplates.find(template => template.name === templateId);
    if (template) {
      return template;
    }
    
    // If not found, check agent templates
    const agentTemplate = await agentResourceService.getResourceTemplate(templateId);
    if (agentTemplate) {
      return agentTemplate;
    }
    
    throw new ResourceTemplateNotFoundError(templateId);
  }
}

module.exports = {
  resourceService: new ResourceService(),
};