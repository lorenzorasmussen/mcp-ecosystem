# MCP Client-Daemon Implementation Plan

## 🚨 Critical Issues to Fix First

### **1. Communication Protocol Mismatch**

**Problem**: Client expects WebSocket, Server only provides SSE

```javascript
// Client (multi_agent_client.js:15)
this.ws = new WebSocket('ws://localhost:4103');

// Server (orchestrator.js:89) - No WebSocket server!
app.get('/events', (req, res) => {
  // Only SSE implementation
});
```

**Fix**: Add WebSocket server to orchestrator

```javascript
// src/mcp-ecosystem/core/orchestrator.js
const WebSocket = require('ws');

class EnhancedOrchestrator extends Orchestrator {
  constructor() {
    super();
    this.wss = new WebSocket.Server({ port: 4103 });
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', ws => {
      console.log('LLM client connected via WebSocket');

      ws.on('message', async data => {
        const request = JSON.parse(data);
        const response = await this.handleRequest(request);
        ws.send(JSON.stringify(response));
      });

      ws.on('close', () => {
        console.log('LLM client disconnected');
      });
    });
  }
}
```

### **2. Missing Server Files**

**Problem**: Lazy loader references non-existent server files

```javascript
// lazy_loader.js references these missing files:
-'src/servers/mem0_server.js' -
  'src/servers/notion_server.js' -
  'src/servers/browsertools_server.js';
// ... and 7 more
```

**Fix**: Create missing server implementations

```javascript
// src/servers/mem0_server.js
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

class Mem0Server {
  constructor() {
    this.server = new Server({
      name: 'mem0-server',
      version: '1.0.0',
    });

    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'mem0_search',
          description: 'Search memories using Mem0',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler('tools/call', async request => {
      // Implement Mem0 API calls
      return { result: await this.searchMemories(request.params.arguments) };
    });
  }

  async searchMemories(args) {
    // Connect to Mem0 Python service
    const response = await fetch('http://localhost:8000/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    return response.json();
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

new Mem0Server().run();
```

## 🏗️ Core Daemon Components Implementation

### **Phase 1: Connection Manager**

