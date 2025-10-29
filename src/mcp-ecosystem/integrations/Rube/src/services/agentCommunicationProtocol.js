/**
 * Agent Communication Protocols for Rube MCP Server
 * Implements MCP standard communication protocols for agent interactions
 */

const { logger } = require('../utils/logger');
const { agentService } = require('./agentService');
const { agentConfigManager } = require('./agentConfigManager');
const { validate } = require('jsonschema');

class AgentCommunicationProtocol {
  constructor() {
    this.protocolVersion = '2025-07-09';
    this.supportedTransports = ['http', 'streamable-http', 'stdio'];
    this.messageQueue = new Map(); // Store pending messages
    this.messageIdCounter = 0;
  }

  /**
   * Create a new message ID
   * @returns {string} Unique message ID
   */
  generateMessageId() {
    this.messageIdCounter++;
    return `msg_${Date.now()}_${this.messageIdCounter}`;
  }

  /**
   * Format MCP request according to protocol specification
   * @param {string} method - MCP method (e.g., tools/call, resources/read)
   * @param {Object} params - Request parameters
   * @param {string} requestId - Request identifier
   * @returns {Object} Formatted MCP request
   */
  formatRequest(method, params, requestId = null) {
    const formattedRequest = {
      jsonrpc: '2.0',
      method,
      params: params || {},
      id: requestId || this.generateMessageId(),
    };

    // Add protocol version if available
    if (this.protocolVersion) {
      formattedRequest.mcp_version = this.protocolVersion;
    }

    return formattedRequest;
  }

  /**
   * Format MCP response according to protocol specification
   * @param {any} result - Response result
   * @param {string} id - Request ID
   * @param {Object} error - Error object if applicable
   * @returns {Object} Formatted MCP response
   */
  formatResponse(result, id, error = null) {
    const response = {
      jsonrpc: '2.0',
      id,
    };

    if (error) {
      response.error = {
        code: error.code || -32603,
        message: error.message || 'Internal error',
        data: error.data || {},
      };
    } else {
      response.result = result;
    }

    return response;
  }

  /**
   * Validate MCP request format
   * @param {Object} request - MCP request to validate
   * @returns {Object} Validation result
   */
  validateRequest(request) {
    const schema = {
      type: 'object',
      properties: {
        jsonrpc: { type: 'string', enum: ['2.0'] },
        method: { type: 'string' },
        params: { type: 'object' },
        id: { type: ['string', 'number'] },
      },
      required: ['jsonrpc', 'method'],
    };

    const validation = validate(request, schema);
    return {
      valid: validation.valid,
      errors: validation.errors.map(err => err.stack),
    };
  }

  /**
   * Handle incoming MCP request
   * @param {Object} request - Incoming MCP request
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} MCP response
   */
  async handleRequest(request, userId) {
    const validation = this.validateRequest(request);
    if (!validation.valid) {
      return this.formatResponse(null, request.id, {
        code: -32600,
        message: 'Invalid Request',
        data: { validationErrors: validation.errors },
      });
    }

    try {
      // Extract method and parameters
      const { method, params, id } = request;
      
      // Route to appropriate handler based on method
      let result;
      
      if (method.startsWith('tools/')) {
        result = await this.handleToolRequest(method, params, userId);
      } else if (method.startsWith('resources/')) {
        result = await this.handleResourceRequest(method, params, userId);
      } else if (method.startsWith('prompts/')) {
        result = await this.handlePromptRequest(method, params, userId);
      } else {
        return this.formatResponse(null, id, {
          code: -32601,
          message: 'Method not found',
        });
      }

      return this.formatResponse(result, id);
    } catch (error) {
      logger.error('Error handling MCP request:', error.message, { 
        method: request.method, 
        userId: userId,
        requestId: request.id 
      });

      return this.formatResponse(null, request.id, {
        code: error.code || -32603,
        message: error.message,
        data: {
          originalMethod: request.method,
        },
      });
    }
  }

