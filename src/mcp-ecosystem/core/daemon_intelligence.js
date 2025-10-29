import EventEmitter from 'events';
import ProtocolTranslator from './protocol_translator.js';
import IntelligentRouter from './intelligent_router.js';
import AdvancedCache from './advanced_cache.js';
import ContextManager from './context_manager.js';
import ConnectionManager from './connection_manager.js';
import SessionStore from './session_store.js';

/**
 * Daemon Intelligence - Integrated intelligence layer for MCP daemon
 *
 * This component orchestrates all intelligence layer components:
 * - Coordinates Protocol Translator, Intelligent Router, Advanced Cache, and Context Manager
 * - Provides unified API for daemon operations
 * - Optimizes performance through intelligent component interaction
 * - Monitors and manages overall system health
 */
class DaemonIntelligence extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration
    this.config = {
      maxContextTokens: options.maxContextTokens || 8000,
      cacheSize: options.cacheSize || 1000,
      routingStrategy: options.routingStrategy || 'health_based',
      compressionStrategy: options.compressionStrategy || 'hybrid',
      enableMetrics: options.enableMetrics !== false,
      enableOptimization: options.enableOptimization !== false,
      ...options,
    };

    // Initialize components
    this.protocolTranslator = new ProtocolTranslator({
      maxCacheSize: this.config.cacheSize,
      maxContextTokens: this.config.maxContextTokens,
    });

    this.intelligentRouter = new IntelligentRouter({
      strategy: this.config.routingStrategy,
    });

    this.advancedCache = new AdvancedCache({
      memoryCacheSize: this.config.cacheSize,
      enableCompression: true,
      enablePersistence: true,
    });

    this.contextManager = new ContextManager({
      maxContextTokens: this.config.maxContextTokens,
      strategy: this.config.compressionStrategy,
    });

    // Connection and session management (from Phase 1)
    this.connectionManager = new ConnectionManager();
    this.sessionStore = new SessionStore();

    // Performance optimization
    this.optimization = {
      enabled: this.config.enableOptimization,
      metrics: {
        totalRequests: 0,
        avgResponseTime: 0,
        cacheHitRate: 0,
        contextReduction: 0,
        errorRate: 0,
      },
      lastOptimization: Date.now(),
      optimizationInterval: 300000, // 5 minutes
    };

    this.init();
  }

  async init() {
    try {
      // Set up component event listeners
      this.setupEventListeners();

      // Register default servers with router
      await this.registerDefaultServers();

      // Start optimization loop
      if (this.optimization.enabled) {
        this.startOptimizationLoop();
      }

      console.log('DaemonIntelligence initialized successfully');
      console.log(`  Routing strategy: ${this.config.routingStrategy}`);
      console.log(`  Compression strategy: ${this.config.compressionStrategy}`);
      console.log(`  Cache size: ${this.config.cacheSize}`);
      console.log(`  Max context tokens: ${this.config.maxContextTokens}`);
    } catch (error) {
      console.error('Failed to initialize DaemonIntelligence:', error);
    }
  }

  /**
   * Main request processing pipeline
   */
  async processRequest(sessionId, request) {
    const startTime = Date.now();
    this.optimization.metrics.totalRequests++;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(sessionId, request);
      let cachedResponse = await this.advancedCache.get(cacheKey);

      if (cachedResponse) {
        this.emit('cache_hit', { sessionId, cacheKey });
        return cachedResponse;
      }

      // Get relevant context
      const context = await this.contextManager.getRelevantContext(
        sessionId,
        request.content || request.query || '',
        { maxTokens: this.config.maxContextTokens * 0.6 }
      );

      // Translate LLM request to MCP tools
      const toolCalls = await this.protocolTranslator.translateToMCP(
        request.content || request.query,
        sessionId,
        { context, ...request.metadata }
      );

      // Route and execute tool calls
      const results = [];
      for (const toolCall of toolCalls) {
        try {
          const result = await this.intelligentRouter.routeRequest({
            type: toolCall.toolName,
            sessionId,
            arguments: toolCall.arguments,
            metadata: toolCall.metadata,
          });

          results.push({
            toolCall: toolCall.toolName,
            success: true,
            result,
          });
        } catch (error) {
          results.push({
            toolCall: toolCall.toolName,
            success: false,
            error: error.message,
          });

          this.optimization.metrics.errorRate++;
        }
      }

      // Translate MCP responses back to LLM format
      const response = await this.protocolTranslator.translateToLLM(
        {
          results,
          sessionId,
          timestamp: Date.now(),
        },
        sessionId,
        request
      );

      // Add context for future requests
      await this.contextManager.addContext(sessionId, request.content || request.query, {
        type: 'user_input',
        toolCalls: toolCalls.map(t => t.toolName),
        results: results.filter(r => r.success).length,
      });

      // Cache the response
      await this.advancedCache.set(cacheKey, response, {
        ttl: 300000, // 5 minutes
        priority: 'normal',
      });

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime, true);

      this.emit('request_processed', {
        sessionId,
        responseTime,
        toolCalls: toolCalls.length,
        successfulResults: results.filter(r => r.success).length,
      });

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime, false);
      this.optimization.metrics.errorRate++;

      this.emit('request_error', { sessionId, error, responseTime });
      throw error;
    }
  }

  /**
   * WebSocket message handling
   */
  async handleWebSocketMessage(sessionId, message) {
    try {
      switch (message.type) {
        case 'request':
          return await this.processRequest(sessionId, message);

        case 'context_query':
          return await this.contextManager.getRelevantContext(
            sessionId,
            message.query,
            message.options
          );

        case 'cache_get':
          return await this.advancedCache.get(message.key);

        case 'cache_set':
          return await this.advancedCache.set(message.key, message.value, message.options);

        case 'server_status':
          return this.intelligentRouter.getAllServerStatus();

        case 'metrics':
          return this.getUnifiedMetrics();

        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.emit('websocket_error', { sessionId, error, message });
      throw error;
    }
  }

  /**
   * Component coordination
   */
  setupEventListeners() {
    // Protocol Translator events
    this.protocolTranslator.on('translation_completed', data => {
      this.emit('translation_completed', data);
    });

    this.protocolTranslator.on('cache_hit', data => {
      this.optimization.metrics.cacheHitRate++;
    });

    // Intelligent Router events
    this.intelligentRouter.on('request_completed', data => {
      this.emit('routing_completed', data);
    });

    this.intelligentRouter.on('server_registered', data => {
      this.emit('server_registered', data);
    });

    // Advanced Cache events
    this.advancedCache.on('cache_set', data => {
      this.emit('cache_updated', data);
    });

    this.advancedCache.on('cache_cleared', data => {
      this.emit('cache_cleared', data);
    });

    // Context Manager events
    this.contextManager.on('context_compressed', data => {
      this.optimization.metrics.contextReduction = data.compressionRatio;
      this.emit('context_compressed', data);
    });

    // Connection Manager events
    this.connectionManager.on('llm_connected', data => {
      this.emit('client_connected', data);
    });

    this.connectionManager.on('llm_disconnected', data => {
      this.emit('client_disconnected', data);
    });
  }

  /**
   * Server registration
   */
  async registerDefaultServers() {
    const defaultServers = [
      {
        id: 'mem0',
        group: 'memory',
        capabilities: ['search', 'add', 'update'],
        weight: 1.0,
        maxConnections: 50,
      },
      {
        id: 'notion',
        group: 'productivity',
        capabilities: ['search', 'create', 'update'],
        weight: 0.9,
        maxConnections: 30,
      },
      {
        id: 'browsertools',
        group: 'automation',
        capabilities: ['navigate', 'screenshot'],
        weight: 0.8,
        maxConnections: 20,
      },
      {
        id: 'google_suite',
        group: 'communication',
        capabilities: ['email', 'files', 'docs'],
        weight: 0.9,
        maxConnections: 40,
      },
      {
        id: 'task',
        group: 'productivity',
        capabilities: ['create', 'list', 'update'],
        weight: 1.0,
        maxConnections: 60,
      },
    ];

    for (const server of defaultServers) {
      await this.intelligentRouter.registerServer(server.id, server);
    }

    console.log(`Registered ${defaultServers.length} default servers`);
  }

  /**
   * Performance optimization
   */
  startOptimizationLoop() {
    setInterval(async () => {
      await this.performOptimization();
    }, this.optimization.optimizationInterval);
  }

  async performOptimization() {
    try {
      const now = Date.now();

      // Get component metrics
      const translatorMetrics = this.protocolTranslator.getMetrics();
      const routerMetrics = this.intelligentRouter.getMetrics();
      const cacheMetrics = this.advancedCache.getStats();
      const contextMetrics = this.contextManager.getAllStats();

      // Analyze performance and adjust configurations
      await this.optimizeBasedOnMetrics({
        translator: translatorMetrics,
        router: routerMetrics,
        cache: cacheMetrics,
        context: contextMetrics,
      });

      this.optimization.lastOptimization = now;
      this.emit('optimization_completed', { timestamp: now });
    } catch (error) {
      console.error('Optimization failed:', error);
    }
  }

  async optimizeBasedOnMetrics(metrics) {
    // Optimize cache based on hit rate
    if (metrics.cache.metrics.hitRate < 0.5) {
      // Increase cache size if hit rate is low
      const newSize = Math.min(this.config.cacheSize * 1.2, 2000);
      console.log(`Increasing cache size to ${newSize} due to low hit rate`);
      // Note: In production, this would dynamically resize cache
    }

    // Optimize routing based on success rate
    if (metrics.router.successRate < 0.9) {
      // Switch to more conservative routing strategy
      if (this.config.routingStrategy !== 'least_connections') {
        console.log('Switching to least_connections routing due to low success rate');
        this.intelligentRouter.setRoutingStrategy('least_connections');
      }
    }

    // Optimize context based on compression ratio
    if (metrics.context.avgCompressionRatio > 0.8) {
      // Context is not compressing well, adjust strategy
      if (this.config.compressionStrategy !== 'importance') {
        console.log('Switching to importance-based compression for better results');
        this.contextManager.setCompressionStrategy('importance');
      }
    }

    // Clean up expired data
    await this.performCleanup();
  }

  async performCleanup() {
    // Clean up old sessions
    const sessions = await this.sessionStore.getStats();
    if (sessions.totalSessions > 1000) {
      console.log('Performing session cleanup...');
      // SessionStore has its own cleanup, but we could trigger additional cleanup here
    }

    // Clean up old cache entries
    const cacheStats = this.advancedCache.getStats();
    if (cacheStats.tiers.l2.utilization > 0.9) {
      console.log('Cache utilization high, triggering cleanup...');
      await this.advancedCache.cleanupExpiredEntries();
    }
  }

  /**
   * Utility methods
   */
  generateCacheKey(sessionId, request) {
    const keyData = {
      sessionId,
      type: request.type || 'request',
      content: request.content || request.query || '',
      timestamp: Math.floor(Date.now() / 60000), // 1-minute buckets
    };

    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  updateMetrics(responseTime, success) {
    const metrics = this.optimization.metrics;

    // Update average response time
    metrics.avgResponseTime =
      (metrics.avgResponseTime * (metrics.totalRequests - 1) + responseTime) /
      metrics.totalRequests;

    // Update error rate
    if (!success) {
      metrics.errorRate = (metrics.errorRate + 1) / metrics.totalRequests;
    }
  }

  /**
   * Public API methods
   */
  getUnifiedMetrics() {
    return {
      optimization: { ...this.optimization.metrics },
      translator: this.protocolTranslator.getMetrics(),
      router: this.intelligentRouter.getMetrics(),
      cache: this.advancedCache.getStats(),
      context: this.contextManager.getAllStats(),
      connections: this.connectionManager.getStats(),
      sessions: this.sessionStore.getStats(),
    };
  }

  async getHealthStatus() {
    const metrics = this.getUnifiedMetrics();

    return {
      status: 'healthy',
      timestamp: Date.now(),
      components: {
        translator: {
          status: metrics.translator.errors < 10 ? 'healthy' : 'degraded',
          metrics: metrics.translator,
        },
        router: {
          status: metrics.router.successRate > 0.9 ? 'healthy' : 'degraded',
          metrics: metrics.router,
        },
        cache: {
          status: metrics.cache.metrics.hitRate > 0.3 ? 'healthy' : 'degraded',
          metrics: metrics.cache,
        },
        context: {
          status: 'healthy',
          metrics: metrics.context,
        },
      },
      overall: {
        avgResponseTime: metrics.optimization.avgResponseTime,
        cacheHitRate: metrics.cache.metrics.hitRate,
        errorRate: metrics.optimization.errorRate,
        contextReduction: metrics.optimization.contextReduction,
      },
    };
  }

  async updateConfiguration(newConfig) {
    // Update configuration
    Object.assign(this.config, newConfig);

    // Apply configuration changes to components
    if (newConfig.routingStrategy) {
      this.intelligentRouter.setRoutingStrategy(newConfig.routingStrategy);
    }

    if (newConfig.compressionStrategy) {
      this.contextManager.setCompressionStrategy(newConfig.compressionStrategy);
    }

    if (newConfig.cacheSize) {
      // Note: Dynamic cache resizing would require cache implementation support
      console.log(`Cache size updated to ${newConfig.cacheSize}`);
    }

    this.emit('configuration_updated', newConfig);
  }

  async shutdown() {
    console.log('Shutting down DaemonIntelligence...');

    try {
      // Shutdown all components
      await this.protocolTranslator.shutdown();
      await this.intelligentRouter.shutdown();
      await this.advancedCache.shutdown();
      await this.contextManager.shutdown();
      await this.connectionManager.shutdown();
      await this.sessionStore.shutdown();

      console.log('DaemonIntelligence shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }
}

export default DaemonIntelligence;
