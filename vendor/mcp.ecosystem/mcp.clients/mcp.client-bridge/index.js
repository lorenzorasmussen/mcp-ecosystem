const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Import configuration
const config = require('./src/config/config');
const logger = require('./src/utils/logger');

// Import services
const MCPClientBridge = require('./src/services/MCPClientBridge');
const configService = require('./src/services/ConfigService');

// Import routes
const mcpRoutes = require('./src/routes/mcpRoutes');
const configRoutes = require('./src/routes/configRoutes');

// Initialize the app
const app = express();
const PORT = process.env.PORT || config.server.port;

// Initialize services
const mcpBridge = new MCPClientBridge('./data/mcp-data.json');

// Initialize services
async function initializeServices() {
  try {
    await configService.initialize();
    await mcpBridge.initialize();
    logger.info('All services initialized successfully');
    
    // Make the bridge available to routes
    app.set('mcpBridge', mcpBridge);
  } catch (error) {
    logger.error('Error initializing services:', error);
    process.exit(1);
  }
}

// Initialize services before starting the server
initializeServices();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(logger.middleware);

// API routes
app.use('/api/mcp', mcpRoutes);
app.use('/api/config', configRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`MCP Client Bridge server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;