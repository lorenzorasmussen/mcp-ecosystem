/**
 * Authentication Routes for Rube MCP Server
 */

const express = require('express');
const { authController } = require('../controllers/auth');
const { authenticateJWT } = require('../middleware/validation');

const authRoutes = () => {
  const router = express.Router();
  
  // OAuth initiation endpoints (public)
  router.get('/google', authController.initiateGoogleAuth);
  router.get('/github', authController.initiateGithubAuth);
  router.get('/slack', authController.initiateSlackAuth);
  
  // OAuth callback endpoints (public - these are called by the OAuth provider)
  router.get('/google/callback', authController.handleGoogleCallback);
  router.get('/github/callback', authController.handleGithubCallback);
  router.get('/slack/callback', authController.handleSlackCallback);
  
  // Token refresh (public - uses refresh token)
  router.post('/refresh', authController.refreshToken);
  
  // Revoke token (public - uses token to be revoked)
  router.post('/revoke', authController.revokeToken);
  
  // Protected endpoints that require authentication
  router.get('/connections', authenticateJWT, authController.listConnections);
  router.delete('/connections/:appId', authenticateJWT, authController.disconnectApp);
  router.get('/connections/:appId/verify', authenticateJWT, authController.verifyConnection);
  
  return router;
};

module.exports = {
  authRoutes,
};