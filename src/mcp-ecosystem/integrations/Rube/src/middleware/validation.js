/**
 * Validation middleware for Rube MCP Server
 */

const { logger } = require('../utils/logger');

// MCP request validation middleware
const validateMCPRequest = (req, res, next) => {
  try {
    // Check for required MCP headers
    const contentType = req.get('Content-Type');
    if (contentType && !contentType.includes('application/json') && !contentType.includes('application/mcp+json')) {
      const error = new Error('Invalid Content-Type. Must be application/json or application/mcp+json');
      error.statusCode = 400;
      error.code = 'INVALID_CONTENT_TYPE';
      return next(error);
    }
    
    // Validate MCP protocol version if specified in headers
    const mcpVersion = req.get('MCP-Version') || req.get('X-MCP-Version');
    if (mcpVersion) {
      // TODO: Validate against supported MCP versions
      logger.debug(`MCP Version: ${mcpVersion}`, { requestId: req.requestId });
    }
    
    // Additional validation can be added here
    next();
  } catch (error) {
    next(error);
  }
};

// JWT authentication middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    const error = new Error('Access token required');
    error.statusCode = 401;
    error.code = 'MISSING_AUTH_HEADER';
    return next(error);
  }
  
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  
  try {
    const jwt = require('jsonwebtoken');
    const { config } = require('../config');
    
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    const authError = new Error('Invalid or expired token');
    authError.statusCode = 401;
    authError.code = 'INVALID_TOKEN';
    return next(authError);
  }
};

// Rate limiting middleware
const rateLimitMiddleware = (req, res, next) => {
  // This is handled by express-rate-limit at the app level
  // This function can be used for more granular rate limiting if needed
  next();
};

const { validateParams } = require('../utils/validation');

// Input validation middleware
const validateInput = (schema) => {
  return validateParams(schema);
};

module.exports = {
  validateMCPRequest,
  authenticateJWT,
  rateLimitMiddleware,
  validateInput,
};