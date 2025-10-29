// src/routes/configRoutes.js
const express = require('express');
const router = express.Router();
const configService = require('../services/ConfigService');
const logger = require('../utils/logger');

// Get all server configurations
router.get('/servers', async (req, res) => {
  try {
    const servers = configService.getServers();
    res.status(200).json({ servers });
  } catch (error) {
    logger.error('Error getting server configurations:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Get a specific server configuration
router.get('/servers/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const server = configService.getServer(serverId);
    
    if (!server) {
      return res.status(404).json({ 
        error: `Server with ID "${serverId}" not found` 
      });
    }
    
    res.status(200).json({ server });
  } catch (error) {
    logger.error('Error getting server configuration:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Add a new server configuration
router.post('/servers', async (req, res) => {
  try {
    const serverConfig = req.body;
    
    // Normalize the server configuration
    const normalizedConfig = configService.normalizeServerConfig(serverConfig);
    
    await configService.addServer(normalizedConfig);
    
    res.status(201).json({ 
      message: `Server "${normalizedConfig.id}" added successfully`,
      server: normalizedConfig 
    });
  } catch (error) {
    logger.error('Error adding server configuration:', error);
    res.status(400).json({ 
      error: 'Bad request',
      message: error.message 
    });
  }
});

// Update an existing server configuration
router.put('/servers/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const serverConfig = req.body;
    
    // Normalize the server configuration
    const normalizedConfig = configService.normalizeServerConfig({ id: serverId, ...serverConfig });
    
    await configService.updateServer(serverId, normalizedConfig);
    
    res.status(200).json({ 
      message: `Server "${serverId}" updated successfully`,
      server: normalizedConfig 
    });
  } catch (error) {
    logger.error('Error updating server configuration:', error);
    res.status(400).json({ 
      error: 'Bad request',
      message: error.message 
    });
  }
});

// Remove a server configuration
router.delete('/servers/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    
    await configService.removeServer(serverId);
    
    res.status(200).json({ 
      message: `Server "${serverId}" removed successfully` 
    });
  } catch (error) {
    logger.error('Error removing server configuration:', error);
    res.status(400).json({ 
      error: 'Bad request',
      message: error.message 
    });
  }
});

// Get global settings
router.get('/settings', async (req, res) => {
  try {
    const settings = configService.getGlobalSettings();
    res.status(200).json({ settings });
  } catch (error) {
    logger.error('Error getting global settings:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Update global settings
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;
    await configService.updateGlobalSettings(settings);
    
    res.status(200).json({ 
      message: 'Global settings updated successfully',
      settings 
    });
  } catch (error) {
    logger.error('Error updating global settings:', error);
    res.status(400).json({ 
      error: 'Bad request',
      message: error.message 
    });
  }
});

// Get server capabilities
router.get('/servers/:serverId/capabilities', async (req, res) => {
  try {
    const { serverId } = req.params;
    const capabilities = configService.getServerCapabilities(serverId);
    
    res.status(200).json({ 
      serverId,
      capabilities 
    });
  } catch (error) {
    logger.error('Error getting server capabilities:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Update server capabilities
router.put('/servers/:serverId/capabilities', async (req, res) => {
  try {
    const { serverId } = req.params;
    const capabilities = req.body;
    
    await configService.updateServerCapabilities(serverId, capabilities);
    
    res.status(200).json({ 
      message: `Capabilities updated for server "${serverId}"`,
      capabilities 
    });
  } catch (error) {
    logger.error('Error updating server capabilities:', error);
    res.status(400).json({ 
      error: 'Bad request',
      message: error.message 
    });
  }
});

module.exports = router;