  /**
   * Handle tool-related MCP requests
   * @private
   */
  async handleToolRequest(method, params, userId) {
    const [_, action, toolId] = method.split('/');
    
    switch (action) {
      case 'list':
        return await this.listTools(userId);
      case 'read':
        return await this.getTool(toolId, userId);
      case 'call':
        return await this.callTool(toolId, params, userId);
      default:
        throw new Error(`Unknown tool action: ${action}`);
    }
  }

  /**
   * Handle resource-related MCP requests
   * @private
   */
  async handleResourceRequest(method, params, userId) {
    const [_, action, resourceId] = method.split('/');
    
    switch (action) {
      case 'list':
        return await this.listResources(userId);
      case 'read':
        return await this.getResource(resourceId, userId);
      case 'create':
        return await this.createResource(params, userId);
      case 'update':
        return await this.updateResource(resourceId, params, userId);
      case 'delete':
        return await this.deleteResource(resourceId, userId);
      default:
        throw new Error(`Unknown resource action: ${action}`);
    }
  }

  /**
   * Handle prompt-related MCP requests
   * @private
   */
  async handlePromptRequest(method, params, userId) {
    const [_, action, promptId] = method.split('/');
    
    switch (action) {
      case 'list':
        return await this.listPrompts(userId);
      case 'read':
        return await this.getPrompt(promptId, userId);
      case 'expand':
        return await this.expandPrompt(promptId, params, userId);
      default:
        throw new Error(`Unknown prompt action: ${action}`);
    }
  }

  /**
   * List available tools through agent
   */
  async listTools(userId) {
    // In a real implementation, this would use the agent to discover tools
    // For now, return the tools from the existing tool service
    const { toolService } = require('./toolService');
    return await toolService.listTools(userId);
  }

  /**
   * Get specific tool through agent
   */
  async getTool(toolId, userId) {
    // In a real implementation, this would use the agent to get tool details
    const { toolService } = require('./toolService');
    return await toolService.getTool(toolId, userId);
  }

  /**
   * Call a tool through agent
   */
  async callTool(toolId, params, userId) {
    // Extract agent information from parameters if present
    const agentId = params.agentId || 'default';
    const sessionId = params.sessionId;
    
    // Initialize agent if it doesn't exist
    const agent = agentService.getAgent(agentId);
    if (!agent) {
      const config = agentConfigManager.createDefaultConfig(agentId, {
        supportedApps: ['gmail', 'github', 'slack'], // Default supported apps
      });
      await agentService.initializeAgent(agentId, config);
    }

    // If no session ID provided, create a temporary session
    let actualSessionId = sessionId;
    if (!sessionId) {
      const session = await agentService.startSession(agentId, userId, {
        requiredApps: this.extractRequiredAppsFromTool(toolId),
      });
      actualSessionId = session.id;
    }

    try {
      // Prepare action for the agent
      const action = this.mapToolToAction(toolId, params);
      
      // Execute through agent
      const result = await agentService.executeAction(
        agentId, 
        actualSessionId, 
        action, 
        userId
      );
      
      return result.result;
    } finally {
      // If we created a temporary session, clean it up
      if (!sessionId) {
        try {
          await agentService.stopSession(actualSessionId);
        } catch (error) {
          logger.error('Error stopping temporary session:', error.message);
        }
      }
    }
  }

  /**
   * Map tool ID to agent action
   * @private
   */
  mapToolToAction(toolId, params) {
    // Map existing tool IDs to agent actions
    switch (toolId) {
      case 'gmail-send-email':
        return {
          appId: 'gmail',
          operation: 'sendEmail',
          params: params,
        };
      case 'github-create-issue':
        return {
          appId: 'github',
          operation: 'createIssue',
          params: params,
        };
      case 'slack-send-message':
        return {
          appId: 'slack',
          operation: 'sendMessage',
          params: params,
        };
      default:
        // For other tools, try to determine the app from the tool name
        const [app, ...operationParts] = toolId.split('-');
        return {
          appId: app,
          operation: operationParts.join('_'),
          params: params,
        };
    }
  }

  /**
   * Extract required apps from tool ID
   * @private
   */
  extractRequiredAppsFromTool(toolId) {
    const [app] = toolId.split('-');
    return [app];
  }