```javascript
// src/mcp-ecosystem/core/connection_manager.js
const WebSocket = require('ws');
const EventEmitter = require('events');

class ConnectionManager extends EventEmitter {
  constructor() {
    super();
    this.llmConnections = new Map(); // sessionId -> connection
    this.mcpConnections = new Map(); // serverId -> connection
    this.connectionPools = new Map(); // serverType -> pool
    this.heartbeatInterval = 30000; // 30 seconds
  }

  async addLLMConnection(sessionId, ws) {
    this.llmConnections.set(sessionId, {
      connection: ws,
      lastActivity: Date.now(),
      sessionData: {},
    });

    ws.on('message', data => this.handleLLMMessage(sessionId, data));
    ws.on('close', () => this.removeLLMConnection(sessionId));

    // Start heartbeat
    this.startHeartbeat(sessionId);

    console.log(`LLM client connected: ${sessionId}`);
    this.emit('llm_connected', sessionId);
  }

  async addMCPConnection(serverId, config) {
    const connection = await this.createMCPConnection(config);
    this.mcpConnections.set(serverId, {
      connection,
      config,
      lastHealthCheck: Date.now(),
      isHealthy: true,
    });

    // Start health monitoring
    this.startHealthMonitoring(serverId);

    console.log(`MCP server connected: ${serverId}`);
    this.emit('mcp_connected', serverId);
  }

  async createMCPConnection(config) {
    switch (config.transport) {
      case 'stdio':
        return this.createStdioConnection(config);
      case 'websocket':
        return this.createWebSocketConnection(config);
      case 'http':
        return this.createHTTPConnection(config);
      default:
        throw new Error(`Unsupported transport: ${config.transport}`);
    }
  }

  async handleLLMMessage(sessionId, data) {
    const connection = this.llmConnections.get(sessionId);
    if (!connection) return;

    connection.lastActivity = Date.now();

    try {
      const request = JSON.parse(data);

      // Route to appropriate handler
      if (request.type === 'tool_call') {
        const response = await this.routeToMCP(request);
        connection.connection.send(JSON.stringify(response));
      } else if (request.type === 'ping') {
        connection.connection.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      console.error(`Error handling message from ${sessionId}:`, error);
      connection.connection.send(
        JSON.stringify({
          type: 'error',
          message: error.message,
        })
      );
    }
  }

  async routeToMCP(request) {
    const serverId = this.getServerForTool(request.tool);
    const mcpConnection = this.mcpConnections.get(serverId);

    if (!mcpConnection || !mcpConnection.isHealthy) {
      throw new Error(`MCP server ${serverId} not available`);
    }

    // Translate LLM request to MCP format
    const mcpRequest = this.translateToMCP(request);

    // Send to MCP server
    const mcpResponse = await mcpConnection.connection.request(mcpRequest);

    // Translate MCP response back to LLM format
    return this.translateFromMCP(mcpResponse, request);
  }

  getServerForTool(toolName) {
    // Use server index to find appropriate server
    const serverIndex = require('../data/mcp_server_index.json');

    for (const [serverId, server] of Object.entries(serverIndex)) {
      if (server.tools && server.tools.some(tool => tool.name === toolName)) {
        return serverId;
      }
    }

    throw new Error(`No server found for tool: ${toolName}`);
  }

  translateToMCP(request) {
    return {
      method: 'tools/call',
      params: {
        name: request.tool,
        arguments: request.parameters,
      },
    };
  }

  translateFromMCP(mcpResponse, originalRequest) {
    return {
      type: 'tool_response',
      tool: originalRequest.tool,
      result: mcpResponse.result,
      metadata: {
        server: mcpResponse.serverId,
        executionTime: mcpResponse.executionTime,
      },
    };
  }

  startHeartbeat(sessionId) {
    const interval = setInterval(() => {
      const connection = this.llmConnections.get(sessionId);
      if (!connection) {
        clearInterval(interval);
        return;
      }

      // Check if connection is still alive
      if (Date.now() - connection.lastActivity > this.heartbeatInterval * 2) {
        this.removeLLMConnection(sessionId);
        clearInterval(interval);
      } else {
        connection.connection.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, this.heartbeatInterval);
  }

  startHealthMonitoring(serverId) {
    const interval = setInterval(async () => {
      const connection = this.mcpConnections.get(serverId);
      if (!connection) {
        clearInterval(interval);
        return;
      }

      try {
        // Health check
        const response = await connection.connection.request({ method: 'ping' });
        connection.isHealthy = true;
        connection.lastHealthCheck = Date.now();
      } catch (error) {
        console.error(`Health check failed for ${serverId}:`, error);
        connection.isHealthy = false;
        this.emit('mcp_unhealthy', serverId);
      }
    }, 60000); // Every minute
  }

  removeLLMConnection(sessionId) {
    this.llmConnections.delete(sessionId);
    console.log(`LLM client disconnected: ${sessionId}`);
    this.emit('llm_disconnected', sessionId);
  }

  removeMCPConnection(serverId) {
    this.mcpConnections.delete(serverId);
    console.log(`MCP server disconnected: ${serverId}`);
    this.emit('mcp_disconnected', serverId);
  }

  getStats() {
    return {
      llmConnections: this.llmConnections.size,
      mcpConnections: this.mcpConnections.size,
      healthyMCPConnections: Array.from(this.mcpConnections.values()).filter(conn => conn.isHealthy)
        .length,
    };
  }
}

module.exports = ConnectionManager;
```

### **Phase 2: Session Store**

