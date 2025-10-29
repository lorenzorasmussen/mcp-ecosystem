/**
 * Specialized Agent Tools for Rube MCP Server
 * Implements tools specifically designed for agent-to-app communication
 */

const { logger } = require('../utils/logger');
const { appIntegrationService } = require('./appIntegrationService');
const { agentService } = require('./agentService');
const { agentAuthManager } = require('./agentAuthManager');
const { validate } = require('jsonschema');

class AgentToolService {
  constructor() {
    this.tools = new Map();
    this.initializeAgentTools();
  }

  /**
   * Initialize agent-specific tools
   * @private
   */
  initializeAgentTools() {
    // Agent management tools
    this.registerTool('agent-info', {
      name: 'agent-info',
      description: 'Get information about a specific agent',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'ID of the agent to get info for' },
        },
        required: ['agentId'],
      },
    });

    this.registerTool('agent-list', {
      name: 'agent-list',
      description: 'List all available agents',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    });

    // App integration tools
    this.registerTool('app-list', {
      name: 'app-list',
      description: 'List all available apps for integration',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'ID of the agent to scope results' },
        },
      },
    });

    this.registerTool('app-status', {
      name: 'app-status',
      description: 'Get status of an app integration for the user',
      inputSchema: {
        type: 'object',
        properties: {
          appId: { type: 'string', description: 'ID of the app to check status for' },
        },
        required: ['appId'],
      },
    });

    // Gmail tools
    this.registerTool('gmail-send-email', {
      name: 'gmail-send-email',
      description: 'Send an email using Gmail through the agent',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject' },
          body: { type: 'string', description: 'Email body content' },
          cc: { type: 'array', items: { type: 'string' }, description: 'CC recipients' },
          bcc: { type: 'array', items: { type: 'string' }, description: 'BCC recipients' },
        },
        required: ['to', 'subject', 'body'],
      },
    });

    this.registerTool('gmail-search-emails', {
      name: 'gmail-search-emails',
      description: 'Search emails in Gmail through the agent',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          maxResults: { type: 'number', description: 'Maximum number of results to return' },
        },
        required: ['query'],
      },
    });

    // GitHub tools
    this.registerTool('github-create-issue', {
      name: 'github-create-issue',
      description: 'Create a GitHub issue through the agent',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner' },
          repo: { type: 'string', description: 'Repository name' },
          title: { type: 'string', description: 'Issue title' },
          body: { type: 'string', description: 'Issue description' },
          labels: { type: 'array', items: { type: 'string' }, description: 'Labels to apply' },
        },
        required: ['owner', 'repo', 'title'],
      },
    });

    this.registerTool('github-create-pull-request', {
      name: 'github-create-pull-request',
      description: 'Create a GitHub pull request through the agent',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner' },
          repo: { type: 'string', description: 'Repository name' },
          title: { type: 'string', description: 'Pull request title' },
          body: { type: 'string', description: 'Pull request description' },
          head: { type: 'string', description: 'Source branch' },
          base: { type: 'string', description: 'Target branch' },
        },
        required: ['owner', 'repo', 'title', 'head', 'base'],
      },
    });

    // Slack tools
    this.registerTool('slack-send-message', {
      name: 'slack-send-message',
      description: 'Send a message to a Slack channel through the agent',
      inputSchema: {
        type: 'object',
        properties: {
          channel: { type: 'string', description: 'Slack channel ID or name' },
          text: { type: 'string', description: 'Message text' },
          thread_ts: { type: 'string', description: 'Thread timestamp to reply in' },
        },
        required: ['channel', 'text'],
      },
    });

    this.registerTool('slack-search-messages', {
      name: 'slack-search-messages',
      description: 'Search messages in Slack through the agent',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          channel: { type: 'string', description: 'Specific channel to search in' },
          count: { type: 'number', description: 'Number of results to return' },
        },
        required: ['query'],
      },
    });

    // Multi-app workflow tools
    this.registerTool('workflow-execute', {
      name: 'workflow-execute',
      description: 'Execute a multi-app workflow through the agent',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Workflow name' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                appId: { type: 'string', description: 'App ID for the step' },
                operation: { type: 'string', description: 'Operation to perform' },
                params: { type: 'object', description: 'Parameters for the operation' },
              },
              required: ['appId', 'operation', 'params'],
            },
          },
        },
        required: ['name', 'steps'],
      },
    });

    logger.info('Agent tools initialized', { count: this.tools.size });
  }

  /**
   * Register a new tool
   * @param {string} toolId - Tool identifier
   * @param {Object} toolDefinition - Tool definition
   */
  registerTool(toolId, toolDefinition) {
    this.tools.set(toolId, {
      id: toolId,
      ...toolDefinition,
    });
  }

  /**
   * Get all available tools
   * @param {string} userId - User identifier
   * @returns {Array} Array of available tools
   */
  async listTools(userId) {
    // In a real implementation, this might filter tools based on user permissions
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }

  /**
   * Get specific tool by ID
   * @param {string} toolId - Tool identifier
   * @param {string} userId - User identifier
   * @returns {Object|null} Tool definition or null if not found
   */
  async getTool(toolId, userId) {
    return this.tools.get(toolId) || null;
  }

  /**
   * Validate tool input against schema
   * @param {string} toolId - Tool identifier
   * @param {Object} input - Input to validate
   * @returns {Promise<boolean>} True if valid, throws error if invalid
   */
  async validateToolInput(toolId, input) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    const validation = validate(input, tool.inputSchema);
    if (!validation.valid) {
      const error = new Error(`Invalid input for tool ${toolId}`);
      error.code = 'VALIDATION_ERROR';
      error.validationErrors = validation.errors.map(err => err.stack);
      throw error;
    }

    return true;
  }

  /**
   * Execute a tool through the agent
   * @param {string} toolId - Tool identifier
   * @param {Object} args - Tool arguments
   * @param {string} userId - User identifier
   * @param {Object} options - Execution options
   * @returns {Promise<any>} Tool execution result
   */
  async executeTool(toolId, args, userId, options = {}) {
    logger.info(`Executing agent tool: ${toolId}`, { 
      toolId, 
      userId, 
      args: Object.keys(args) 
    });

    // Validate tool exists
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    // Validate input
    await this.validateToolInput(toolId, args);

    // Determine agent to use
    const agentId = options.agentId || 'default';
    const sessionId = options.sessionId;

    // Initialize agent if it doesn't exist
    let agent = agentService.getAgent(agentId);
    if (!agent) {
      const { agentConfigManager } = require('./agentConfigManager');
      const config = agentConfigManager.createDefaultConfig(agentId, {
        supportedApps: this.getSupportedAppsForTool(toolId),
      });
      agent = await agentService.initializeAgent(agentId, config);
    }

    // Create or validate session
    let actualSessionId = sessionId;
    let createdSession = false;

    if (sessionId) {
      const session = agentAuthManager.validateSession(sessionId, userId);
      if (!session) {
        throw new Error(`Invalid or expired session: ${sessionId}`);
      }
    } else {
      // Create a temporary session
      const session = await agentAuthManager.createSession(agentId, userId, {
        requiredApps: this.getRequiredAppsForTool(toolId),
        permissions: this.getDefaultPermissionsForTool(toolId),
      });
      actualSessionId = session.id;
      createdSession = true;
    }

    try {
      // Check permissions
      if (!agentAuthManager.hasPermission(actualSessionId, 'execute', this.getAppForTool(toolId))) {
        throw new Error(`Agent session ${actualSessionId} does not have permission to execute tool ${toolId}`);
      }

      // Execute the tool based on its ID
      let result;
      switch (toolId) {
        // Agent management tools
        case 'agent-info':
          result = await this.executeAgentInfo(args, userId);
          break;
        case 'agent-list':
          result = await this.executeAgentList(args, userId);
          break;
        case 'app-list':
          result = await this.executeAppList(args, userId);
          break;
        case 'app-status':
          result = await this.executeAppStatus(args, userId);
          break;

        // Gmail tools
        case 'gmail-send-email':
          result = await this.executeGmailSendEmail(args, userId);
          break;
        case 'gmail-search-emails':
          result = await this.executeGmailSearchEmails(args, userId);
          break;

        // GitHub tools
        case 'github-create-issue':
          result = await this.executeGithubCreateIssue(args, userId);
          break;
        case 'github-create-pull-request':
          result = await this.executeGithubCreatePullRequest(args, userId);
          break;

        // Slack tools
        case 'slack-send-message':
          result = await this.executeSlackSendMessage(args, userId);
          break;
        case 'slack-search-messages':
          result = await this.executeSlackSearchMessages(args, userId);
          break;

        // Workflow tools
        case 'workflow-execute':
          result = await this.executeWorkflow(args, userId);
          break;

        default:
          throw new Error(`Unknown tool: ${toolId}`);
      }

      logger.info(`Agent tool executed successfully: ${toolId}`, { 
        toolId, 
        userId, 
        sessionId: actualSessionId 
      });

      return result;
    } catch (error) {
      logger.error(`Agent tool execution failed: ${toolId}`, error.message, { 
        toolId, 
        userId, 
        sessionId: actualSessionId 
      });

      throw error;
    } finally {
      // Clean up temporary session
      if (createdSession && actualSessionId) {
        try {
          agentAuthManager.endSession(actualSessionId);
        } catch (cleanupError) {
          logger.error('Error cleaning up temporary session:', cleanupError.message);
        }
      }
    }
  }

  /**
   * Execute tool with streaming response
   * @param {string} toolId - Tool identifier
   * @param {Object} args - Tool arguments
   * @param {string} userId - User identifier
   * @param {Object} options - Execution options
   * @returns {ReadableStream} Streaming response
   */
  async executeToolStream(toolId, args, userId, options = {}) {
    const { Readable } = require('stream');

    const stream = new Readable({
      read() {}
    });

    setImmediate(async () => {
      try {
        // Execute the tool and stream results
        const result = await this.executeTool(toolId, args, userId, options);

        // Send result as data event
        stream.push(`data: ${JSON.stringify({ result })}\n\n`);

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
   * Get required apps for a tool
   * @private
   */
  getRequiredAppsForTool(toolId) {
    const appMap = {
      'gmail-send-email': ['gmail'],
      'gmail-search-emails': ['gmail'],
      'github-create-issue': ['github'],
      'github-create-pull-request': ['github'],
      'slack-send-message': ['slack'],
      'slack-search-messages': ['slack'],
      'workflow-execute': [], // Will be determined by workflow steps
    };

    return appMap[toolId] || [];
  }

  /**
   * Get supported apps for a tool
   * @private
   */
  getSupportedAppsForTool(toolId) {
    const [app] = toolId.split('-');
    return [app];
  }

  /**
   * Get app for a tool
   * @private
   */
  getAppForTool(toolId) {
    const [app] = toolId.split('-');
    return app;
  }

  /**
   * Get default permissions for a tool
   * @private
   */
  getDefaultPermissionsForTool(toolId) {
    const app = this.getAppForTool(toolId);
    return {
      execute: true,
      apps: {
        [app]: {
          execute: true,
        }
      }
    };
  }

  /**
   * Execute agent-info tool
   * @private
   */
  async executeAgentInfo(args, userId) {
    const agent = agentService.getAgent(args.agentId);
    if (!agent) {
      throw new Error(`Agent ${args.agentId} not found`);
    }

    return agentService.getAgentCapabilities(args.agentId);
  }

  /**
   * Execute agent-list tool
   * @private
   */
  async executeAgentList(args, userId) {
    return {
      agents: agentService.listAgents(),
      total: agentService.listAgents().length,
    };
  }

  /**
   * Execute app-list tool
   * @private
   */
  async executeAppList(args, userId) {
    // In a real implementation, this would return all supported apps
    // For now, return the basic set we have
    return {
      apps: [
        { id: 'gmail', name: 'Gmail', connected: true },
        { id: 'github', name: 'GitHub', connected: true },
        { id: 'slack', name: 'Slack', connected: true },
        // This would include all 500+ supported apps
      ],
      total: 3, // Would be 500+ in real implementation
    };
  }

  /**
   * Execute app-status tool
   * @private
   */
  async executeAppStatus(args, userId) {
    const connection = await require('../database/models/AppConnection')
      .findByUserIdAndAppId(userId, args.appId);
    
    return {
      appId: args.appId,
      connected: !!connection && connection.active,
      lastSync: connection?.updatedAt || null,
    };
  }

  /**
   * Execute gmail-send-email tool
   * @private
   */
  async executeGmailSendEmail(args, userId) {
    return await appIntegrationService.sendGmail(userId, args);
  }

  /**
   * Execute gmail-search-emails tool
   * @private
   */
  async executeGmailSearchEmails(args, userId) {
    // This would be implemented in the app integration service
    // For now, we'll return a placeholder
    return {
      success: true,
      emails: [],
      query: args.query,
      total: 0,
    };
  }

  /**
   * Execute github-create-issue tool
   * @private
   */
  async executeGithubCreateIssue(args, userId) {
    return await appIntegrationService.createGithubIssue(userId, args);
  }

  /**
   * Execute github-create-pull-request tool
   * @private
   */
  async executeGithubCreatePullRequest(args, userId) {
    // This would be implemented in the app integration service
    // For now, we'll return a placeholder
    return {
      success: true,
      pullRequest: {
        id: 'pr_12345',
        url: 'https://github.com/example/repo/pull/1',
        title: args.title,
      },
    };
  }

  /**
   * Execute slack-send-message tool
   * @private
   */
  async executeSlackSendMessage(args, userId) {
    return await appIntegrationService.sendSlackMessage(userId, args);
  }

  /**
   * Execute slack-search-messages tool
   * @private
   */
  async executeSlackSearchMessages(args, userId) {
    // This would be implemented in the app integration service
    // For now, we'll return a placeholder
    return {
      success: true,
      messages: [],
      query: args.query,
      total: 0,
    };
  }

  /**
   * Execute workflow-execute tool
   * @private
   */
  async executeWorkflow(args, userId) {
    const results = [];
    
    for (const step of args.steps) {
      try {
        // Execute each step in the workflow
        const stepResult = await this.executeTool(
          `${step.appId}-${step.operation.replace(/_/g, '-')}`,
          step.params,
          userId
        );
        
        results.push({
          step: step.operation,
          appId: step.appId,
          success: true,
          result: stepResult,
        });
      } catch (error) {
        results.push({
          step: step.operation,
          appId: step.appId,
          success: false,
          error: error.message,
        });
        
        // Depending on workflow configuration, we might stop on error
        // or continue with other steps
        if (args.failOnError !== false) {
          break;
        }
      }
    }
    
    return {
      workflowName: args.name,
      completed: results.filter(r => r.success).length === args.steps.length,
      results,
      totalSteps: args.steps.length,
      successfulSteps: results.filter(r => r.success).length,
    };
  }
}

module.exports = {
  agentToolService: new AgentToolService(),
};