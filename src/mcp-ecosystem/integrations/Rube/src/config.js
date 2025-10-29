/**
 * Configuration for Rube MCP Server
 */

require('dotenv').config();

const config = {
  // Server configuration
  port: parseInt(process.env.PORT) || 3000,
  host: process.env.HOST || 'localhost',
  version: process.env.npm_package_version || '0.0.1',
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/rube_mcp',
    connectionPooling: true,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  },
  
  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    prefix: process.env.REDIS_PREFIX || 'rube:',
  },
  
  // Authentication configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev',
    jwtExpiration: process.env.JWT_EXPIRATION || '24h',
    refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 86400, // 24 hours
  },
  
  // CORS configuration
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://localhost:3001', 'https://rube.app'],
  
  // Logging configuration
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // App integration configuration
  apps: {
    // OAuth configuration for various apps
    oauth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/auth/github/callback',
      },
      slack: {
        clientId: process.env.SLACK_CLIENT_ID,
        clientSecret: process.env.SLACK_CLIENT_SECRET,
        redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/auth/slack/callback',
      },
      // Add more app configurations as needed
    }
  },
  
  // Security configuration
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    },
    cors: {
      enabled: process.env.CORS_ENABLED !== 'false',
    },
    helmet: {
      enabled: process.env.HELMET_ENABLED !== 'false',
    }
  },
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // MCP Protocol specific settings
  mcp: {
    version: '2025-07-09',
    maxPayloadSize: '10mb',
    timeout: parseInt(process.env.MCP_TIMEOUT) || 30000, // 30 seconds
    maxConcurrentAgents: parseInt(process.env.MAX_CONCURRENT_AGENTS) || 100,
  },
  
  // Agent-specific configuration
  agent: {
    defaultCapabilities: [
      'app-integration',
      'multi-app-workflows',
      'real-time-sync',
      'batch-operations',
    ],
    maxSessionTimeout: parseInt(process.env.AGENT_SESSION_TIMEOUT) || 3600000, // 1 hour in ms
    maxConcurrentActions: parseInt(process.env.AGENT_MAX_CONCURRENT_ACTIONS) || 10,
    retryAttempts: parseInt(process.env.AGENT_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.AGENT_RETRY_DELAY) || 1000, // 1 second
    healthCheckInterval: parseInt(process.env.AGENT_HEALTH_CHECK_INTERVAL) || 30000, // 30 seconds
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
];

if (config.environment === 'production') {
  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      console.warn(`Warning: ${envVar} is not set. This is required in production.`);
    }
  });
}

module.exports = { config };