```javascript
// src/mcp-ecosystem/core/session_store.js
const fs = require('fs').promises;
const path = require('path');

class SessionStore {
  constructor(options = {}) {
    this.storageDir = options.storageDir || './data/sessions';
    this.maxAge = options.maxAge || 3600000; // 1 hour
    this.maxSessions = options.maxSessions || 10000;
    this.sessions = new Map();
    this.cleanupInterval = 300000; // 5 minutes

    this.init();
  }

  async init() {
    // Ensure storage directory exists
    await fs.mkdir(this.storageDir, { recursive: true });

    // Load existing sessions
    await this.loadSessions();

    // Start cleanup interval
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  async createSession(sessionId, data = {}) {
    const session = {
      id: sessionId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      data: {
        context: [],
        preferences: {},
        history: [],
        ...data,
      },
    };

    this.sessions.set(sessionId, session);
    await this.saveSession(sessionId);

    return session;
  }

  async getSession(sessionId) {
    let session = this.sessions.get(sessionId);

    if (!session) {
      // Try to load from disk
      session = await this.loadSession(sessionId);
      if (session) {
        this.sessions.set(sessionId, session);
      }
    }

    if (session) {
      // Update last activity
      session.lastActivity = Date.now();
      await this.saveSession(sessionId);
    }

    return session;
  }

  async updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    Object.assign(session.data, updates);
    session.lastActivity = Date.now();

    await this.saveSession(sessionId);
    return session;
  }

  async addContext(sessionId, context) {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    session.data.context.push({
      timestamp: Date.now(),
      content: context,
    });

    // Keep only last 50 context items
    if (session.data.context.length > 50) {
      session.data.context = session.data.context.slice(-50);
    }

    await this.saveSession(sessionId);
    return session;
  }

  async addHistory(sessionId, entry) {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    session.data.history.push({
      timestamp: Date.now(),
      ...entry,
    });

    // Keep only last 100 history items
    if (session.data.history.length > 100) {
      session.data.history = session.data.history.slice(-100);
    }

    await this.saveSession(sessionId);
    return session;
  }

  async saveSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const filePath = path.join(this.storageDir, `${sessionId}.json`);
    await fs.writeFile(filePath, JSON.stringify(session, null, 2));
  }

  async loadSession(sessionId) {
    try {
      const filePath = path.join(this.storageDir, `${sessionId}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  async loadSessions() {
    try {
      const files = await fs.readdir(this.storageDir);
      const sessionFiles = files.filter(file => file.endsWith('.json'));

      for (const file of sessionFiles) {
        const sessionId = path.basename(file, '.json');
        const session = await this.loadSession(sessionId);
        if (session) {
          this.sessions.set(sessionId, session);
        }
      }

      console.log(`Loaded ${this.sessions.size} sessions from disk`);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }

  async deleteSession(sessionId) {
    this.sessions.delete(sessionId);

    try {
      const filePath = path.join(this.storageDir, `${sessionId}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Error deleting session ${sessionId}:`, error);
    }
  }

  async cleanup() {
    const now = Date.now();
    const toDelete = [];

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > this.maxAge) {
        toDelete.push(sessionId);
      }
    }

    for (const sessionId of toDelete) {
      await this.deleteSession(sessionId);
    }

    if (toDelete.length > 0) {
      console.log(`Cleaned up ${toDelete.length} expired sessions`);
    }
  }

  getStats() {
    return {
      totalSessions: this.sessions.size,
      memoryUsage: process.memoryUsage(),
      oldestSession: Math.min(...Array.from(this.sessions.values()).map(s => s.createdAt)),
      newestSession: Math.max(...Array.from(this.sessions.values()).map(s => s.createdAt)),
    };
  }
}

module.exports = SessionStore;
```

### **Phase 3: Protocol Translator**

```javascript
// src/mcp-ecosystem/core/protocol_translator.js
class ProtocolTranslator {
  constructor() {
    this.toolMappings = new Map();
    this.parameterMappings = new Map();
    this.responseMappings = new Map();
    this.loadMappings();
  }

