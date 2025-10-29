/**
 * Tool Service for Rube MCP Server
 * Manages tools and their execution
 */

const { logger } = require('../utils/logger');
const { validate } = require('jsonschema');
const { appIntegrationService } = require('./appIntegrationService');
const { agentToolService } = require('./agentToolService');
const { ToolNotFoundError, AuthenticationError } = require('../utils/errors');

class ToolService {
  constructor() {
    // Define available tools with their schemas
    this.tools = {
      'gmail-send-email': {
        name: 'gmail-send-email',
        description: 'Send an email using Gmail',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient email address' },
            subject: { type: 'string', description: 'Email subject' },
            body: { type: 'string', description: 'Email body content' },
          },
          required: ['to', 'subject', 'body'],
        },
      },
      'github-create-issue': {
        name: 'github-create-issue',
        description: 'Create a GitHub issue',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            title: { type: 'string', description: 'Issue title' },
            body: { type: 'string', description: 'Issue description' },
          },
          required: ['owner', 'repo', 'title'],
        },
      },
      'slack-send-message': {
        name: 'slack-send-message',
        description: 'Send a message to a Slack channel',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Slack channel ID or name' },
            text: { type: 'string', description: 'Message text' },
          },
          required: ['channel', 'text'],
        },
      },
    };
  }

  // List all available tools
  async listTools(userId) {
    // In a real implementation, this might filter tools based on user permissions
    return Object.values(this.tools);
  }

  // Get specific tool details
  async getTool(toolId, userId) {
    const tool = this.tools[toolId];
    if (!tool) {
      throw new ToolNotFoundError(toolId);
    }
    return tool;
  }

  // Validate tool input against schema
  async validateToolInput(toolId, input) {
    const tool = this.tools[toolId];
    if (!tool) {
      throw new ToolNotFoundError(toolId);
    }

    const validation = validate(input, tool.inputSchema);
    if (!validation.valid) {
      const error = new Error(`Invalid input for tool ${toolId}`);
      error.code = 'VALIDATION_ERROR';
      error.validationErrors = validation.errors;
      throw error;
    }

    return true;
  }

  // Execute a tool
  async executeTool(toolId, args, userId, options = {}) {
    if (!userId) {
      throw new AuthenticationError('User authentication required to execute tools');
    }
    
    logger.info(`Executing tool: ${toolId}`, { userId, toolId, args, options });
    
    // Check if this is an agent tool
    const isAgentTool = toolId.startsWith('agent-') || 
                       toolId.startsWith('workflow-') ||
                       this.isAgentSpecificTool(toolId);
    
    if (isAgentTool) {
      // Use agent tool service for agent-specific tools
      return await agentToolService.executeTool(toolId, args, userId, options);
    }
    
    // Use existing logic for standard tools
    switch (toolId) {
      case 'gmail-send-email':
        return await appIntegrationService.sendGmail(userId, args);
        
      case 'github-create-issue':
        return await appIntegrationService.createGithubIssue(userId, args);
        
      case 'slack-send-message':
        return await appIntegrationService.sendSlackMessage(userId, args);
        
      default:
        throw new ToolNotFoundError(toolId);
    }
  }

  // Check if tool is agent-specific
  isAgentSpecificTool(toolId) {
    const agentToolPrefixes = ['agent-', 'app-', 'workflow-'];
    return agentToolPrefixes.some(prefix => toolId.startsWith(prefix));
  }

  // Execute a tool with streaming response
  async executeToolStream(toolId, args, userId, options = {}) {
    if (!userId) {
      const error = new Error('User authentication required to execute tools');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      throw error;
    }
    
    // Check if this is an agent tool
    const isAgentTool = toolId.startsWith('agent-') || 
                       toolId.startsWith('workflow-') ||
                       this.isAgentSpecificTool(toolId);
    
    if (isAgentTool) {
      // Use agent tool service for agent-specific tools
      return await agentToolService.executeToolStream(toolId, args, userId, options);
    }
    
    // Create a readable stream for streaming responses
    const { Readable } = require('stream');
    
    // Create a proper stream for the response following Server-Sent Events format
    const stream = new Readable({
      read() {}
    });
    
    // Execute the tool and send results in chunks
    setImmediate(async () => {
      try {
        // For now, we'll send the complete result as a single event
        // In a real implementation with actual streaming tools, 
        // this would send multiple events as the tool executes
        const result = await this.executeTool(toolId, args, userId, options);
        
        // Send the result as a single data event
        stream.push(`data: ${JSON.stringify({ result })}\n\n`);
        
        // Send the completion event
        stream.push(`data: ${JSON.stringify({ done: true })}\n\n`);
        
        // End the stream
        stream.push(null);
      } catch (error) {
        // Send error event
        stream.push(`data: ${JSON.stringify({ 
          error: { 
            message: error.message, 
            code: error.code || 'STREAM_ERROR',
            type: 'error'
          } 
        })}\n\n`);
        
        // End the stream
        stream.push(null);
      }
    });
    
    return stream;
  }
}

module.exports = {
  toolService: new ToolService(),
};