# MCP Ecosystem API Documentation

## Overview

The MCP Ecosystem provides a comprehensive REST API for interacting with all system components. The API follows RESTful principles and uses JSON for request and response bodies. All endpoints are versioned using URL paths (currently v1).

## Authentication

Most endpoints in the MCP Ecosystem do not require authentication for local development, but in production environments, authentication may be implemented through:

- API keys passed in headers: `X-API-Key: your-api-key`
- JWT tokens: `Authorization: Bearer your-jwt-token`
- Basic authentication: `Authorization: Basic base64-encoded-credentials`

## Common Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2023-10-29T12:34:56.789Z",
  "requestId": "unique-request-id"
}
```

Error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details",
  "timestamp": "2023-10-29T12:34:56.789Z",
  "requestId": "unique-request-id"
}
```

## MCP Orchestrator API

The orchestrator serves as the central hub for the entire ecosystem, managing communication between all components.

### Health and Status Endpoints

#### GET /health
Check the overall health of the orchestrator service.

**Response:**
```json
{
  "status": "healthy",
  "service": "orchestrator"
}
```

**Status Codes:**
- 200: Service is healthy
- 503: Service is unhealthy

#### GET /status
Get comprehensive status of all services in the ecosystem.

**Response:**
```json
{
  "mcp-gemini-bridge": {
    "overall": true,
    "http": true,
    "ws": true
  },
  "mcp-qwen-bridge": {
    "overall": false,
    "http": false,
    "ws": false
  },
  "coordination": {
    "status": "healthy",
    "integrated": true,
    "url": "http://localhost:3109"
  }
}
```

**Status Codes:**
- 200: Status retrieved successfully
- 500: Error retrieving status

#### GET /coordination/health
Check the health of the coordination service.

**Response:**
```json
{
  "status": "healthy",
  "service": "coordination",
  "integrated": true,
  "orchestrator_url": "http://localhost:3109"
}
```

**Status Codes:**
- 200: Coordination service is healthy
- 503: Coordination service is unavailable

### Tool Execution Endpoints

#### GET /tools
List all available proxy tools.

**Response:**
```json
{
  "tools": [
    "filesystem",
    "notion",
    "webfetch",
    "browsertools",
    "desktop-control",
    "memory",
    "coordination"
  ]
}
```

**Status Codes:**
- 200: Tools list retrieved successfully

#### POST /tool/:toolName
Execute a specific tool with provided parameters.

**Path Parameters:**
- `toolName` (string): Name of the tool to execute

**Request Body:**
```json
{
  "method": "query",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

**Response:**
```json
{
  "result": "tool execution result",
  "success": true
}
```

**Status Codes:**
- 200: Tool executed successfully
- 404: Tool not found
- 500: Tool execution failed

### Generation Endpoints

#### POST /generate
Generate a response using the orchestration system with memory context.

**Request Body:**
```json
{
  "prompt": "Your prompt here",
  "sessionId": "session-id",
  "context": {
    "additional": "contextual information"
  }
}
```

**Response:**
```json
{
  "response": "Generated response",
  "model": "model-name",
  "llm": "selected-llm",
  "sessionId": "session-id"
}
```

**Status Codes:**
- 200: Response generated successfully
- 500: Generation failed

### Coordination API Proxies

#### GET /coordination/status
Get the status of the coordination service.

**Response:**
```json
{
  "sessions": {
    "total": 5,
    "active": 3,
    "branches": 4
  },
  "todos": {
    "total": 17,
    "active": 10,
    "completed": 3,
    "agents": 11
  },
  "enforcement": {
    "rules_loaded": true,
    "hooks_installed": true,
    "violations": 0
  }
}
```

#### POST /coordination/check-branch
Check if a branch switch is allowed.

**Request Body:**
```json
{
  "branch": "feature/new-feature",
  "force": false
}
```

**Response:**
```json
{
  "allowed": true,
  "reason": "No conflicts detected",
  "conflicts": [],
  "branch": "feature/new-feature",
  "force": false
}
```

#### GET /coordination/report
Get an enforcement report from the coordination service.

**Response:**
```json
{
  "report": "Enforcement report content...",
  "timestamp": "2023-10-29T12:34:56.789Z"
}
```

### Real-time Events

#### GET /events
Server-sent events endpoint for real-time coordination updates.

**Response (SSE format):**
```
data: {"type": "coordination_result", "results": [...]}
```

## Coordination Server API

The coordination server provides multi-agent coordination and todo enforcement capabilities.

### Health and Status Endpoints

#### GET /health
Check the health of the coordination server.

**Response:**
```json
{
  "status": "healthy",
  "service": "mcp-coordination-server",
  "version": "1.0.0",
  "uptime": 3600.5,
  "timestamp": "2023-10-29T12:34:56.789Z"
}
```

#### GET /api/status
Get comprehensive coordination status.

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": {
      "total": 5,
      "active": 3,
      "branches": 4
    },
    "todos": {
      "total": 17,
      "active": 10,
      "completed": 3,
      "agents": 11
    },
    "enforcement": {
      "rules_loaded": true,
      "hooks_installed": true,
      "violations": 0
    },
    "timestamp": "2023-10-29T12:34:56.789Z"
  }
}
```

