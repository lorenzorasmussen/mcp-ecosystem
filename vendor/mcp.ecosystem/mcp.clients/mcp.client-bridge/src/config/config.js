// src/config/config.js
const path = require('path');
const envConfig = require('./env');

// Configuration using environment variables
const config = {
  server: {
    port: envConfig.PORT,
    host: envConfig.HOST,
    env: envConfig.NODE_ENV,
    cors: {
      origin: envConfig.CORS_ORIGIN,
      credentials: envConfig.CORS_CREDENTIALS
    }
  },
  mcp: {
    defaultTimeout: envConfig.MCP_DEFAULT_TIMEOUT,
    maxRetries: envConfig.MCP_MAX_RETRIES,
    retryDelay: envConfig.MCP_RETRY_DELAY,
    connectionPool: {
      maxConnections: envConfig.MCP_MAX_CONNECTIONS,
      minConnections: envConfig.MCP_MIN_CONNECTIONS,
      idleTimeout: envConfig.MCP_IDLE_TIMEOUT
    }
  },
  storage: {
    path: envConfig.STORAGE_PATH,
    type: envConfig.STORAGE_TYPE, // 'json', 'sqlite', 'mongodb'
    fileName: envConfig.STORAGE_FILE_NAME
  },
  logging: {
    level: envConfig.LOG_LEVEL,
    format: envConfig.LOG_FORMAT,
    file: envConfig.LOG_FILE
  },
  cache: {
    enabled: envConfig.CACHE_ENABLED,
    ttl: envConfig.CACHE_TTL, // seconds
    maxKeys: envConfig.CACHE_MAX_KEYS
  },
  security: {
    apiKey: envConfig.API_KEY,
    jwtSecret: envConfig.JWT_SECRET
  },
  database: {
    url: envConfig.DATABASE_URL
  }
};

module.exports = config;