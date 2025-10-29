# MCP Client Bridge

An intelligent MCP (Model Context Protocol) Client Bridge - a service that translates natural language requests into proper tool calls to MCP servers.

## Overview

The MCP Client Bridge acts as an intermediary between end users (LLMs or CLI users) and MCP servers, handling all the technical complexities of server communication. It provides:

- Natural language request parsing and intent detection
- Automatic routing to appropriate MCP servers
- Connection pooling for efficient server communication
- Persistent configuration storage
- REST API endpoints for management
- Environment variable configuration system
- Persistent storage for agent state and metrics

## Architecture

```
[User Request] -> [NLP Parser] -> [Intent Detection] -> [Server Router] -> [MCP Server]
                      |                    |                  |
                 [Config]          [Storage]         [Connection Pool]
```

## Installation

1. Clone the repository
2. Run the initialization script:
   ```bash
   ./init.sh
   ```

## Configuration

### Environment Variables

The application uses environment variables for configuration. Create a `.env` file in the root directory with the following variables:

```bash
# Server configuration
PORT=3000
HOST=localhost
NODE_ENV=development

# CORS configuration
CORS_ORIGIN=*
CORS_CREDENTIALS=true

# MCP client bridge configuration
MCP_DEFAULT_TIMEOUT=30000
MCP_MAX_RETRIES=3
MCP_RETRY_DELAY=1000
MCP_MAX_CONNECTIONS=10
MCP_MIN_CONNECTIONS=2
MCP_IDLE_TIMEOUT=30000

# Storage configuration
STORAGE_PATH=./data
STORAGE_TYPE=json
STORAGE_FILE_NAME=mcp-data.json

# Logging configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Cache configuration
CACHE_ENABLED=true
CACHE_TTL=300
CACHE_MAX_KEYS=1000
```

### MCP Server Configuration

MCP servers can be configured in `config/mcp-servers.json`:

```json
{
  "version": "1.0",
  "servers": [
    {
      "id": "example-server",
      "name": "Example Server",
      "url": "http://localhost:8080",
      "description": "Example MCP server for demonstration",
      "enabled": true,
      "timeout": 30000,
      "headers": {},
      "capabilities": {}
    }
  ]
}
```

## API Endpoints

### MCP Operations

- `POST /api/mcp/process` - Process a natural language request
  ```json
  {
    "request": "Find all JavaScript files in the src directory"
  }
  ```

- `GET /api/mcp/stats` - Get bridge statistics
- `POST /api/mcp/test-connection` - Test connection to an MCP server
- `GET /api/mcp/server/:serverId/capabilities` - Get server capabilities

### Configuration Management

- `GET /api/config/servers` - Get all server configurations
- `GET /api/config/servers/:serverId` - Get a specific server configuration
- `POST /api/config/servers` - Add a new server configuration
- `PUT /api/config/servers/:serverId` - Update a server configuration
- `DELETE /api/config/servers/:serverId` - Remove a server configuration
- `GET /api/config/settings` - Get global settings
- `PUT /api/config/settings` - Update global settings

## Usage Examples

### Processing a Natural Language Request

```bash
curl -X POST http://localhost:3000/api/mcp/process \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Search for all files containing the word 'error' in the logs directory"
  }'
```

### Adding a New MCP Server

```bash
curl -X POST http://localhost:3000/api/config/servers \
  -H "Content-Type: application/json" \
  -d '{
    "id": "new-server",
    "name": "New Server",
    "url": "http://localhost:8081",
    "description": "Newly added server",
    "enabled": true,
    "timeout": 30000,
    "headers": {
      "Authorization": "Bearer token123"
    }
  }'
```

## Features

### Connection Pooling
- Efficient management of connections to multiple MCP servers
- Automatic retry with exponential backoff
- Rate limiting to prevent server overload

### Caching
- Request result caching to improve performance
- Configurable TTL and maximum cache size
- Automatic cache invalidation for non-idempotent operations

### Persistent Storage
- Configuration storage for MCP server settings
- Metrics and statistics tracking
- Agent state persistence across restarts

### Security
- CORS configuration
- Rate limiting
- Environment-based configuration

## Development

### Running in Development Mode

```bash
npm run dev
```

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

## Deployment

The application can be deployed to any Node.js hosting platform. Ensure that:

1. Environment variables are properly configured
2. The data and logs directories are writable
3. Required ports are available