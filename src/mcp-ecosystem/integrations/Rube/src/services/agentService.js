/**
 * Agent Service for Rube MCP Server
 * Implements specialized MCP agent functionality for interacting with 500+ apps
 */

const { logger } = require('../utils/logger');
const { appIntegrationService } = require('./appIntegrationService');
const { config } = require('../config');
const AppConnection = require('../database/models/AppConnection');

class AgentService {
  constructor() {
    this.agents = new Map(); // Store active agents
    this.agentSessions = new Map(); // Store agent session data
    this.maxConcurrentAgents = config.mcp.maxConcurrentAgents || 100;
  }

  /**
   * Initialize a new agent instance
   * @param {string} agentId - Unique identifier for the agent
   * @param {Object} options - Agent configuration options
   * @returns {Promise<Object>} Agent instance
   */
  async initializeAgent(agentId, options = {}) {
    if (this.agents.size >= this.maxConcurrentAgents) {
      throw new Error(`Maximum concurrent agents limit (${this.maxConcurrentAgents}) reached`);
    }

    // Validate agent configuration
    if (!agentId || typeof agentId !== 'string') {
      throw new Error('Agent ID is required and must be a string');
    }

    // Create agent instance
    const agent = {
      id: agentId,
      name: options.name || `Agent-${agentId}`,
      description: options.description || 'MCP Agent for app integration',
      status: 'initialized',
      capabilities: options.capabilities || [],
      supportedApps: options.supportedApps || [],
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      config: {
        timeout: options.timeout || config.mcp.timeout || 30000,
        maxRetries: options.maxRetries || 3,
        retryDelay: options.retryDelay || 1000,
        ...options.config,
      },
    };

    // Store the agent
    this.agents.set(agentId, agent);
    
    logger.info(`Agent initialized: ${agentId}`, { agentId, capabilities: agent.capabilities });

    return agent;
  }

  /**
   * Get agent by ID
   * @param {string} agentId - Agent identifier
   * @returns {Object|null} Agent instance or null if not found
   */
  getAgent(agentId) {
    return this.agents.get(agentId) || null;
  }

  /**
   * List all active agents
   * @returns {Array} Array of agent instances
   */
  listAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Start an agent session
   * @param {string} agentId - Agent identifier
   * @param {string} userId - User identifier
   * @param {Object} sessionConfig - Session configuration
   * @returns {Promise<Object>} Session information
   */
  async startSession(agentId, userId, sessionConfig = {}) {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Validate user has access to required apps
    const requiredApps = sessionConfig.requiredApps || [];
    for (const appId of requiredApps) {
      const connection = await AppConnection.findByUserIdAndAppId(userId, appId);
      if (!connection || !connection.active) {
        throw new Error(`User ${userId} does not have active connection to required app: ${appId}`);
      }
    }

    // Create session
    const sessionId = require('uuid').v4();
    const session = {
      id: sessionId,
      agentId,
      userId,
      status: 'active',
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      config: sessionConfig,
      activeConnections: new Set(requiredApps),
    };

    this.agentSessions.set(sessionId, session);
    agent.lastActive = new Date().toISOString();

    logger.info(`Agent session started: ${sessionId}`, { 
      agentId, 
      userId, 
      requiredApps 
    });

    return session;
  }

  /**
   * Execute an action through the agent
   * @param {string} agentId - Agent identifier
   * @param {string} sessionId - Session identifier
   * @param {Object} action - Action to execute
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Action result
   */
  async executeAction(agentId, sessionId, action, userId) {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const session = this.agentSessions.get(sessionId);
    if (!session || session.status !== 'active' || session.userId !== userId) {
      throw new Error(`Invalid or inactive session: ${sessionId}`);
    }

    // Validate action
    if (!action || !action.appId || !action.operation) {
      throw new Error('Action must include appId and operation');
    }

    // Check if agent supports the app
    if (agent.supportedApps.length > 0 && !agent.supportedApps.includes(action.appId)) {
      throw new Error(`Agent ${agentId} does not support app: ${action.appId}`);
    }

    // Check if session has access to the app
    if (!session.activeConnections.has(action.appId)) {
      throw new Error(`Session ${sessionId} does not have access to app: ${action.appId}`);
    }

    try {
      // Update session activity
      session.lastActivity = new Date().toISOString();
      agent.lastActive = new Date().toISOString();

      // Execute the action based on app and operation
      let result;
      switch (action.appId) {
        case 'gmail':
          result = await this.executeGmailAction(action, userId);
          break;
        case 'github':
          result = await this.executeGithubAction(action, userId);
          break;
        case 'slack':
          result = await this.executeSlackAction(action, userId);
          break;
        default:
          // For other apps, try to find a generic integration
          result = await this.executeGenericAppAction(action, userId);
      }

      logger.info(`Action executed successfully by agent ${agentId}`, { 
        agentId, 
        userId, 
        appId: action.appId,
        operation: action.operation,
        sessionId 
      });

      return {
        success: true,
        result,
        executedAt: new Date().toISOString(),
        agentId,
        sessionId,
      };
    } catch (error) {
      logger.error(`Action execution failed for agent ${agentId}:`, error.message, { 
        agentId, 
        userId, 
        appId: action.appId,
        operation: action.operation,
        sessionId 
      });

      throw error;
    }
  }

