/**
 * MCP Protocol Routes
 * Implements Model Context Protocol specification
 */

const express = require('express');
const { validateMCPRequest, authenticateJWT } = require('../middleware/validation');
const { mcpController } = require('../controllers/mcp');

const mcpRoutes = () => {
  const router = express.Router();
  
  // MCP protocol endpoints
  router.get('/specification', (req, res) => {
    // Return MCP protocol specification
    res.json({
      version: '2025-07-09',
      spec: 'https://modelcontextprotocol.io/specification',
      transports: ['http', 'streamable-http'],
    });
  });
  
  // Server info
  router.get('/info', (req, res) => {
    res.json({
      name: 'Rube MCP Server',
      version: require('../../package.json').version,
      description: 'Connect your AI to 500+ apps with MCP protocol',
      capabilities: [
        'resources',
        'tools',
        'prompts',
        'resource-templates'
      ],
      transports: ['http', 'streamable-http'],
    });
  });
  
  // Public endpoints that don't require authentication
  router.get('/tools', validateMCPRequest, mcpController.listTools);
  router.get('/tools/:toolId', validateMCPRequest, mcpController.getTool);
  router.get('/resource-templates', validateMCPRequest, mcpController.listResourceTemplates);
  router.get('/resource-templates/:templateId', validateMCPRequest, mcpController.getResourceTemplate);
  router.get('/prompts', validateMCPRequest, mcpController.listPrompts);
  router.get('/prompts/:promptId', validateMCPRequest, mcpController.getPrompt);
  
  // Protected endpoints that require authentication
  router.post('/tools/:toolId/call', validateMCPRequest, authenticateJWT, mcpController.callTool);
  router.get('/resources', validateMCPRequest, authenticateJWT, mcpController.listResources);
  router.get('/resources/:resourceId', validateMCPRequest, authenticateJWT, mcpController.getResource);
  router.post('/resources', validateMCPRequest, authenticateJWT, mcpController.createResource);
  router.patch('/resources/:resourceId', validateMCPRequest, authenticateJWT, mcpController.updateResource);
  router.delete('/resources/:resourceId', validateMCPRequest, authenticateJWT, mcpController.deleteResource);
  router.post('/prompts/:promptId/expand', validateMCPRequest, authenticateJWT, mcpController.expandPrompt);
  router.post('/stream', validateMCPRequest, authenticateJWT, mcpController.streamResponse);
  
  return router;
};

module.exports = {
  mcpRoutes,
};