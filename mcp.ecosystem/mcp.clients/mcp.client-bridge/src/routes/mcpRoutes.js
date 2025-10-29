// src/routes/mcpRoutes.js
const express = require('express');
const router = express.Router();
const discoveryRoutes = require('./discoveryRoutes');
const MCPClientBridge = require('../services/MCPClientBridge');
const configService = require('../services/ConfigService');
const logger = require('../utils/logger');

// Mount the discovery routes
router.use('/discovery', discoveryRoutes);

// Endpoint to process natural language requests
router.post('/process', async (req, res) => {
  try {
    const { request } = req.body;
    
    if (!request) {
      return res.status(400).json({ 
        error: 'Request body must contain a "request" field with the natural language query' 
      });
    }
    
    // Get the bridge from app locals (set in main app)
    const mcpBridge = req.app.get('mcpBridge');
    if (!mcpBridge) {
      return res.status(500).json({ 
        error: 'MCP Bridge not initialized' 
      });
    }
    
    // Process the request through the bridge
    const result = await mcpBridge.processRequest(request);
    
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error processing MCP request:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Endpoint to get bridge statistics
router.get('/stats', async (req, res) => {
  try {
    // Get the bridge from app locals (set in main app)
    const mcpBridge = req.app.get('mcpBridge');
    if (!mcpBridge) {
      return res.status(500).json({ 
        error: 'MCP Bridge not initialized' 
      });
    }
    
    const stats = await mcpBridge.getStats();
    res.status(200).json(stats);
  } catch (error) {
    logger.error('Error getting bridge stats:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Endpoint to test connection to an MCP server
router.post('/test-connection', async (req, res) => {
  try {
    const { serverId, serverConfig } = req.body;
    
    if (!serverId || !serverConfig) {
      return res.status(400).json({ 
        error: 'Request body must contain "serverId" and "serverConfig"' 
      });
    }
    
    // Get the bridge from app locals (set in main app)
    const mcpBridge = req.app.get('mcpBridge');
    if (!mcpBridge) {
      return res.status(500).json({ 
        error: 'MCP Bridge not initialized' 
      });
    }
    
    // Test the connection to the server
    const connection = await mcpBridge.connectToServer(serverId, serverConfig);
    
    // If we get here, the connection was successful
    res.status(200).json({ 
      success: true,
      message: `Successfully connected to server: ${serverId}` 
    });
  } catch (error) {
    logger.error('Error testing server connection:', error);
    res.status(500).json({ 
      success: false,
      error: 'Connection test failed',
      message: error.message 
    });
  }
});

// Endpoint to get server capabilities
router.get('/server/:serverId/capabilities', async (req, res) => {
  try {
    const { serverId } = req.params;
    
    // Get the bridge from app locals (set in main app)
    const mcpBridge = req.app.get('mcpBridge');
    if (!mcpBridge) {
      return res.status(500).json({ 
        error: 'MCP Bridge not initialized' 
      });
    }
    
    // Get the server configuration
    const serverConfig = configService.getServer(serverId);
    if (!serverConfig) {
      return res.status(404).json({ 
        error: `Server with ID "${serverId}" not found` 
      });
    }
    
    // Get capabilities from the bridge
    const capabilities = await mcpBridge.fetchServerCapabilities(serverId, serverConfig);
    
    res.status(200).json({
      serverId,
      capabilities
    });
  } catch (error) {
    logger.error('Error fetching server capabilities:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

module.exports = router;