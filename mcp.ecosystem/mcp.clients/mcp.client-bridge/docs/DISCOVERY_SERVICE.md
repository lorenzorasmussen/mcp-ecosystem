# MCP Server Discovery Service

The MCP Server Discovery Service enables easy discovery and interaction with all available MCP servers and their tools.

## Overview

This service provides a centralized index of all MCP servers, their capabilities, and available tools. It allows clients to:

1. **Discover Available Servers**: List all servers in the ecosystem
2. **Search by Category**: Find servers by functional categories (AI, Productivity, Web, etc.)
3. **Search by Keywords**: Find servers and tools using natural language queries
4. **Find Matching Tools**: Automatically match user requests to appropriate tools
5. **Get Detailed Information**: Access comprehensive server and tool metadata

## API Endpoints

### Server Discovery Endpoints

```
GET    /api/mcp/discovery/servers                    # Get all servers
GET    /api/mcp/discovery/servers/:serverId         # Get specific server
GET    /api/mcp/discovery/servers/category/:category # Search by category
GET    /api/mcp/discovery/servers/search/:keyword    # Search by keyword
POST   /api/mcp/discovery/tools/search              # Find tools for natural language query
GET    /api/mcp/discovery/tools                     # Get all tools
GET    /api/mcp/discovery/index/metadata            # Get index metadata
POST   /api/mcp/discovery/index/refresh             # Refresh the index
```

## Usage Examples

### JavaScript/Node.js

```javascript
const ServerDiscoveryService = require('./src/services/ServerDiscoveryService');

// Initialize the discovery service
const discoveryService = new ServerDiscoveryService();

// Load the server index
await discoveryService.loadServerIndex();

// Find tools that can handle a natural language request
const results = await discoveryService.findToolsForQuery('read a file from my desktop');
console.log('Matching tools:', results);

// Get all servers
const servers = await discoveryService.getAllServers();
console.log('Available servers:', servers.length);

// Search servers by category
const aiServers = await discoveryService.getServersByCategory('AI');
console.log('AI servers:', aiServers);
```

### REST API Calls

```bash
# Get all servers
curl http://localhost:3000/api/mcp/discovery/servers

# Search for AI servers
curl http://localhost:3000/api/mcp/discovery/servers/category/AI

# Find tools for a query
curl -X POST http://localhost:3000/api/mcp/discovery/tools/search \
  -H "Content-Type: application/json" \
  -d '{"query": "send an email"}'

# Get server index metadata
curl http://localhost:3000/api/mcp/discovery/index/metadata
```

## Index Structure

The discovery service uses a structured JSON index file (`MCP_SERVER_INDEX.json`) that contains:

```json
{
  "last_updated": "2024-10-29T03:00:00Z",
  "servers": [
    {
      "id": "mcp.gemini-bridge",
      "name": "Gemini AI Bridge",
      "description": "Bridge to Google's Gemini AI for advanced language processing",
      "category": "AI",
      "tools": [
        {
          "name": "gemini_generate_content",
          "description": "Generate content using Gemini AI",
          "parameters": {
            "prompt": "string",
            "model": "string?",
            "temperature": "number?"
          }
        }
      ]
    }
  ]
}
```

## Available Servers

Currently indexed servers include:

1. **mcp.gemini-bridge** - Google's Gemini AI bridge
2. **mcp.mem0** - Memory management service
3. **mcp.notion** - Notion workspace integration
4. **mcp.google-suite** - Google Suite services (Gmail, Docs, etc.)
5. **mcp.task** - Task management service
6. **mcp.browsertools** - Browser automation tools
7. **mcp.filesystem** - File system operations
8. **mcp.webfetch** - Web content fetching
9. **mcp.desktop-control** - Desktop automation control

## Running the Example

To run the discovery demonstration:

```bash
cd /Users/lorenzorasmussen/.local/share/mcp/mcp.ecosystem/mcp.clients/mcp.client-bridge
node examples/discovery-example.js
```

This will show all available servers, search capabilities, and tool discovery features.