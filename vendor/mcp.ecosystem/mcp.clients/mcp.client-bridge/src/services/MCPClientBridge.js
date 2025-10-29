// mcp.ecosystem/mcp.clients/mcp.client-bridge/src/services/MCPClientBridge.js
const axios = require("axios");
const NodeCache = require("node-cache");
const logger = require("../utils/logger");
const config = require("../config/config");
const PersistentStorage = require("../models/PersistentStorage");
const ServerDiscoveryService = require("./ServerDiscoveryService");
const TodoEnforcementService = require("./TodoEnforcementService");

class MCPClientBridge {
  constructor(storagePath) {
    this.connectionPool = new Map(); // Store active connections to different MCP servers
    this.requestCache = new NodeCache({
      stdTTL: config.cache.ttl,
      checkperiod: config.cache.ttl * 0.2,
      maxKeys: config.cache.maxKeys,
    });
    this.serverCapabilities = new Map(); // Cache server capabilities
    this.activeRequests = new Map(); // Track active requests for rate limiting
    this.storage = new PersistentStorage(storagePath);
    this.discoveryService = new ServerDiscoveryService();
    this.todoService = new TodoEnforcementService();
  }

  /**
   * Initialize the MCP client bridge
   */
  async initialize() {
    logger.info("Initializing MCP Client Bridge...");
    // Initialize persistent storage
    await this.storage.initialize();

    // Initialize server discovery service
    await this.discoveryService.loadServerIndex();

    // Update agent state
    await this.storage.updateAgentState({
      lastStartup: new Date().toISOString(),
      status: "running",
    });

    // Load configuration and initialize connections if needed
    await this.loadServerConfigurations();
    logger.info("MCP Client Bridge initialized successfully");
  }

  /**
   * Load server configurations from persistent storage
   */
  async loadServerConfigurations() {
    // This would load from the persistent storage
    // For now, we'll implement this in the next step when we set up storage
    logger.info("Loading MCP server configurations...");
  }