### Enforcement Endpoints

#### POST /api/enforcement/check-branch
Check if a branch switch is allowed.

**Request Body:**
```json
{
  "branch": "feature/new-feature",
  "force": false
}
```

**Response:**
```json
{
  "success": true,
  "allowed": true,
  "reason": "No conflicts detected",
  "conflicts": [],
  "branch": "feature/new-feature",
  "force": false
}
```

**Status Codes:**
- 200: Check completed successfully
- 400: Missing required parameters
- 500: Check failed

#### POST /api/enforcement/check-git
Check if a git operation is allowed.

**Request Body:**
```json
{
  "operation": "push",
  "options": {
    "branch": "main",
    "force": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "allowed": true,
  "reason": "Operation allowed",
  "operation": "push",
  "options": {
    "branch": "main",
    "force": false
  }
}
```

#### POST /api/enforcement/check-todo
Check if a todo operation is allowed.

**Request Body:**
```json
{
  "operation": "start",
  "todoId": "todo-123",
  "agentId": "agent-1",
  "options": {}
}
```

**Response:**
```json
{
  "success": true,
  "allowed": true,
  "reason": "Operation allowed",
  "operation": "start",
  "todoId": "todo-123",
  "agentId": "agent-1"
}
```

#### GET /api/enforcement/report
Generate an enforcement report.

**Response:**
```json
{
  "success": true,
  "report": "Enforcement report content...",
  "timestamp": "2023-10-29T12:34:56.789Z"
}
```

### Administrative Endpoints

#### POST /api/admin/enforce-limits
Enforce session limits.

**Response:**
```json
{
  "success": true,
  "message": "Session limits enforced",
  "timestamp": "2023-10-29T12:34:56.789Z"
}
```

