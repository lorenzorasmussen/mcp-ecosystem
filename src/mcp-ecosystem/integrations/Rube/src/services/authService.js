/**
 * Authentication Service for Rube MCP Server
 * Handles user authentication and app connections
 */

const { logger } = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { config } = require('../config');
const AppConnection = require('../database/models/AppConnection');
const User = require('../database/models/User');
const { AppConnectionNotFoundError, AuthenticationError } = require('../utils/errors');

class AuthService {
  constructor() {
    // Now using database models instead of in-memory storage
  }

  // Create a new user connection to an app
  async createConnection(connectionData) {
    const newConnection = await AppConnection.create({
      userId: connectionData.userId,
      appId: connectionData.appId,
      accessToken: connectionData.tokens.accessToken,
      refreshToken: connectionData.tokens.refreshToken,
      expiresAt: connectionData.tokens.expiresAt,
      scopes: connectionData.tokens.scope || connectionData.tokens.scopes,
      metadata: connectionData.metadata,
      active: true,
    });
    
    logger.info(`Created connection: ${newConnection.id}`, { 
      userId: connectionData.userId, 
      appId: connectionData.appId 
    });
    
    return newConnection;
  }

  // Refresh an access token
  async refreshToken(refreshToken) {
    // In a real implementation, this would verify the refresh token
    // and generate a new access token
    
    // For demo purposes, we'll just generate a new token
    const newAccessToken = jwt.sign(
      { type: 'access' },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiration }
    );
    
    const newRefreshToken = jwt.sign(
      { type: 'refresh' },
      config.auth.jwtSecret,
      { expiresIn: config.auth.refreshTokenExpiration }
    );
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: config.auth.jwtExpiration,
    };
  }

  // Revoke a token
  async revokeToken(token) {
    // In a real implementation, this would add the token to a blacklist
    logger.info('Token revoked');
    return true;
  }

  // List all connections for a user
  async listConnections(userId) {
    const connections = await AppConnection.findAllByUserId(userId);
    return connections;
  }

  // Disconnect an app
  async disconnectApp(userId, appId) {
    const connection = await AppConnection.findByUserIdAndAppId(userId, appId);
    if (!connection) {
      return false;
    }
    
    await AppConnection.update(connection.id, { active: false });
    logger.info(`Disconnected app: ${appId}`, { userId });
    return true;
  }

  // Verify an app connection
  async verifyConnection(userId, appId) {
    const connection = await AppConnection.findByUserIdAndAppId(userId, appId);
    if (!connection) {
      throw new AppConnectionNotFoundError(appId);
    }
    if (!connection.active) {
      return false;
    }
    // In a real implementation, this would make a call to the app to verify the token
    return true;
  }
}

module.exports = {
  authService: new AuthService(),
};