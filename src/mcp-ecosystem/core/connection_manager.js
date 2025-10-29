import EventEmitter from 'events';
import WebSocket from 'ws';
import crypto from 'crypto';

class ConnectionManager extends EventEmitter {
  constructor() {
    super();
    this.llmConnections = new Map(); // sessionId -> connection info
    this.mcpConnections = new Map(); // serverId -> connection info
    this.connectionPools = new Map(); // serverType -> connection pool
    this.heartbeatInterval = 30000; // 30 seconds
    this.maxConnections = 1000;
    this.connectionTimeout = 300000; // 5 minutes
    this.heartbeatTimers = new Map(); // sessionId -> timer

    this.startHeartbeatMonitoring();
  }

  async addLLMConnection(sessionId, ws, metadata = {}) {
    // Validate connection limits
    if (this.llmConnections.size >= this.maxConnections) {
      ws.close(1013, 'Server overloaded');
      return false;
    }

    const connection = {
      id: sessionId,
      socket: ws,
      metadata,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      context: [],
      state: 'active',
      authenticated: false,
      apiKey: null,
    };

    this.llmConnections.set(sessionId, connection);

    // Setup connection handlers
    ws.on('message', data => this.handleLLMMessage(sessionId, data));
    ws.on('close', () => this.removeLLMConnection(sessionId));
    ws.on('error', error => this.handleConnectionError(sessionId, error));
    ws.on('pong', () => this.handlePong(sessionId));

    // Start heartbeat for this connection
    this.startHeartbeat(sessionId);

    this.emit('llm_connected', sessionId, connection);
    console.log(`LLM client connected: ${sessionId}`);
    return true;
  }

  removeLLMConnection(sessionId) {
    const connection = this.llmConnections.get(sessionId);
    if (connection) {
      // Clear heartbeat timer
      if (this.heartbeatTimers.has(sessionId)) {
        clearInterval(this.heartbeatTimers.get(sessionId));
        this.heartbeatTimers.delete(sessionId);
      }

      this.llmConnections.delete(sessionId);
      this.emit('llm_disconnected', sessionId, connection);
      console.log(`LLM client disconnected: ${sessionId}`);
    }
  }

  handleLLMMessage(sessionId, data) {
    const connection = this.llmConnections.get(sessionId);
    if (!connection) return;

    try {
      // Update activity
      connection.lastActivity = Date.now();
      connection.messageCount++;

      // Parse message
      const message = JSON.parse(data.toString());

      // Handle authentication
      if (message.type === 'auth') {
        this.handleAuthentication(sessionId, message);
        return;
      }

      // Only process authenticated connections
      if (!connection.authenticated) {
        connection.socket.close(1008, 'Authentication required');
        return;
      }

      // Emit message for processing
      this.emit('llm_message', sessionId, message, connection);
    } catch (error) {
      console.error(`Error handling message from ${sessionId}:`, error);
      this.sendError(sessionId, 'Invalid message format');
    }
  }

  handleAuthentication(sessionId, message) {
    const connection = this.llmConnections.get(sessionId);
    if (!connection) return;

    const { apiKey, token } = message;

    // Simple API key validation (in production, use proper JWT)
    if (this.validateApiKey(apiKey)) {
      connection.authenticated = true;
      connection.apiKey = apiKey;
      connection.metadata.authenticatedAt = Date.now();

      this.sendToLLM(sessionId, {
        type: 'auth_success',
        sessionId,
        timestamp: Date.now(),
      });

      this.emit('llm_authenticated', sessionId, connection);
      console.log(`LLM client authenticated: ${sessionId}`);
    } else {
      connection.socket.close(1008, 'Invalid API key');
    }
  }

  validateApiKey(apiKey) {
    // In production, implement proper JWT validation
    if (!apiKey) return false;

    // For development, accept any non-empty key
    // TODO: Implement proper JWT validation
    return apiKey.length > 10;
  }