  /**
   * Establish a connection to an MCP server
   */
  async connectToServer(serverId, serverConfig) {
    const existingConnection = this.connectionPool.get(serverId);

    if (existingConnection) {
      logger.debug(`Reusing existing connection to server: ${serverId}`);
      return existingConnection;
    }

    try {
      // Create a new axios instance for this server with specific configuration
      const serverConnection = axios.create({
        baseURL: serverConfig.url,
        timeout: serverConfig.timeout || config.mcp.defaultTimeout,
        headers: {
          "Content-Type": "application/json",
          ...serverConfig.headers,
        },
      });

      // Add request/response interceptors for this connection
      serverConnection.interceptors.request.use(
        (config) => {
          logger.debug(`Making request to server: ${serverId}`, {
            url: config.url,
            method: config.method,
          });
          return config;
        },
        (error) => {
          logger.error(`Request error for server ${serverId}:`, error);
          return Promise.reject(error);
        },
      );

      serverConnection.interceptors.response.use(
        (response) => {
          logger.debug(`Response from server ${serverId}:`, {
            status: response.status,
            url: response.config.url,
          });
          return response;
        },
        (error) => {
          logger.error(`Response error from server ${serverId}:`, error);
          return Promise.reject(error);
        },
      );

      // Store the connection in the pool
      this.connectionPool.set(serverId, serverConnection);

      // Cache server capabilities if available
      if (serverConfig.capabilities) {
        this.serverCapabilities.set(serverId, serverConfig.capabilities);
      } else {
        // Fetch capabilities from the server
        await this.fetchServerCapabilities(serverId, serverConnection);
      }

      logger.info(`Connected to MCP server: ${serverId}`);
      return serverConnection;
    } catch (error) {
      logger.error(`Failed to connect to MCP server ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch server capabilities from the MCP server
   */
  async fetchServerCapabilities(serverId, connection) {
    try {
      const response = await connection.get("/capabilities"); // Assuming standard endpoint
      this.serverCapabilities.set(serverId, response.data);
      logger.info(`Fetched capabilities for server: ${serverId}`);
      return response.data;
    } catch (error) {
      logger.warn(
        `Could not fetch capabilities for server ${serverId}:`,
        error.message,
      );
      return null;
    }
  }

  /**
   * Parse natural language request and determine appropriate tool call
   */
  async parseRequest(naturalLanguageRequest) {
    logger.info("Parsing natural language request:", naturalLanguageRequest);

    // Use the discovery service to find matching tools
    const matchingTools = await this.discoveryService.findToolsForQuery(
      naturalLanguageRequest,
    );

    if (matchingTools.length === 0) {
      // Fallback to simple intent detection
      const intent = this.determineIntent(naturalLanguageRequest);
      const targetServer = await this.findTargetServer(intent);

      if (!targetServer) {
        throw new Error(
          `No suitable MCP server found for request: ${naturalLanguageRequest}`,
        );
      }

      const toolCall = await this.formatToolCall(
        intent,
        naturalLanguageRequest,
        targetServer,
      );

      return {
        serverId: targetServer.id,
        toolCall,
        intent,
        discoveryResults: [],
      };
    }

    // For now, just pick the first matching server and tool
    const bestMatch = matchingTools[0];
    const targetTool = bestMatch.matchingTools[0];

    // Format the tool call based on the target server's API specification
    const toolCall = await this.formatToolCall(
      targetTool.name,
      naturalLanguageRequest,
      {
        id: bestMatch.serverId,
        name: bestMatch.serverName,
      },
    );

    return {
      serverId: bestMatch.serverId,
      toolCall,
      intent: targetTool.name,
      discoveryResults: matchingTools,
    };
  }

  /**
   * Determine the intent from a natural language request
   */
  determineIntent(naturalLanguageRequest) {
    // Simplified intent detection - in reality, this would be more sophisticated
    const lowerRequest = naturalLanguageRequest.toLowerCase();

    if (lowerRequest.includes("git") || lowerRequest.includes("repository")) {
      return "git_operations";
    } else if (
      lowerRequest.includes("file") ||
      lowerRequest.includes("read") ||
      lowerRequest.includes("write")
    ) {
      return "file_operations";
    } else if (
      lowerRequest.includes("search") ||
      lowerRequest.includes("find")
    ) {
      return "search_operations";
    } else {
      return "general";
    }
  }

  /**
   * Find the appropriate target server for the given intent
   */
  async findTargetServer(intent) {
    // This would typically query the server capabilities to find the best match
    // For now, we'll return the first server that supports the intent
    for (const [serverId, capabilities] of this.serverCapabilities) {
      if (this.intentSupportedByServer(intent, capabilities)) {
        const serverConfig = await this.getServerConfig(serverId);
        return { id: serverId, ...serverConfig };
      }
    }

    // If no specific server found, return the default server
    return await this.getDefaultServer();
  }

  /**
   * Check if a server supports a specific intent
   */
  intentSupportedByServer(intent, capabilities) {
    // Simplified check - in reality, this would be more sophisticated
    if (!capabilities || !capabilities.tools) {
      return false;
    }

    // Check if any tool in the server's capabilities matches the intent
    return capabilities.tools.some((tool) =>
      tool.name.toLowerCase().includes(intent.replace("_", "")),
    );
  }

  /**
   * Get server configuration by ID
   */
  async getServerConfig(serverId) {
    // This would fetch from persistent storage in a real implementation
    // For now, return a mock config
    return {
      id: serverId,
      url: `http://localhost:8080/${serverId}`,
      timeout: config.mcp.defaultTimeout,
      headers: {},
    };
  }

  /**
   * Get the default server configuration
   */
  async getDefaultServer() {
    // This would fetch from persistent storage in a real implementation
    // For now, return a mock config
    return {
      id: "default",
      url: "http://localhost:8080/default",
      timeout: config.mcp.defaultTimeout,
      headers: {},
    };
  }

  /**
   * Format the tool call according to the target server's API specification
   */
  async formatToolCall(intent, naturalLanguageRequest, targetServer) {
    // This would format the tool call based on the specific server's API
    // For now, we'll return a generic tool call structure
    return {
      tool_name: intent,
      parameters: {
        request: naturalLanguageRequest,
      },
    };
  }

  /**
   * Execute a tool call on the specified server
   */
  async executeToolCall(serverId, toolCall) {
    const cacheKey = this.generateCacheKey(serverId, toolCall);

    // Check if result is cached
    const cachedResult = this.requestCache.get(cacheKey);
    if (cachedResult) {
      logger.info(`Returning cached result for: ${cacheKey}`);
      // Update cache stats
      await this.storage.updateCacheStats({ hit: true });
      return cachedResult;
    }
    // Update cache stats for miss
    await this.storage.updateCacheStats({ hit: false });

    // Get or create connection to the server
    const serverConnection = await this.connectToServer(
      serverId,
      await this.getServerConfig(serverId),
    );

    try {
      // Track the active request for rate limiting
      this.trackActiveRequest(serverId);

      // Execute the tool call with retry logic
      const result = await this.executeWithRetry(
        serverConnection,
        toolCall,
        serverId,
      );

      // Cache the result if appropriate
      if (this.shouldCacheResult(toolCall, result)) {
        this.requestCache.set(cacheKey, result);
      }

      logger.info(`Tool call executed successfully on server ${serverId}`);
      return result;
    } catch (error) {
      logger.error(`Tool call failed on server ${serverId}:`, error);
      throw error;
    } finally {
      this.untrackActiveRequest(serverId);
    }
  }

  /**
   * Execute tool call with retry logic
   */
  async executeWithRetry(connection, toolCall, serverId) {
    let lastError;

    for (let attempt = 0; attempt <= config.mcp.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          logger.info(
            `Retrying tool call on server ${serverId}, attempt ${attempt}/${config.mcp.maxRetries}`,
          );
          await this.delay(config.mcp.retryDelay * attempt); // Exponential backoff
        }

        const response = await connection.post("/execute", toolCall);
        return response.data;
      } catch (error) {
        lastError = error;

        // If this was the last attempt, throw the error
        if (attempt === config.mcp.maxRetries) {
          break;
        }

        logger.warn(
          `Tool call attempt ${attempt + 1} failed on server ${serverId}:`,
          error.message,
        );
      }
    }

