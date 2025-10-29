#!/usr/bin/env node
// index.js - Main entry point for MCP Browsertools Server

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const winston = require('winston');
const path = require('path');

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'mcp-browsertools-server' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, 'logs', 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, 'logs', 'combined.log') 
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create Express app for HTTP endpoints
const app = express();
const PORT = process.env.PORT || 3107;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'MCP Browsertools Server'
  });
});

// MCP Server
const server = new Server(
  {
    name: "browsertools-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  }
);

// Register browsertools
server.registerTool("browser_navigate", {
  description: "Navigate to a URL",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to navigate to" }
    },
    required: ["url"]
  }
}, async (toolCall) => {
  logger.info('Navigating to URL:', toolCall.arguments.url);
  // Implementation would go here
  return {
    content: [
      {
        type: "text",
        text: `Navigated to ${toolCall.arguments.url}`
      }
    ]
  };
});

server.registerTool("browser_click_element", {
  description: "Click on a web element",
  inputSchema: {
    type: "object",
    properties: {
      selector: { type: "string", description: "CSS selector for the element to click" }
    },
    required: ["selector"]
  }
}, async (toolCall) => {
  logger.info('Clicking element:', toolCall.arguments.selector);
  // Implementation would go here
  return {
    content: [
      {
        type: "text",
        text: `Clicked element with selector ${toolCall.arguments.selector}`
      }
    ]
  };
});

server.registerTool("browser_extract_text", {
  description: "Extract text from a web page",
  inputSchema: {
    type: "object",
    properties: {
      selector: { type: "string", description: "CSS selector for the element to extract text from" }
    },
    required: ["selector"]
  }
}, async (toolCall) => {
  logger.info('Extracting text from element:', toolCall.arguments.selector);
  // Implementation would go here
  return {
    content: [
      {
        type: "text",
        text: `Extracted text from element with selector ${toolCall.arguments.selector}`
      }
    ]
  };
});

server.registerTool("browser_screenshot", {
  description: "Take a screenshot of the current page",
  inputSchema: {
    type: "object",
    properties: {
      filename: { type: "string", description: "Filename to save the screenshot as" }
    }
  }
}, async (toolCall) => {
  logger.info('Taking screenshot');
  // Implementation would go here
  return {
    content: [
      {
        type: "text",
        text: `Screenshot taken${toolCall.arguments.filename ? ` and saved as ${toolCall.arguments.filename}` : ''}`
      }
    ]
  };
});

// HTTP server
const httpServer = app.listen(PORT, () => {
  logger.info(`MCP Browsertools Server HTTP API listening on port ${PORT}`);
});

// STDIO server for MCP protocol
async function runStdioServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("MCP Browsertools Server running on stdio");
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  // Close any browser connections here
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  // Close any browser connections here
  process.exit(0);
});

// Start servers based on environment
if (process.env.MCP_TRANSPORT === 'stdio') {
  runStdioServer().catch(logger.error);
} else {
  // Default to HTTP server
  logger.info('Starting MCP Browsertools Server with HTTP transport');
}

module.exports = { app, server, httpServer };