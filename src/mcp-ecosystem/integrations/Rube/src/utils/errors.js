/**
 * Custom error classes for Rube MCP Server
 */

class MCPServerError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    
    this.name = this.constructor.name;
  }
}

class ValidationError extends MCPServerError {
  constructor(message, validationErrors = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.validationErrors = validationErrors;
  }
}

class AuthenticationError extends MCPServerError {
  constructor(message) {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends MCPServerError {
  constructor(message) {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends MCPServerError {
  constructor(message) {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

class ToolNotFoundError extends NotFoundError {
  constructor(toolId) {
    super(`Tool ${toolId} not found`, 'TOOL_NOT_FOUND');
  }
}

class ResourceNotFoundError extends NotFoundError {
  constructor(resourceId) {
    super(`Resource ${resourceId} not found`, 'RESOURCE_NOT_FOUND');
  }
}

class ResourceTemplateNotFoundError extends NotFoundError {
  constructor(templateId) {
    super(`Resource template ${templateId} not found`, 'RESOURCE_TEMPLATE_NOT_FOUND');
  }
}

class PromptNotFoundError extends NotFoundError {
  constructor(promptId) {
    super(`Prompt ${promptId} not found`, 'PROMPT_NOT_FOUND');
  }
}

class AppConnectionNotFoundError extends NotFoundError {
  constructor(appId) {
    super(`Connection for app ${appId} not found`, 'APP_CONNECTION_NOT_FOUND');
  }
}

class OAuthError extends MCPServerError {
  constructor(message) {
    super(message, 400, 'OAUTH_ERROR');
  }
}

class APIError extends MCPServerError {
  constructor(message, statusCode = 500, code = 'API_ERROR') {
    super(message, statusCode, code);
  }
}

module.exports = {
  MCPServerError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ToolNotFoundError,
  ResourceNotFoundError,
  ResourceTemplateNotFoundError,
  PromptNotFoundError,
  AppConnectionNotFoundError,
  OAuthError,
  APIError,
};