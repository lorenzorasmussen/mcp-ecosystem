/**
 * Error handling middleware for Rube MCP Server
 */

const { logger } = require('../utils/logger');
const { MCPServerError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error(`Error in ${req.method} ${req.path}:`, {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    ip: req.ip,
  });

  // Determine status code and error details
  const statusCode = err.statusCode || 500;
  const code = err.code || 'UNKNOWN_ERROR';
  
  // Prepare error response
  const errorResponse = {
    error: {
      type: statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'CLIENT_ERROR',
      message: statusCode === 500 
        ? 'An internal server error occurred' 
        : err.message || 'An error occurred',
      code: code,
    },
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  };

  // Add validation errors if present
  if (err.validationErrors) {
    errorResponse.error.validationErrors = err.validationErrors;
  }

  // Add more details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// Not found handler
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
};

// Validation error handler
const validationErrorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
  }
  next(err);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  validationErrorHandler,
};