  sendToLLM(sessionId, message) {
    const connection = this.llmConnections.get(sessionId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      connection.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Error sending message to ${sessionId}:`, error);
      return false;
    }
  }

  sendError(sessionId, error) {
    this.sendToLLM(sessionId, {
      type: 'error',
      error,
      timestamp: Date.now(),
    });
  }

  startHeartbeat(sessionId) {
    const timer = setInterval(() => {
      const connection = this.llmConnections.get(sessionId);
      if (!connection) {
        clearInterval(timer);
        return;
      }

      // Check if connection is still alive
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.ping();
      } else {
        this.removeLLMConnection(sessionId);
        clearInterval(timer);
      }
    }, this.heartbeatInterval);

    this.heartbeatTimers.set(sessionId, timer);
  }

  handlePong(sessionId) {
    const connection = this.llmConnections.get(sessionId);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  handleConnectionError(sessionId, error) {
    console.error(`Connection error for ${sessionId}:`, error);
    this.removeLLMConnection(sessionId);
  }

  startHeartbeatMonitoring() {
    // Clean up inactive connections every minute
    setInterval(() => {
      const now = Date.now();
      for (const [sessionId, connection] of this.llmConnections) {
        if (now - connection.lastActivity > this.connectionTimeout) {
          console.log(`Removing inactive connection: ${sessionId}`);
          connection.socket.close(1000, 'Connection timeout');
          this.removeLLMConnection(sessionId);
        }
      }
    }, 60000); // Check every minute
  }

  // MCP Server connection management
  async addMCPConnection(serverId, serverInfo) {
    const connection = {
      id: serverId,
      ...serverInfo,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      status: 'connected',
    };

    this.mcpConnections.set(serverId, connection);
    this.emit('mcp_connected', serverId, connection);
    console.log(`MCP server connected: ${serverId}`);
    return connection;
  }

  removeMCPConnection(serverId) {
    const connection = this.mcpConnections.get(serverId);
    if (connection) {
      this.mcpConnections.delete(serverId);
      this.emit('mcp_disconnected', serverId, connection);
      console.log(`MCP server disconnected: ${serverId}`);
    }
  }

  // Connection pooling for MCP servers
  async getOrCreatePool(serverType, options = {}) {
    if (this.connectionPools.has(serverType)) {
      return this.connectionPools.get(serverType);
    }

    const pool = {
      type: serverType,
      connections: [],
      maxConnections: options.maxConnections || 10,
      minConnections: options.minConnections || 2,
      created: Date.now(),
    };

    this.connectionPools.set(serverType, pool);
    return pool;
  }

  // Statistics and monitoring
  getStats() {
    return {
      llmConnections: {
        total: this.llmConnections.size,
        authenticated: Array.from(this.llmConnections.values()).filter(c => c.authenticated).length,
        active: Array.from(this.llmConnections.values()).filter(c => c.state === 'active').length,
      },
      mcpConnections: {
        total: this.mcpConnections.size,
        connected: Array.from(this.mcpConnections.values()).filter(c => c.status === 'connected')
          .length,
      },
      connectionPools: {
        total: this.connectionPools.size,
        details: Array.from(this.connectionPools.entries()).map(([type, pool]) => ({
          type,
          connections: pool.connections.length,
          maxConnections: pool.maxConnections,
        })),
      },
    };
  }

  getConnection(sessionId) {
    return this.llmConnections.get(sessionId);
  }

  getMCPConnection(serverId) {
    return this.mcpConnections.get(serverId);
  }

  broadcastToLLM(message, filter = null) {
    let sent = 0;
    for (const [sessionId, connection] of this.llmConnections) {
      if (connection.authenticated && connection.socket.readyState === WebSocket.OPEN) {
        if (!filter || filter(connection)) {
          this.sendToLLM(sessionId, message);
          sent++;
        }
      }
    }
    return sent;
  }

  // Graceful shutdown
  async shutdown() {
    console.log('Shutting down ConnectionManager...');

    // Clear all heartbeat timers
    for (const timer of this.heartbeatTimers.values()) {
      clearInterval(timer);
    }
    this.heartbeatTimers.clear();

    // Close all LLM connections
    for (const [sessionId, connection] of this.llmConnections) {
      connection.socket.close(1001, 'Server shutdown');
    }
    this.llmConnections.clear();

    // Close MCP connections
    this.mcpConnections.clear();
    this.connectionPools.clear();

    console.log('ConnectionManager shutdown complete');
  }
}

export default ConnectionManager;
