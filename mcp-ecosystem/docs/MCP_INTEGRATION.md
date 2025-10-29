# MCP Integration Guide

This document explains how to integrate with the MCP ecosystem using the Model Context Protocol.

## MCP Protocol Overview

The Model Context Protocol (MCP) enables AI models and tools to communicate through a standardized interface. The MCP ecosystem implements MCP servers that provide various tools and capabilities.

## Connecting to MCP Servers

### Direct Server Connection

Each MCP server runs as a separate process with stdio transport:

```bash
# Start a server
node src/servers/mem0_server.js

# Or via lazy loader
curl -X POST http://localhost:3007/start/mem0
```

### MCP Proxy Connection

The MCP proxy provides a unified interface to all servers:

```bash
# Start the proxy
node src/mcp_proxy.js
```

## MCP Protocol Messages

### Initialization

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "my-client",
      "version": "1.0.0"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {
        "listChanged": true
      }
    },
    "serverInfo": {
      "name": "mcp-proxy",
      "version": "1.0.0"
    }
  }
}
```

### Tool Discovery

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "mem0_store_memory",
        "description": "Store a memory item for a session",
        "inputSchema": {
          "type": "object",
          "properties": {
            "sessionId": { "type": "string" },
            "content": { "type": "string" },
            "category": { "type": "string" }
          },
          "required": ["sessionId", "content"]
        }
      }
    ]
  }
}
```

### Tool Execution

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "mem0_store_memory",
    "arguments": {
      "sessionId": "session-123",
      "content": "User asked about project status",
      "category": "conversation"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Memory stored successfully with ID: abc-123"
      }
    ]
  }
}
```

## Available Tools

### Memory Management (mem0_*)

- **mem0_store_memory**: Store conversation memory
- **mem0_recall_memory**: Retrieve memories by session
- **mem0_search_memory**: Search across all stored memories

### Task Management (task_*)

- **task_create**: Create new tasks with priorities and due dates
- **task_list**: List tasks with filtering options
- **task_update**: Update task properties
- **task_delete**: Remove tasks
- **project_create**: Create project containers
- **project_list**: List all projects
- **project_get_tasks**: Get tasks for a specific project

### Proxy Management (proxy_*)

- **proxy_list_servers**: List available MCP servers
- **proxy_start_server**: Start a server on demand

### External Tools

- **Filesystem**: File operations (read_file, list_dir, etc.)
- **Git**: Repository management (git_status, git_log, etc.)
- **Web**: HTTP requests and content fetching
- **Browser**: Web automation and scraping
- **Notion**: Workspace and database integration
- **Google Suite**: Gmail, Docs, Sheets integration

## Client Implementation Examples

### Node.js MCP Client

```javascript
import { spawn } from "child_process";

class MCPClient {
  constructor(serverPath) {
    this.serverProcess = spawn("node", [serverPath], {
      stdio: ["pipe", "pipe", "pipe"]
    });
    this.pendingRequests = new Map();
    this.nextId = 1;

    this.serverProcess.stdout.on("data", (data) => {
      this.handleResponse(data.toString());
    });
  }

  handleResponse(data) {
    const lines = data.split("\n");
    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line.trim());
          if (response.id && this.pendingRequests.has(response.id)) {
            const { resolve, reject } = this.pendingRequests.get(response.id);
            this.pendingRequests.delete(response.id);

            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
          }
        } catch (error) {
          console.error("Failed to parse MCP response:", error);
        }
      }
    }
  }

  sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const request = {
        jsonrpc: "2.0",
        id,
        method,
        params
      };

      this.pendingRequests.set(id, { resolve, reject });
      this.serverProcess.stdin.write(JSON.stringify(request) + "\n");

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Request timeout"));
        }
      }, 30000);
    });
  }

  async initialize() {
    return this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "my-client", version: "1.0.0" }
    });
  }

  async listTools() {
    return this.sendRequest("tools/list");
  }

  async callTool(name, args) {
    return this.sendRequest("tools/call", {
      name,
      arguments: args
    });
  }

  close() {
    this.serverProcess.kill();
  }
}

// Usage
const client = new MCPClient("src/mcp_proxy.js");

try {
  await client.initialize();
  console.log("MCP client initialized");

  const tools = await client.listTools();
  console.log("Available tools:", tools.tools.length);

  // Call a tool
  const result = await client.callTool("proxy_list_servers", {});
  console.log("Tool result:", result);

} finally {
  client.close();
}
```

### Python MCP Client

```python
import subprocess
import json
import threading
import queue

