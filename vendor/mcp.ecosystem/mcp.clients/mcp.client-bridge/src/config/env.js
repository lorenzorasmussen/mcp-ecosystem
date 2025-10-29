// src/config/env.js
const path = require('path');

// Load environment variables from .env file if it exists
const envPath = path.resolve(process.cwd(), '.env');
require('dotenv').config({ path: envPath });

// Environment configuration with validation and defaults
const envConfig = {
  // Server configuration
  PORT: parseInt(process.env.PORT) || 3000,
  HOST: process.env.HOST || 'localhost',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // CORS configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',
  
  // MCP client bridge configuration
  MCP_DEFAULT_TIMEOUT: parseInt(process.env.MCP_DEFAULT_TIMEOUT) || 30000,
  MCP_MAX_RETRIES: parseInt(process.env.MCP_MAX_RETRIES) || 3,
  MCP_RETRY_DELAY: parseInt(process.env.MCP_RETRY_DELAY) || 1000,
  MCP_MAX_CONNECTIONS: parseInt(process.env.MCP_MAX_CONNECTIONS) || 10,
  MCP_MIN_CONNECTIONS: parseInt(process.env.MCP_MIN_CONNECTIONS) || 2,
  MCP_IDLE_TIMEOUT: parseInt(process.env.MCP_IDLE_TIMEOUT) || 30000,
  
  // Storage configuration
  STORAGE_PATH: process.env.STORAGE_PATH || path.join(__dirname, '../../data'),
  STORAGE_TYPE: process.env.STORAGE_TYPE || 'json', // 'json', 'sqlite', 'mongodb'
  STORAGE_FILE_NAME: process.env.STORAGE_FILE_NAME || 'mcp-data.json',
  
  // Logging configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FORMAT: process.env.LOG_FORMAT || 'combined',
  LOG_FILE: process.env.LOG_FILE || path.join(__dirname, '../../logs/app.log'),
  
  // Cache configuration
  CACHE_ENABLED: process.env.CACHE_ENABLED !== 'false',
  CACHE_TTL: parseInt(process.env.CACHE_TTL) || 300, // seconds
  CACHE_MAX_KEYS: parseInt(process.env.CACHE_MAX_KEYS) || 1000,
  
  // Security
  API_KEY: process.env.API_KEY || null,
  JWT_SECRET: process.env.JWT_SECRET || 'default_secret_key_for_dev',
  
  // Database (if using one)
  DATABASE_URL: process.env.DATABASE_URL || null,
  
  // External service configurations
  MCP_SERVERS: process.env.MCP_SERVERS ? 
    JSON.parse(process.env.MCP_SERVERS) : 
    []
};

// Validate required environment variables
const requiredEnvVars = [];
if (envConfig.NODE_ENV === 'production') {
  // Add any production-specific required environment variables here
  // requiredEnvVars.push('JWT_SECRET', 'DATABASE_URL');
}

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Additional validation
if (envConfig.PORT < 1 || envConfig.PORT > 65535) {
  console.error('PORT must be between 1 and 65535');
  process.exit(1);
}

module.exports = envConfig;