  loadMappings() {
    // Load tool mappings from server index
    const serverIndex = require('../data/mcp_server_index.json');

    for (const [serverId, server] of Object.entries(serverIndex)) {
      if (server.tools) {
        for (const tool of server.tools) {
          this.toolMappings.set(tool.name, {
            serverId,
            mcpName: tool.name,
            parameters: tool.inputSchema?.properties || {},
            description: tool.description,
          });
        }
      }
    }
  }

  translateLLMToMCP(llmRequest) {
    const { tool, parameters, context, options = {} } = llmRequest;

    // Validate tool exists
    const toolMapping = this.toolMappings.get(tool);
    if (!toolMapping) {
      throw new Error(`Unknown tool: ${tool}`);
    }

    // Translate parameters
    const translatedParameters = this.translateParameters(tool, parameters, toolMapping.parameters);

    // Build MCP request
    const mcpRequest = {
      method: 'tools/call',
      params: {
        name: toolMapping.mcpName,
        arguments: translatedParameters,
      },
      meta: {
        sessionId: options.sessionId,
        requestId: options.requestId,
        timestamp: Date.now(),
        priority: options.priority || 'normal',
      },
    };

    return {
      request: mcpRequest,
      serverId: toolMapping.serverId,
      toolMapping,
    };
  }

  translateMCPToLLM(mcpResponse, originalRequest, toolMapping) {
    const { result, error, meta } = mcpResponse;

    if (error) {
      return {
        type: 'error',
        tool: originalRequest.tool,
        error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message || 'Unknown error occurred',
          details: error.details || null,
        },
        metadata: {
          serverId: toolMapping.serverId,
          executionTime: meta?.executionTime || 0,
          requestId: originalRequest.options?.requestId,
        },
      };
    }

    // Format result based on tool type
    const formattedResult = this.formatResult(result, toolMapping);

    return {
      type: 'tool_response',
      tool: originalRequest.tool,
      result: formattedResult,
      metadata: {
        serverId: toolMapping.serverId,
        executionTime: meta?.executionTime || 0,
        resultSize: JSON.stringify(result).length,
        requestId: originalRequest.options?.requestId,
        cacheable: this.isCacheable(originalRequest.tool, result),
      },
      suggestions: this.generateSuggestions(originalRequest, result, toolMapping),
    };
  }

  translateParameters(toolName, parameters, schema) {
    const translated = {};

    for (const [paramName, paramValue] of Object.entries(parameters || {})) {
      const paramSchema = schema[paramName];

      if (!paramSchema) {
        console.warn(`Unknown parameter ${paramName} for tool ${toolName}`);
        continue;
      }

      // Type conversion and validation
      translated[paramName] = this.convertParameterType(paramValue, paramSchema);
    }

    // Add required parameters with defaults
    for (const [paramName, paramSchema] of Object.entries(schema)) {
      if (paramSchema.required && !(paramName in translated)) {
        if (paramSchema.default !== undefined) {
          translated[paramName] = paramSchema.default;
        } else {
          throw new Error(`Required parameter ${paramName} missing for tool ${toolName}`);
        }
      }
    }

    return translated;
  }

  convertParameterType(value, schema) {
    const { type } = schema;

    if (value === null || value === undefined) {
      return value;
    }

    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'object':
        return typeof value === 'object' ? value : {};
      default:
        return value;
    }
  }

  formatResult(result, toolMapping) {
    // Format result based on tool type and expected output
    const toolName = toolMapping.mcpName;

    switch (toolName) {
      case 'filesystem_read':
        return this.formatFilesystemResult(result);
      case 'git_status':
        return this.formatGitResult(result);
      case 'web_search':
        return this.formatSearchResult(result);
      default:
        return result;
    }
  }

  formatFilesystemResult(result) {
    if (typeof result === 'string') {
      return {
        type: 'text',
        content: result,
        size: result.length,
        lines: result.split('\n').length,
      };
    }

    return result;
  }

  formatGitResult(result) {
    if (Array.isArray(result)) {
      return {
        type: 'git_status',
        files: result.map(file => ({
          path: file.path,
          status: file.status,
          changes: file.changes || 0,
        })),
      };
    }

    return result;
  }

  formatSearchResult(result) {
    if (Array.isArray(result)) {
      return {
        type: 'search_results',
        results: result.map(item => ({
          title: item.title,
          url: item.url,
          snippet: item.snippet,
          relevance: item.relevance || 0,
        })),
        total: result.length,
      };
    }

    return result;
  }

  generateSuggestions(originalRequest, result, toolMapping) {
    const suggestions = [];
    const toolName = originalRequest.tool;

    // Contextual suggestions based on tool and result
    if (toolName === 'filesystem_read' && result) {
      suggestions.push({
        type: 'follow_up',
        suggestion: 'Consider reading related files in the same directory',
        tool: 'filesystem_list',
        parameters: { directory: this.extractDirectory(originalRequest.parameters.path) },
      });
    }

    if (toolName === 'git_status' && Array.isArray(result) && result.length > 0) {
      suggestions.push({
        type: 'follow_up',
        suggestion: 'You have modified files. Consider committing them.',
        tool: 'git_add',
        parameters: { files: result.map(f => f.path) },
      });
    }

    return suggestions;
  }

  extractDirectory(filePath) {
    const parts = filePath.split('/');
    return parts.slice(0, -1).join('/');
  }

  isCacheable(toolName, result) {
    // Define cacheable tools
    const cacheableTools = ['filesystem_read', 'git_status', 'web_search', 'database_query'];

    return cacheableTools.includes(toolName) && typeof result === 'object' && result !== null;
  }

  getToolMapping(toolName) {
    return this.toolMappings.get(toolName);
  }

  getAllTools() {
    return Array.from(this.toolMappings.entries()).map(([name, mapping]) => ({
      name,
      description: mapping.description,
      parameters: mapping.parameters,
      serverId: mapping.serverId,
    }));
  }
}