class MCPClient:
    def __init__(self, server_command):
        self.process = subprocess.Popen(
            server_command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        self.pending_requests = {}
        self.next_id = 1
        self.response_queue = queue.Queue()

        # Start response reader thread
        threading.Thread(target=self._read_responses, daemon=True).start()

    def _read_responses(self):
        for line in self.process.stdout:
            try:
                response = json.loads(line.strip())
                self.response_queue.put(response)
            except json.JSONDecodeError:
                continue

    def send_request(self, method, params=None):
        request_id = self.next_id
        self.next_id += 1

        request = {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
            "params": params or {}
        }

        self.process.stdin.write(json.dumps(request) + "\n")
        self.process.stdin.flush()

        # Wait for response
        while True:
            try:
                response = self.response_queue.get(timeout=30)
                if response.get("id") == request_id:
                    if "error" in response:
                        raise Exception(response["error"]["message"])
                    return response.get("result")
            except queue.Empty:
                raise Exception("Request timeout")

    def initialize(self):
        return self.send_request("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "python-client", "version": "1.0.0"}
        })

    def list_tools(self):
        return self.send_request("tools/list")

    def call_tool(self, name, arguments=None):
        return self.send_request("tools/call", {
            "name": name,
            "arguments": arguments or {}
        })

    def close(self):
        self.process.terminate()
        self.process.wait()

# Usage
client = MCPClient(["node", "src/mcp_proxy.js"])

try:
    client.initialize()
    print("MCP client initialized")

    tools = client.list_tools()
    print(f"Available tools: {len(tools['tools'])}")

    # Call a tool
    result = client.call_tool("proxy_list_servers")
    print("Tool result:", result)

finally:
    client.close()
```

## Error Handling

### Common Error Responses

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "error": {
    "code": -32601,
    "message": "Method not found"
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "error": {
    "code": -32602,
    "message": "Invalid params"
  }
}
```

### Timeout Handling

All requests have a 30-second timeout. Handle timeouts appropriately:

```javascript
try {
  const result = await client.callTool("some_tool", args);
} catch (error) {
  if (error.message.includes("timeout")) {
    console.log("Request timed out, retrying...");
    // Retry logic
  }
}
```

## Best Practices

### Connection Management

- Initialize the connection once at startup
- Reuse the connection for multiple requests
- Properly close connections when shutting down

### Error Recovery

- Implement retry logic for transient failures
- Check server health before sending requests
- Handle network interruptions gracefully

### Performance Optimization

- Cache tool lists if they don't change frequently
- Batch related operations when possible
- Monitor response times and optimize slow tools

### Security

- Validate all input parameters
- Use secure connections for remote servers
- Implement proper authentication for sensitive operations

## Testing

### Unit Testing MCP Tools

```javascript
import { MCPClient } from "./mcp-client.js";

describe("MCP Tools", () => {
  let client;

  beforeAll(async () => {
    client = new MCPClient("src/mcp_proxy.js");
    await client.initialize();
  });

  afterAll(() => {
    client.close();
  });

  test("list tools", async () => {
    const result = await client.listTools();
    expect(result.tools).toBeDefined();
    expect(Array.isArray(result.tools)).toBe(true);
  });

  test("create task", async () => {
    const result = await client.callTool("task_create", {
      title: "Test Task",
      priority: "medium"
    });

    expect(result.content[0].text).toContain("created successfully");
  });
});
```

### Integration Testing

```bash
# Test full workflow
npm test

# Test individual servers
node test_mcp_proxy_stdio.js

# Load testing
npm run load-test
```

## Troubleshooting

### Connection Issues

1. **Server not responding**: Check if server is running with `pm2 status`
2. **Protocol version mismatch**: Ensure client and server use compatible MCP versions
3. **Tool not found**: Verify tool name and server availability

### Performance Issues

1. **Slow responses**: Check server logs for bottlenecks
2. **Memory leaks**: Monitor with `pm2 monit`
3. **Network latency**: Test with local vs remote servers

### Debug Logging

Enable debug logging:

```bash
DEBUG=mcp:* node your-client.js
```

Or check server logs:

```bash
pm2 logs mcp-proxy
pm2 logs lazy-loader
```</content>
</xai:function_call">Error: Executable not found in $PATH: "prettier"