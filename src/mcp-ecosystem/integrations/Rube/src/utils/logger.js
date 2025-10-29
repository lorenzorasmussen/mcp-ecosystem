/**
 * Logger utility for Rube MCP Server
 */

const winston = require('winston');
const { config } = require('../config');

// Create logger format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: { service: 'rube-mcp-server' },
  transports: [
    // Write to console in development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      level: config.logLevel,
    }),
    // Write to file in production
    ...(config.environment === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        ]
      : []),
  ],
});

// Create a child logger with request context
const createRequestLogger = (requestId) => {
  return {
    info: (message, meta) => logger.info(message, { requestId, ...meta }),
    warn: (message, meta) => logger.warn(message, { requestId, ...meta }),
    error: (message, meta) => logger.error(message, { requestId, ...meta }),
    debug: (message, meta) => logger.debug(message, { requestId, ...meta }),
  };
};

module.exports = {
  logger,
  createRequestLogger,
};