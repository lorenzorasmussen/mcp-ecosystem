/**
 * Rube MCP Server - Main Server Entry Point
 * Implements Model Context Protocol (MCP) specification
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createHttpTerminator } = require('http-terminator');
const { v4: uuidv4 } = require('uuid');

// Import server components
const { mcpRoutes } = require('./routes/mcp');
const { authRoutes } = require('./routes/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');
const { config } = require('./config');
const { dbManager } = require('./database');

class MCPServer {
  constructor(options = {}) {
    this.port = options.port || config.port || 3000;
    this.host = options.host || config.host || 'localhost';
    this.app = express();
    this.server = null;
    this.httpTerminator = null;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          fontSrc: ["'self'", "https:", "data:"],
        },
      },
    }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);
    
    // CORS
    this.app.use(cors({
      origin: config.allowedOrigins,
      credentials: true,
    }));
    
    // Body parsing
    this.app.use(express.json({ 
      limit: '10mb',
      type: ['application/json', 'application/mcp+json']
    }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      const requestId = uuidv4();
      req.requestId = requestId;
      logger.info(`${requestId} - ${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: config.version,
      });
    });
    
    // MCP protocol routes
    this.app.use('/mcp', mcpRoutes());
    
    // Authentication routes
    this.app.use('/auth', authRoutes());
    
    // Catch-all for MCP protocol
    this.app.all('/mcp/*', (req, res) => {
      res.status(404).json({
        error: 'MCP endpoint not found',
        code: 'MCP_ENDPOINT_NOT_FOUND',
      });
    });
  }

  setupErrorHandling() {
    this.app.use(errorHandler);
  }

  async start() {
    return new Promise(async (resolve, reject) => {
      try {
        // Connect to database
        await dbManager.connect();
        logger.info('Database connected successfully');
        
        this.server = this.app.listen({ port: this.port, host: this.host }, () => {
          logger.info(`MCP Server running on http://${this.host}:${this.port}`);
          logger.info(`MCP Server ready to handle requests`);
          this.httpTerminator = createHttpTerminator({
            server: this.server,
          });
          resolve(this.server);
        });
        
        this.server.on('error', (err) => {
          logger.error('Server error:', err);
          reject(err);
        });
      } catch (error) {
        logger.error('Failed to start server:', error);
        reject(error);
      }
    });
  }

  async stop() {
    if (this.httpTerminator) {
      await this.httpTerminator.terminate();
      logger.info('MCP Server stopped');
    }
    
    // Disconnect from database
    try {
      await dbManager.disconnect();
      logger.info('Database disconnected');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
    }
  }
}

module.exports = { MCPServer };