#### GET /api/data
Get raw coordination data (read-only).

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": {},
    "branches": {},
    "rules": {}
  },
  "timestamp": "2023-10-29T12:34:56.789Z"
}
```

## Lazy Loader API

The lazy loader manages the lifecycle of MCP servers, starting them on demand and stopping them when idle.

### Server Management Endpoints

#### GET /servers
List all available servers with their status.

**Query Parameters:**
- `limit` (number, optional): Maximum number of servers to return (default: 10)
- `category` (string, optional): Filter by category

**Response:**
```json
{
  "s": {
    "mem0": {
      "r": 1,
      "m": "130M",
      "p": 3100
    },
    "notion": {
      "r": 0,
      "m": "120M",
      "p": 3105
    }
  },
  "t": 2
}
```

#### GET /servers/min
Get minimal server information.

**Query Parameters:**
- `limit` (number, optional): Maximum number of servers to return (default: 15)

**Response:**
```json
[
  {
    "n": "mem0",
    "r": 1
  },
  {
    "n": "notion",
    "r": 0
  }
]
```

#### GET /servers/status
Get overall server status.

**Response:**
```json
{
  "t": 25,
  "r": 3
}
```

#### GET /servers/compact
Get compact server information.

**Query Parameters:**
- `limit` (number, optional): Maximum number of servers to return (default: 50)

**Response:**
```json
{
  "mem0": {
    "type": "tcp",
    "port": 3100,
    "memory": "130M",
    "running": true
  },
  "notion": {
    "type": "tcp",
    "port": 3105,
    "memory": "120M",
    "running": false
  }
}
```

#### POST /start/:serverName
Start a specific server.

**Path Parameters:**
- `serverName` (string): Name of the server to start

**Response:**
```json
{
  "success": true,
  "port": 3100,
  "status": "running",
  "type": "tcp",
  "memory": "130M"
}
```

#### POST /stop/:serverName
Stop a specific server.

**Path Parameters:**
- `serverName` (string): Name of the server to stop

**Response:**
```json
{
  "success": true,
  "status": "stopped"
}
```

#### GET /status/:serverName
Check the status of a specific server.

**Path Parameters:**
- `serverName` (string): Name of the server to check

**Response:**
```json
{
  "running": true,
  "port": 3100,
  "uptime": 1800000
}
```

#### GET /status
Get the status of all running servers.

**Response:**
```json
{
  "mem0": {
    "running": true,
    "port": 3100,
    "uptime": 1800000
  },
  "notion": {
    "running": false,
    "port": 3105,
    "uptime": null
  }
}
```

## MCP Proxy Server API

The proxy server acts as an intelligent gateway between clients and individual MCP servers.

### Tool Discovery

#### GET /tools
List all available tools.

**Response:**
```json
{
  "tools": [
    {
      "name": "mem0_store_memory",
      "description": "Store a memory item for a session",
      "inputSchema": {
        "type": "object",
        "properties": {
          "sessionId": {
            "type": "string",
            "description": "Session identifier"
          },
          "content": {
            "type": "string",
            "description": "Memory content to store"
          },
          "category": {
            "type": "string",
            "description": "Memory category"
          }
        },
        "required": ["sessionId", "content"]
      }
    },
    {
      "name": "read_file",
      "description": "Read contents of a file",
      "inputSchema": {
        "type": "object",
        "properties": {
          "path": {
            "type": "string",
            "description": "Path to the file"
          }
        },
        "required": ["path"]
      }
    }
  ]
}
```

### Server Management

#### GET /proxy_list_servers
List all available MCP servers and their status.

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Available servers: mem0, notion, browsertools, google-suite"
    }
  ]
}
```

#### POST /proxy_start_server
Start a specific MCP server.

