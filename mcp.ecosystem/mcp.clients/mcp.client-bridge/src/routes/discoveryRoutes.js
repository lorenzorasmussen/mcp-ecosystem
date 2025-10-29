// mcp.ecosystem/mcp.clients/mcp.client-bridge/src/routes/discoveryRoutes.js
const express = require('express');
const router = express.Router();
const MCPClientBridge = require('../services/MCPClientBridge');
const { logger } = require('../utils/logger');

// This assumes we have a global clientBridge instance
// In a real implementation, this would be injected or imported
let clientBridge;

// Middleware to ensure clientBridge is initialized
router.use((req, res, next) => {
  if (!clientBridge) {
    return res.status(503).json({ 
      error: 'Client bridge not initialized',
      message: 'Please initialize the client bridge before using discovery features' 
    });
  }
  next();
});

// Get all available servers
router.get('/servers', async (req, res) => {
  try {
    const servers = await clientBridge.getAllServers();
    res.json({ servers });
  } catch (error) {
    logger.error('Error getting servers:', error);
    res.status(500).json({ 
      error: 'Failed to get servers',
      message: error.message 
    });
  }
});

// Get a specific server by ID
router.get('/servers/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const server = await clientBridge.discoveryService.getServerById(serverId);
    
    if (!server) {
      return res.status(404).json({ 
        error: 'Server not found',
        message: `Server with ID '${serverId}' not found` 
      });
    }
    
    res.json({ server });
  } catch (error) {
    logger.error('Error getting server:', error);
    res.status(500).json({ 
      error: 'Failed to get server',
      message: error.message 
    });
  }
});

// Search servers by category
router.get('/servers/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const servers = await clientBridge.getServersByCategory(category);
    res.json({ servers, category });
  } catch (error) {
    logger.error('Error searching servers by category:', error);
    res.status(500).json({ 
      error: 'Failed to search servers by category',
      message: error.message 
    });
  }
});

// Search servers by keyword
router.get('/servers/search/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const servers = await clientBridge.searchServers(keyword);
    res.json({ servers, keyword });
  } catch (error) {
    logger.error('Error searching servers:', error);
    res.status(500).json({ 
      error: 'Failed to search servers',
      message: error.message 
    });
  }
});

// Find tools that match a natural language query
router.post('/tools/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        error: 'Missing query parameter',
        message: 'Please provide a query in the request body' 
      });
    }
    
    const results = await clientBridge.findToolsForQuery(query);
    res.json({ results, query });
  } catch (error) {
    logger.error('Error searching tools:', error);
    res.status(500).json({ 
      error: 'Failed to search tools',
      message: error.message 
    });
  }
});

// Get all tools from all servers
router.get('/tools', async (req, res) => {
  try {
    const tools = await clientBridge.getAllTools();
    res.json({ tools });
  } catch (error) {
    logger.error('Error getting all tools:', error);
    res.status(500).json({ 
      error: 'Failed to get tools',
      message: error.message 
    });
  }
});

// Get server index metadata
router.get('/index/metadata', async (req, res) => {
  try {
    const metadata = await clientBridge.discoveryService.getIndexMetadata();
    res.json({ metadata });
  } catch (error) {
    logger.error('Error getting index metadata:', error);
    res.status(500).json({ 
      error: 'Failed to get index metadata',
      message: error.message 
    });
  }
});

// Refresh the server index
router.post('/index/refresh', async (req, res) => {
  try {
    await clientBridge.discoveryService.refreshIndex();
    const metadata = await clientBridge.discoveryService.getIndexMetadata();
    res.json({ 
      message: 'Server index refreshed successfully',
      metadata 
    });
  } catch (error) {
    logger.error('Error refreshing server index:', error);
    res.status(500).json({ 
      error: 'Failed to refresh server index',
      message: error.message 
    });
  }
});

// Set the client bridge instance (used by main app)
router.setClientBridge = (bridge) => {
  clientBridge = bridge;
};

module.exports = router;