  /**
   * List resources through agent
   */
  async listResources(userId) {
    // In a real implementation, this would use the agent to list resources
    const { resourceService } = require('./resourceService');
    return await resourceService.listResources(userId);
  }

  /**
   * Get specific resource through agent
   */
  async getResource(resourceId, userId) {
    // In a real implementation, this would use the agent to get resource
    const { resourceService } = require('./resourceService');
    return await resourceService.getResource(resourceId, userId);
  }

  /**
   * Create resource through agent
   */
  async createResource(params, userId) {
    // In a real implementation, this would use the agent to create resource
    const { resourceService } = require('./resourceService');
    return await resourceService.createResource({ ...params, userId });
  }

  /**
   * Update resource through agent
   */
  async updateResource(resourceId, params, userId) {
    // In a real implementation, this would use the agent to update resource
    const { resourceService } = require('./resourceService');
    return await resourceService.updateResource(resourceId, params, userId);
  }

  /**
   * Delete resource through agent
   */
  async deleteResource(resourceId, userId) {
    // In a real implementation, this would use the agent to delete resource
    const { resourceService } = require('./resourceService');
    return await resourceService.deleteResource(resourceId, userId);
  }

  /**
   * List prompts through agent
   */
  async listPrompts(userId) {
    // In a real implementation, this would use the agent to list prompts
    const { promptService } = require('./promptService');
    return await promptService.listPrompts(userId);
  }

  /**
   * Get specific prompt through agent
   */
  async getPrompt(promptId, userId) {
    // In a real implementation, this would use the agent to get prompt
    const { promptService } = require('./promptService');
    return await promptService.getPrompt(promptId, userId);
  }

  /**
   * Expand prompt through agent
   */
  async expandPrompt(promptId, params, userId) {
    // In a real implementation, this would use the agent to expand prompt
    const { promptService } = require('./promptService');
    return await promptService.expandPrompt(promptId, params);
  }

  /**
   * Handle streaming response for streamable HTTP transport
   * @param {Object} request - MCP request
   * @param {string} userId - User identifier
   * @returns {ReadableStream} Streaming response
   */
  async handleStreamRequest(request, userId) {
    const { Readable } = require('stream');
    
    const stream = new Readable({
      read() {}
    });
    
    setImmediate(async () => {
      try {
        // Handle the request and stream results
        const response = await this.handleRequest(request, userId);
        
        // Send response as Server-Sent Events
        stream.push(`data: ${JSON.stringify(response)}\n\n`);
        
        // Send completion event
        stream.push(`data: ${JSON.stringify({ done: true })}\n\n`);
        
        stream.push(null); // End stream
      } catch (error) {
        // Send error as event
        stream.push(`data: ${JSON.stringify({ 
          error: { 
            message: error.message, 
            code: error.code || 'STREAM_ERROR',
            type: 'error'
          } 
        })}\n\n`);
        
        stream.push(null); // End stream
      }
    });
    
    return stream;
  }

  /**
   * Get protocol capabilities
   * @returns {Object} Protocol capabilities
   */
  getCapabilities() {
    return {
      protocolVersion: this.protocolVersion,
      supportedTransports: this.supportedTransports,
      supportedMethods: [
        'tools/list',
        'tools/read',
        'tools/call',
        'resources/list',
        'resources/read',
        'resources/create',
        'resources/update',
        'resources/delete',
        'prompts/list',
        'prompts/read',
        'prompts/expand',
      ],
      extensions: [
        'agent-integration',
        'multi-app-workflows',
        'real-time-sync',
      ],
    };
  }

  /**
   * Validate agent compatibility with protocol
   * @param {Object} agent - Agent instance
   * @returns {Object} Compatibility result
   */
  validateAgentCompatibility(agent) {
    const capabilities = agent.capabilities || [];
    const requiredCapabilities = [
      'app-integration',
      'multi-app-workflows',
    ];
    
    const missingCapabilities = requiredCapabilities.filter(
      cap => !capabilities.includes(cap)
    );
    
    return {
      compatible: missingCapabilities.length === 0,
      missingCapabilities,
      supportedCapabilities: capabilities,
    };
  }
}

module.exports = {
  agentCommunicationProtocol: new AgentCommunicationProtocol(),
};