  /**
   * Execute Gmail-specific action
   * @private
   */
  async executeGmailAction(action, userId) {
    switch (action.operation) {
      case 'sendEmail':
        return await appIntegrationService.sendGmail(userId, action.params);
      case 'listEmails':
        return await appIntegrationService.listGmail(userId, action.params);
      case 'searchEmails':
        return await appIntegrationService.searchGmail(userId, action.params);
      default:
        throw new Error(`Unsupported Gmail operation: ${action.operation}`);
    }
  }

  /**
   * Execute GitHub-specific action
   * @private
   */
  async executeGithubAction(action, userId) {
    switch (action.operation) {
      case 'createIssue':
        return await appIntegrationService.createGithubIssue(userId, action.params);
      case 'createPullRequest':
        return await appIntegrationService.createGithubPullRequest(userId, action.params);
      case 'searchIssues':
        return await appIntegrationService.searchGithubIssues(userId, action.params);
      default:
        throw new Error(`Unsupported GitHub operation: ${action.operation}`);
    }
  }

  /**
   * Execute Slack-specific action
   * @private
   */
  async executeSlackAction(action, userId) {
    switch (action.operation) {
      case 'sendMessage':
        return await appIntegrationService.sendSlackMessage(userId, action.params);
      case 'getChannelInfo':
        return await appIntegrationService.getSlackChannelInfo(userId, action.params);
      case 'searchMessages':
        return await appIntegrationService.searchSlackMessages(userId, action.params);
      default:
        throw new Error(`Unsupported Slack operation: ${action.operation}`);
    }
  }

  /**
   * Execute action for generic app (placeholder for 500+ integrations)
   * @private
   */
  async executeGenericAppAction(action, userId) {
    // This would be extended to support 500+ apps
    // For now, we'll throw an error for unsupported apps
    throw new Error(`Integration not implemented for app: ${action.appId}`);
  }

  /**
   * Get agent capabilities
   * @param {string} agentId - Agent identifier
   * @returns {Object} Agent capabilities
   */
  getAgentCapabilities(agentId) {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      capabilities: agent.capabilities,
      supportedApps: agent.supportedApps,
      status: agent.status,
      createdAt: agent.createdAt,
      lastActive: agent.lastActive,
    };
  }

  /**
   * Update agent status
   * @param {string} agentId - Agent identifier
   * @param {string} status - New status
   */
  updateAgentStatus(agentId, status) {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.status = status;
    agent.lastActive = new Date().toISOString();
  }

  /**
   * Stop an agent session
   * @param {string} sessionId - Session identifier
   */
  async stopSession(sessionId) {
    const session = this.agentSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const agent = this.getAgent(session.agentId);
    if (agent) {
      agent.lastActive = new Date().toISOString();
    }

    session.status = 'inactive';
    session.endedAt = new Date().toISOString();

    logger.info(`Agent session stopped: ${sessionId}`, { 
      agentId: session.agentId, 
      userId: session.userId 
    });

    return session;
  }

  /**
   * Clean up expired or inactive sessions
   */
  cleanupSessions() {
    const now = new Date().toISOString();
    const expiredSessions = [];

    for (const [sessionId, session] of this.agentSessions) {
      // Remove sessions that have been inactive for more than 1 hour
      const lastActivity = new Date(session.lastActivity);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

      if (lastActivity < hourAgo) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.agentSessions.delete(sessionId);
      logger.info(`Cleaned up expired session: ${sessionId}`);
    }

    return expiredSessions.length;
  }

  /**
   * Get agent statistics
   * @returns {Object} Agent statistics
   */
  getAgentStats() {
    return {
      totalAgents: this.agents.size,
      activeSessions: Array.from(this.agentSessions.values()).filter(s => s.status === 'active').length,
      totalSessions: this.agentSessions.size,
      maxConcurrentAgents: this.maxConcurrentAgents,
    };
  }

  /**
   * Shutdown the agent service
   */
  async shutdown() {
    logger.info('Shutting down agent service');

    // Clean up all sessions
    for (const [sessionId, session] of this.agentSessions) {
      try {
        await this.stopSession(sessionId);
      } catch (error) {
        logger.error(`Error stopping session ${sessionId}:`, error.message);
      }
    }

    // Clear all agents
    this.agents.clear();
    this.agentSessions.clear();

    logger.info('Agent service shutdown complete');
  }
}

module.exports = {
  agentService: new AgentService(),
};