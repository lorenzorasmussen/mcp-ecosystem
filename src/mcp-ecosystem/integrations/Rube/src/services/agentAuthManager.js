/**
 * Agent Authentication and Session Management for Rube MCP Server
 * Handles agent authentication, session management, and access control
 */

const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const { config } = require('../config');
const { agentService } = require('./agentService');
const AppConnection = require('../database/models/AppConnection');

class AgentAuthManager {
  constructor() {
    this.agentSessions = new Map(); // Active agent sessions
    this.agentTokens = new Map(); // Agent authentication tokens
    this.sessionTimeout = config.agent.maxSessionTimeout;
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.sessionTimeout / 2); // Clean up every half timeout period
  }

  /**
   * Generate an agent authentication token
   * @param {string} agentId - Agent identifier
   * @param {string} userId - User identifier
   * @param {Object} permissions - Agent permissions
   * @returns {string} JWT token
   */
  generateAgentToken(agentId, userId, permissions = {}) {
    const payload = {
      agentId,
      userId,
      permissions,
      type: 'agent',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };

    const token = jwt.sign(payload, config.auth.jwtSecret);
    return token;
  }

  /**
   * Verify an agent authentication token
   * @param {string} token - JWT token to verify
   * @returns {Object|null} Decoded token payload or null if invalid
   */
  verifyAgentToken(token) {
    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret);
      if (decoded.type !== 'agent') {
        return null;
      }
      return decoded;
    } catch (error) {
      logger.error('Agent token verification failed:', error.message);
      return null;
    }
  }

  /**
   * Create an agent session
   * @param {string} agentId - Agent identifier
   * @param {string} userId - User identifier
   * @param {Object} sessionConfig - Session configuration
   * @returns {Promise<Object>} Session information
   */
  async createSession(agentId, userId, sessionConfig = {}) {
    // Validate agent exists
    const agent = agentService.getAgent(agentId);
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
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      agentId,
      userId,
      status: 'active',
      permissions: sessionConfig.permissions || {},
      requiredApps,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.sessionTimeout).toISOString(),
      metadata: sessionConfig.metadata || {},
    };

    // Store session
    this.agentSessions.set(sessionId, session);

    // Update agent last activity
    agentService.updateAgentStatus(agentId, 'active');

    logger.info(`Agent session created: ${sessionId}`, {
      agentId,
      userId,
      requiredApps,
      sessionId
    });

    return session;
  }

  /**
   * Validate an agent session
   * @param {string} sessionId - Session identifier
   * @param {string} userId - User identifier (optional)
   * @returns {Object|null} Session information or null if invalid
   */
  validateSession(sessionId, userId = null) {
    const session = this.agentSessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (new Date() > new Date(session.expiresAt)) {
      this.agentSessions.delete(sessionId);
      logger.info(`Expired session removed: ${sessionId}`);
      return null;
    }

    // Check user match if provided
    if (userId && session.userId !== userId) {
      return null;
    }

    // Update last activity
    session.lastActivity = new Date().toISOString();
    this.agentSessions.set(sessionId, session);

    return session;
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Session information or null if not found
   */
  getSession(sessionId) {
    return this.agentSessions.get(sessionId) || null;
  }

  /**
   * End an agent session
   * @param {string} sessionId - Session identifier
   * @returns {boolean} True if session was ended, false otherwise
   */
  endSession(sessionId) {
    const session = this.agentSessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Update agent status
    agentService.updateAgentStatus(session.agentId, 'idle');

    // Remove session
    this.agentSessions.delete(sessionId);

    logger.info(`Agent session ended: ${sessionId}`, {
      agentId: session.agentId,
      userId: session.userId,
      sessionId
    });

    return true;
  }

  /**
   * Check if agent has permission for an action
   * @param {string} sessionId - Session identifier
   * @param {string} action - Action to check
   * @param {string} appId - App ID (optional)
   * @returns {boolean} True if agent has permission, false otherwise
   */
  hasPermission(sessionId, action, appId = null) {
    const session = this.validateSession(sessionId);
    if (!session) {
      return false;
    }

    const permissions = session.permissions || {};

    // Check general action permission
    if (permissions[action] === false) {
      return false;
    }

    // Check app-specific permission if appId provided
    if (appId && permissions.apps && permissions.apps[appId]) {
      const appPermissions = permissions.apps[appId];
      if (appPermissions[action] === false) {
        return false;
      }
    }

    // If no specific permissions set, assume allowed
    return true;
  }

  /**
   * Grant permission to an agent session
   * @param {string} sessionId - Session identifier
   * @param {string} action - Action to grant
   * @param {string} appId - App ID (optional)
   * @param {boolean} allowed - Whether action is allowed
   */
  grantPermission(sessionId, action, appId = null, allowed = true) {
    const session = this.validateSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found or invalid`);
    }

    if (!session.permissions) {
      session.permissions = {};
    }

    if (appId) {
      if (!session.permissions.apps) {
        session.permissions.apps = {};
      }
      if (!session.permissions.apps[appId]) {
        session.permissions.apps[appId] = {};
      }
      session.permissions.apps[appId][action] = allowed;
    } else {
      session.permissions[action] = allowed;
    }

    // Update session in map
    this.agentSessions.set(sessionId, session);

    logger.info(`Permission granted for session ${sessionId}`, {
      action,
      appId,
      allowed,
      sessionId
    });
  }

  /**
   * Check if agent can access a specific app
   * @param {string} sessionId - Session identifier
   * @param {string} appId - App identifier
   * @returns {boolean} True if agent can access app, false otherwise
   */
  canAccessApp(sessionId, appId) {
    const session = this.validateSession(sessionId);
    if (!session) {
      return false;
    }

    // Check if app is in required apps for this session
    if (session.requiredApps && session.requiredApps.length > 0) {
      return session.requiredApps.includes(appId);
    }

    // If no required apps specified, check general permissions
    return this.hasPermission(sessionId, 'access', appId);
  }

  /**
   * Get agent permissions for a user
   * @param {string} userId - User identifier
   * @returns {Array} Array of agent permissions
   */
  async getUserAgentPermissions(userId) {
    const userSessions = [];
    
    for (const [sessionId, session] of this.agentSessions) {
      if (session.userId === userId) {
        userSessions.push({
          sessionId: session.id,
          agentId: session.agentId,
          permissions: session.permissions,
          requiredApps: session.requiredApps,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
        });
      }
    }

    return userSessions;
  }

  /**
   * Revoke all sessions for a user (e.g., on logout)
   * @param {string} userId - User identifier
   * @returns {number} Number of sessions revoked
   */
  revokeUserSessions(userId) {
    let revokedCount = 0;

    for (const [sessionId, session] of this.agentSessions) {
      if (session.userId === userId) {
        this.agentSessions.delete(sessionId);
        revokedCount++;
        
        logger.info(`Revoked session for user: ${userId}`, {
          sessionId,
          agentId: session.agentId
        });
      }
    }

    return revokedCount;
  }

  /**
   * Revoke all sessions for an agent
   * @param {string} agentId - Agent identifier
   * @returns {number} Number of sessions revoked
   */
  revokeAgentSessions(agentId) {
    let revokedCount = 0;

    for (const [sessionId, session] of this.agentSessions) {
      if (session.agentId === agentId) {
        this.agentSessions.delete(sessionId);
        revokedCount++;
        
        logger.info(`Revoked session for agent: ${agentId}`, {
          sessionId,
          userId: session.userId
        });
      }
    }

    return revokedCount;
  }

  /**
   * Cleanup expired sessions
   * @private
   */
  cleanupExpiredSessions() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.agentSessions) {
      if (now > new Date(session.expiresAt)) {
        this.agentSessions.delete(sessionId);
        cleanedCount++;
        
        logger.info(`Cleaned up expired session: ${sessionId}`, {
          agentId: session.agentId,
          userId: session.userId
        });
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired agent sessions`);
    }

    return cleanedCount;
  }

  /**
   * Get session statistics
   * @returns {Object} Session statistics
   */
  getStats() {
    const activeSessions = Array.from(this.agentSessions.values()).filter(
      session => session.status === 'active'
    );

    return {
      totalSessions: this.agentSessions.size,
      activeSessions: activeSessions.length,
      sessionTimeout: this.sessionTimeout,
    };
  }

  /**
   * Shutdown the authentication manager
   */
  shutdown() {
    clearInterval(this.cleanupInterval);
    
    // End all sessions
    for (const sessionId of this.agentSessions.keys()) {
      this.endSession(sessionId);
    }
    
    logger.info('Agent authentication manager shutdown complete');
  }
}

module.exports = {
  agentAuthManager: new AgentAuthManager(),
};