**Request Body:**
```json
{
  "serverName": "mem0"
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Server mem0 started successfully"
    }
  ]
}
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
Returned when the request is malformed or missing required parameters.

```json
{
  "success": false,
  "error": "Bad Request",
  "details": "Missing required parameter: branch"
}
```

#### 404 Not Found
Returned when the requested resource does not exist.

```json
{
  "success": false,
  "error": "Not Found",
  "details": "Tool 'nonexistent-tool' not found"
}
```

#### 500 Internal Server Error
Returned when an unexpected error occurs on the server.

```json
{
  "success": false,
  "error": "Internal Server Error",
  "details": "An unexpected error occurred"
}
```

#### 503 Service Unavailable
Returned when a dependent service is unavailable.

```json
{
  "success": false,
  "error": "Service Unavailable",
  "details": "Coordination service unavailable"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General endpoints**: 100 requests per minute per IP
- **Server management endpoints**: 10 requests per minute per IP
- **Generation endpoints**: 20 requests per minute per IP

When rate limited, the API returns a 429 status code:

```json
{
  "success": false,
  "error": "Rate Limited",
  "details": "Too many requests, please try again later"
}
```

## SDKs and Client Libraries

### JavaScript/Node.js Client

```javascript
import axios from 'axios';

class MCPEcosystemClient {
  constructor(baseUrl = 'http://localhost:3103') {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
    });
  }

  async getStatus() {
    const response = await this.client.get('/status');
    return response.data;
  }

  async executeTool(toolName, parameters) {
    const response = await this.client.post(`/tool/${toolName}`, {
      parameters
    });
    return response.data;
  }

  async generate(prompt, sessionId, context = {}) {
    const response = await this.client.post('/generate', {
      prompt,
      sessionId,
      context
    });
    return response.data;
  }
}

// Usage
const client = new MCPEcosystemClient();
const status = await client.getStatus();
console.log(status);
```

### Python Client

```python
import requests
from typing import Dict, Any

class MCPEcosystemClient:
    def __init__(self, base_url: str = 'http://localhost:3103'):
        self.base_url = base_url
        self.session = requests.Session()

    def get_status(self) -> Dict[str, Any]:
        response = self.session.get(f"{self.base_url}/status")
        response.raise_for_status()
        return response.json()

    def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        response = self.session.post(
            f"{self.base_url}/tool/{tool_name}",
            json={"parameters": parameters}
        )
        response.raise_for_status()
        return response.json()

    def generate(self, prompt: str, session_id: str, context: Dict[str, Any] = {}) -> Dict[str, Any]:
        response = self.session.post(
            f"{self.base_url}/generate",
            json={
                "prompt": prompt,
                "sessionId": session_id,
                "context": context
            }
        )
        response.raise_for_status()
        return response.json()

# Usage
client = MCPEcosystemClient()
status = client.get_status()
print(status)
```

## Webhook Support

The ecosystem supports webhooks for real-time notifications:

### Webhook Events

- `server_started`: Emitted when an MCP server is started
- `server_stopped`: Emitted when an MCP server is stopped
- `coordination_conflict`: Emitted when a coordination conflict is detected
- `todo_completed`: Emitted when a todo is completed
- `health_status_change`: Emitted when health status changes

### Webhook Configuration

Webhooks can be configured through the coordination server:

```json
{
  "webhooks": [
    {
      "url": "https://your-webhook-url.com",
      "events": ["server_started", "server_stopped"],
      "secret": "your-webhook-secret"
    }
  ]
}
```

### Webhook Payload Format

```json
{
  "event": "server_started",
  "timestamp": "2023-10-29T12:34:56.789Z",
  "data": {
    "serverName": "mem0",
    "port": 3100,
    "memory": "130M"
  },
  "signature": "webhook-signature"
}
```

## Testing the API

### Using curl

```bash
# Check orchestrator health
curl http://localhost:3103/health

# List available tools
curl http://localhost:3103/tools

# Execute a tool
curl -X POST http://localhost:3103/tool/read_file \
  -H "Content-Type: application/json" \
  -d '{"parameters": {"path": "./README.md"}}'

# Generate a response
curl -X POST http://localhost:3103/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?", "sessionId": "test-session"}'
```

### Using Postman

Create a Postman collection with the following requests:

1. **Health Check**: GET http://localhost:3103/health
2. **Status Check**: GET http://localhost:3103/status
3. **Tool List**: GET http://localhost:3103/tools
4. **Tool Execution**: POST http://localhost:3103/tool/{toolName}
5. **Generation**: POST http://localhost:3103/generate

## Versioning

The API follows semantic versioning principles:

- **URL-based versioning**: `/v1/` prefix for all endpoints
- **Backward compatibility**: Breaking changes will result in a new major version
- **Feature additions**: Non-breaking additions may be added to the current version
- **Deprecation policy**: Deprecated endpoints will be maintained for 6 months after announcement

## Support and Contact

For API support and questions:

- **Documentation**: Check the comprehensive documentation in the docs/ directory
- **Issue Tracker**: Report bugs and feature requests on GitHub
- **Community**: Join the GitHub Discussions for community support
- **Email**: Contact the development team at mcp-ecosystem-support@example.com