module.exports = ProtocolTranslator;
```

## 📋 Implementation Checklist

### **Week 1: Critical Fixes**

- [ ] Fix WebSocket server in orchestrator
- [ ] Create missing server files (mem0, notion, browsertools, etc.)
- [ ] Test client-server communication
- [ ] Fix directory structure inconsistencies

### **Week 2: Core Daemon**

- [ ] Implement ConnectionManager class
- [ ] Implement SessionStore class
- [ ] Create basic MCPDaemon orchestrator
- [ ] Add persistent connection handling

### **Week 3: Intelligence Layer**

- [ ] Implement ProtocolTranslator class
- [ ] Add intelligent routing logic
- [ ] Create basic caching system
- [ ] Add request queuing

### **Week 4: Client Library**

- [ ] Create MCPDaemonClient class
- [ ] Implement simplified API
- [ ] Add context management
- [ ] Create usage examples

### **Week 5: Testing & Documentation**

- [ ] Write comprehensive tests
- [ ] Create API documentation
- [ ] Add deployment guides
- [ ] Performance testing

### **Week 6: Optimization**

- [ ] Add advanced caching
- [ ] Implement request batching
- [ ] Add monitoring and metrics
- [ ] Performance tuning

## 🎯 Success Criteria

### **Functional Requirements**

- [ ] Persistent LLM connections with reconnection
- [ ] Intelligent tool routing with load balancing
- [ ] Response caching with 80%+ hit rate
- [ ] Protocol translation for all major tools
- [ ] Session persistence across restarts

### **Performance Requirements**

- [ ] < 100ms response time for cached requests
- [ ] < 500ms response time for uncached requests
- [ ] Support 100+ concurrent connections
- [ ] 99.9% uptime

### **Developer Experience**

- [ ] Simple client library API
- [ ] Comprehensive documentation
- [ ] Easy deployment and configuration
- [ ] Clear error messages and debugging

---

**Implementation Plan Version**: 1.0.0  
**Last Updated**: 2025-10-29  
**Next Review**: 2025-11-05  
**Implementation Lead**: Development Team