    throw lastError;
  }

  /**
   * Track an active request for rate limiting
   */
  trackActiveRequest(serverId) {
    const currentCount = this.activeRequests.get(serverId) || 0;
    this.activeRequests.set(serverId, currentCount + 1);
  }

  /**
   * Untrack an active request
   */
  untrackActiveRequest(serverId) {
    const currentCount = this.activeRequests.get(serverId) || 0;
    if (currentCount <= 1) {
      this.activeRequests.delete(serverId);
    } else {
      this.activeRequests.set(serverId, currentCount - 1);
    }
  }

  /**
   * Generate a cache key for a tool call
   */
  generateCacheKey(serverId, toolCall) {
    const paramsStr = JSON.stringify(toolCall.parameters || {});
    return `${serverId}:${toolCall.tool_name}:${paramsStr}`;
  }

  /**
   * Determine if the result should be cached
   */
  shouldCacheResult(toolCall, result) {
    // Don't cache results for operations that modify state
    const nonIdempotentTools = ["write_file", "edit", "run_shell_command"];
    return !nonIdempotentTools.includes(toolCall.tool_name);
  }

  /**
   * Process a natural language request through the bridge
   */
  async processRequest(naturalLanguageRequest) {
    const startTime = Date.now();
    const operation = "process-request";

    try {
      logger.info(
        "Processing natural language request:",
        naturalLanguageRequest,
      );

      // Validate todos before processing
      await this.todoService.validateTodosForOperation(operation, {
        request: naturalLanguageRequest,
      });

      // Parse the request to determine intent and target server
      const { serverId, toolCall, intent, discoveryResults } =
        await this.parseRequest(naturalLanguageRequest);

      // Execute the tool call on the target server
      const result = await this.executeToolCall(serverId, toolCall);

      // Calculate response time
      const responseTime = Date.now() - startTime;

      logger.info(
        `Request processed successfully, intent: ${intent}, server: ${serverId}`,
      );

      // Record the request in metrics
      await this.storage.recordRequest(naturalLanguageRequest, {
        success: true,
        serverId,
        intent,
        responseTime,
      });

      // Update server stats
      await this.storage.updateServerStats(serverId, {
        successful: true,
        responseTime,
      });

      // Update todo status on success
      await this.todoService.updateTodoStatus(operation, {
        success: true,
        serverId,
        intent,
        responseTime,
      });

      return {
        success: true,
        result,
        serverId,
        intent,
        discoveryResults,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error("Error processing request:", error);

      // Record the failed request in metrics
      await this.storage.recordRequest(naturalLanguageRequest, {
        success: false,
        error: error.message,
        responseTime,
      });

      // Update todo status on failure
      await this.todoService.updateTodoStatus(operation, {
        success: false,
        error: error.message,
        responseTime,
      });

      return {
        success: false,
        error: error.message,
        details: error.stack,
        responseTime,
      };
    }
  }

  /**
   * Get statistics about the bridge
   */
  async getStats() {
    return {
      connectionPoolSize: this.connectionPool.size,
      cachedRequests: this.requestCache.getStats(),
      activeRequests: Object.fromEntries(this.activeRequests),
      serverCapabilities: Array.from(this.serverCapabilities.keys()),
      metrics: await this.getMetrics(),
      cacheStats: await this.getCacheStats(),
      discoveryStats: await this.discoveryService.getIndexMetadata(),
    };
  }

  /**
   * Get metrics from persistent storage
   */
  async getMetrics() {
    return this.storage.getMetrics();
  }

  /**
   * Get cache statistics from persistent storage
   */
  async getCacheStats() {
    return this.storage.getCacheStats();
  }

  /**
   * Get all available servers
   */
  async getAllServers() {
    return await this.discoveryService.getAllServers();
  }

  /**
   * Search for servers by category
   */
  async getServersByCategory(category) {
    return await this.discoveryService.getServersByCategory(category);
  }

  /**
   * Search for servers by keyword
   */
  async searchServers(keyword) {
    return await this.discoveryService.searchServers(keyword);
  }

  /**
   * Find tools that match a natural language query
   */
  async findToolsForQuery(query) {
    return await this.discoveryService.findToolsForQuery(query);
  }

  /**
   * Get all tools from all servers
   */
  async getAllTools() {
    return await this.discoveryService.getAllTools();
  }

  /**
   * Helper function for delay (used in retry logic)
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = MCPClientBridge;
