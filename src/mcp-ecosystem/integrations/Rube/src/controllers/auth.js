/**
 * Authentication Controller for Rube MCP Server
 */

const { logger } = require('../utils/logger');
const { authService } = require('../services/authService');
const { appIntegrationService } = require('../services/appIntegrationService');
const { validate } = require('../utils/validation');

const authController = {
  // Initiate Google OAuth flow
  async initiateGoogleAuth(req, res, next) {
    try {
      const authUrl = await appIntegrationService.getGoogleAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  },

  // Handle Google OAuth callback
  async handleGoogleCallback(req, res, next) {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        const error = new Error('Authorization code not provided');
        error.statusCode = 400;
        error.code = 'MISSING_AUTH_CODE';
        return next(error);
      }
      
      const tokens = await appIntegrationService.handleGoogleCallback(code);
      
      // Store tokens and create connection record
      await authService.createConnection({
        userId: req.user?.id,
        appId: 'google',
        tokens,
        metadata: {
          email: tokens.email,
          scope: tokens.scope,
        },
      });
      
      res.redirect('/auth/success?app=google');
    } catch (error) {
      next(error);
    }
  },

  // Initiate GitHub OAuth flow
  async initiateGithubAuth(req, res, next) {
    try {
      const authUrl = await appIntegrationService.getGithubAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  },

  // Handle GitHub OAuth callback
  async handleGithubCallback(req, res, next) {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        const error = new Error('Authorization code not provided');
        error.statusCode = 400;
        error.code = 'MISSING_AUTH_CODE';
        return next(error);
      }
      
      const tokens = await appIntegrationService.handleGithubCallback(code);
      
      // Store tokens and create connection record
      await authService.createConnection({
        userId: req.user?.id,
        appId: 'github',
        tokens,
        metadata: {
          username: tokens.username,
          scope: tokens.scope,
        },
      });
      
      res.redirect('/auth/success?app=github');
    } catch (error) {
      next(error);
    }
  },

  // Initiate Slack OAuth flow
  async initiateSlackAuth(req, res, next) {
    try {
      const authUrl = await appIntegrationService.getSlackAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  },

  // Handle Slack OAuth callback
  async handleSlackCallback(req, res, next) {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        const error = new Error('Authorization code not provided');
        error.statusCode = 400;
        error.code = 'MISSING_AUTH_CODE';
        return next(error);
      }
      
      const tokens = await appIntegrationService.handleSlackCallback(code);
      
      // Store tokens and create connection record
      await authService.createConnection({
        userId: req.user?.id,
        appId: 'slack',
        tokens,
        metadata: {
          teamName: tokens.teamName,
          scope: tokens.scope,
        },
      });
      
      res.redirect('/auth/success?app=slack');
    } catch (error) {
      next(error);
    }
  },

  // Refresh access token
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        const error = new Error('Refresh token required');
        error.statusCode = 400;
        error.code = 'MISSING_REFRESH_TOKEN';
        return next(error);
      }
      
      const newTokens = await authService.refreshToken(refreshToken);
      
      res.json({
        access_token: newTokens.accessToken,
        refresh_token: newTokens.refreshToken,
        expires_in: newTokens.expiresIn,
      });
    } catch (error) {
      next(error);
    }
  },

  // Revoke token
  async revokeToken(req, res, next) {
    try {
      const { token } = req.body;
      
      if (!token) {
        const error = new Error('Token required');
        error.statusCode = 400;
        error.code = 'MISSING_TOKEN';
        return next(error);
      }
      
      await authService.revokeToken(token);
      
      res.status(200).json({
        message: 'Token revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // List connected apps
  async listConnections(req, res, next) {
    try {
      const connections = await authService.listConnections(req.user?.id);
      
      res.json({
        connections: connections.map(conn => ({
          id: conn.id,
          app_id: conn.appId,
          connected_at: conn.connectedAt,
          scopes: conn.metadata?.scope,
          active: conn.active,
        })),
      });
    } catch (error) {
      next(error);
    }
  },

  // Disconnect an app
  async disconnectApp(req, res, next) {
    try {
      const { appId } = req.params;
      
      // Validate appId
      const appIdValidation = validate('appId', appId);
      if (!appIdValidation.valid) {
        const error = new Error('Invalid app ID format');
        error.statusCode = 400;
        error.code = 'INVALID_APP_ID';
        error.validationErrors = appIdValidation.errors;
        return next(error);
      }
      
      await authService.disconnectApp(req.user?.id, appId);
      
      res.status(200).json({
        message: `Disconnected ${appId} successfully`,
      });
    } catch (error) {
      next(error);
    }
  },

  // Verify app connection
  async verifyConnection(req, res, next) {
    try {
      const { appId } = req.params;
      
      // Validate appId
      const appIdValidation = validate('appId', appId);
      if (!appIdValidation.valid) {
        const error = new Error('Invalid app ID format');
        error.statusCode = 400;
        error.code = 'INVALID_APP_ID';
        error.validationErrors = appIdValidation.errors;
        return next(error);
      }
      
      const isValid = await authService.verifyConnection(req.user?.id, appId);
      
      res.json({
        valid: isValid,
        app_id: appId,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = {
  authController,
};