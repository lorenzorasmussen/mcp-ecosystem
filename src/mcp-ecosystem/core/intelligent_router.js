import EventEmitter from 'events';
import crypto from 'crypto';

/**
 * Intelligent Router - Smart server selection and load balancing
 *
 * This component provides intelligent routing of MCP requests to optimal servers:
 * - Load balancing across multiple server instances
 * - Health monitoring and failover
 * - Performance-based server selection
 * - Request queuing and prioritization
 * - Circuit breaker pattern for fault tolerance
 */
class IntelligentRouter extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration
    this.maxRetries = options.maxRetries || 3;
    this.circuitBreakerThreshold = options.circuitBreakerThreshold || 5;
    this.circuitBreakerTimeout = options.circuitBreakerTimeout || 60000; // 1 minute
    this.healthCheckInterval = options.healthCheckInterval || 30000; // 30 seconds
    this.requestTimeout = options.requestTimeout || 10000; // 10 seconds

    // Server registry and state
    this.servers = new Map(); // serverId -> server info
    this.serverGroups = new Map(); // groupName -> [serverIds]
    this.serverHealth = new Map(); // serverId -> health status
    this.circuitBreakers = new Map(); // serverId -> circuit breaker state
    this.loadMetrics = new Map(); // serverId -> load metrics

    // Request management
    this.pendingRequests = new Map(); // requestId -> request info
    this.requestQueue = []; // prioritized request queue
    this.activeRequests = new Map(); // serverId -> active request count

    // Performance tracking
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
      serverUtilization: new Map(),
    };

    // Load balancing strategies
    this.strategies = {
      round_robin: this.roundRobinStrategy.bind(this),
      least_connections: this.leastConnectionsStrategy.bind(this),
      weighted_response_time: this.weightedResponseTimeStrategy.bind(this),
      health_based: this.healthBasedStrategy.bind(this),
    };

    this.currentStrategy = options.strategy || 'health_based';

    this.init();
  }

  async init() {
    // Start health monitoring
    this.startHealthMonitoring();

    // Initialize server groups
    await this.initializeServerGroups();

    console.log(`IntelligentRouter initialized with strategy: ${this.currentStrategy}`);
  }

  /**
   * Register a new server
   */
  async registerServer(serverId, serverInfo) {
    const server = {
      id: serverId,
      ...serverInfo,
      registeredAt: Date.now(),
      status: 'unknown',
      weight: serverInfo.weight || 1,
      maxConnections: serverInfo.maxConnections || 100,
      capabilities: serverInfo.capabilities || [],
    };

    this.servers.set(serverId, server);
    this.serverHealth.set(serverId, {
      status: 'unknown',
      lastCheck: Date.now(),
      consecutiveFailures: 0,
      responseTime: 0,
    });

    this.circuitBreakers.set(serverId, {
      state: 'closed', // closed, open, half_open
      failures: 0,
      lastFailure: 0,
    });

    this.loadMetrics.set(serverId, {
      activeRequests: 0,
      totalRequests: 0,
      successfulRequests: 0,
      avgResponseTime: 0,
      lastUsed: 0,
    });

    // Add to appropriate group
    const groupName = serverInfo.group || 'default';
    if (!this.serverGroups.has(groupName)) {
      this.serverGroups.set(groupName, []);
    }
    this.serverGroups.get(groupName).push(serverId);

    this.emit('server_registered', { serverId, server });
    console.log(`Server registered: ${serverId} (${groupName})`);

    // Perform initial health check
    await this.checkServerHealth(serverId);
  }

  /**
   * Route a request to the optimal server
   */
  async routeRequest(request) {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      this.metrics.totalRequests++;

      // Create request context
      const requestContext = {
        id: requestId,
        ...request,
        startTime,
        attempts: 0,
        maxRetries: this.maxRetries,
      };

      // Select optimal server
      const serverId = await this.selectOptimalServer(requestContext);

      if (!serverId) {
        throw new Error('No available servers for request');
      }

      // Check circuit breaker
      if (!this.isCircuitBreakerClosed(serverId)) {
        throw new Error(`Circuit breaker open for server: ${serverId}`);
      }

      // Execute request
      const result = await this.executeRequest(serverId, requestContext);

      // Update metrics
      this.updateMetrics(serverId, startTime, true);
      this.metrics.successfulRequests++;

      this.emit('request_completed', {
        requestId,
        serverId,
        success: true,
        responseTime: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      this.metrics.failedRequests++;

      // Retry logic
      if (requestContext.attempts < requestContext.maxRetries) {
        requestContext.attempts++;
        console.warn(
          `Request ${requestId} failed, retrying (${requestContext.attempts}/${requestContext.maxRetries})`
        );

        // Exponential backoff
        await this.delay(Math.pow(2, requestContext.attempts) * 1000);

        return this.routeRequest(requestContext);
      }

      this.emit('request_failed', {
        requestId,
        error: error.message,
        attempts: requestContext.attempts,
      });

      throw error;
    }
  }

  /**
   * Select the optimal server for a request
   */
  async selectOptimalServer(request) {
    const strategy = this.strategies[this.currentStrategy];
    if (!strategy) {
      throw new Error(`Unknown routing strategy: ${this.currentStrategy}`);
    }

    // Filter available servers
    const availableServers = this.getAvailableServers(request);

    if (availableServers.length === 0) {
      return null;
    }

    // Apply routing strategy
    const selectedServerId = await strategy(availableServers, request);

    return selectedServerId;
  }

  /**
   * Routing strategies
   */
  roundRobinStrategy(servers, request) {
    const serverIds = servers.map(s => s.id);
    const index = this.metrics.totalRequests % serverIds.length;
    return serverIds[index];
  }

  leastConnectionsStrategy(servers, request) {
    return servers.reduce((best, server) => {
      const bestLoad = this.loadMetrics.get(best.id)?.activeRequests || 0;
      const serverLoad = this.loadMetrics.get(server.id)?.activeRequests || 0;
      return serverLoad < bestLoad ? server : best;
    }).id;
  }

  weightedResponseTimeStrategy(servers, request) {
    const scored = servers.map(server => {
      const metrics = this.loadMetrics.get(server.id);
      const health = this.serverHealth.get(server.id);

      // Calculate score (lower is better)
      let score = metrics?.avgResponseTime || 1000;
      score *= server.weight || 1;

      // Penalize unhealthy servers
      if (health?.status !== 'healthy') {
        score *= 10;
      }

      return { serverId: server.id, score };
    });

    return scored.sort((a, b) => a.score - b.score)[0].serverId;
  }

  healthBasedStrategy(servers, request) {
    const healthyServers = servers.filter(server => {
      const health = this.serverHealth.get(server.id);
      return health?.status === 'healthy' && this.isCircuitBreakerClosed(server.id);
    });

    if (healthyServers.length === 0) {
      // Fallback to least loaded server
      return this.leastConnectionsStrategy(servers, request);
    }

    // Use weighted response time among healthy servers
    return this.weightedResponseTimeStrategy(healthyServers, request);
  }

  /**
   * Execute request on selected server
   */
  async executeRequest(serverId, requestContext) {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }

    // Update load metrics
    const metrics = this.loadMetrics.get(serverId);
    metrics.activeRequests++;
    metrics.totalRequests++;
    metrics.lastUsed = Date.now();

    this.pendingRequests.set(requestContext.id, {
      ...requestContext,
      serverId,
      startTime: Date.now(),
    });

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout);
      });

      // Execute request with timeout
      const result = await Promise.race([
        this.sendRequestToServer(server, requestContext),
        timeoutPromise,
      ]);

      // Update success metrics
      metrics.successfulRequests++;
      this.recordCircuitBreakerSuccess(serverId);

      return result;
    } catch (error) {
      // Update failure metrics
      this.recordCircuitBreakerFailure(serverId);
      throw error;
    } finally {
      // Clean up
      metrics.activeRequests--;
      this.pendingRequests.delete(requestContext.id);
    }
  }

  /**
   * Send request to server (abstract method)
   */
  async sendRequestToServer(server, requestContext) {
    // This would be implemented based on the actual server communication protocol
    // For now, simulate a request
    const delay = Math.random() * 1000 + 500; // 500-1500ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate occasional failures
    if (Math.random() < 0.05) {
      // 5% failure rate
      throw new Error('Simulated server failure');
    }

    return {
      serverId: server.id,
      requestId: requestContext.id,
      data: `Response from ${server.id} for ${requestContext.type}`,
      timestamp: Date.now(),
    };
  }

  /**
   * Health monitoring
   */
  async checkServerHealth(serverId) {
    const server = this.servers.get(serverId);
    if (!server) return;

    const startTime = Date.now();
    let isHealthy = false;
    let error = null;

    try {
      // Perform health check
      const response = await this.performHealthCheck(server);
      isHealthy = response.status === 'healthy';

      // Update response time
      const responseTime = Date.now() - startTime;
      const health = this.serverHealth.get(serverId);
      health.responseTime = responseTime;
      health.lastCheck = Date.now();

      if (isHealthy) {
        health.status = 'healthy';
        health.consecutiveFailures = 0;
      } else {
        health.status = 'unhealthy';
        health.consecutiveFailures++;
      }
    } catch (err) {
      error = err;
      const health = this.serverHealth.get(serverId);
      health.status = 'unhealthy';
      health.consecutiveFailures++;
      health.lastCheck = Date.now();
    }

    this.emit('health_check_completed', {
      serverId,
      healthy: isHealthy,
      error: error?.message,
      responseTime: Date.now() - startTime,
    });

    return isHealthy;
  }

  async performHealthCheck(server) {
    // Simulate health check - in production, this would ping the actual server
    const delay = Math.random() * 500 + 100; // 100-600ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate 90% success rate
    if (Math.random() < 0.9) {
      return { status: 'healthy', timestamp: Date.now() };
    } else {
      throw new Error('Health check failed');
    }
  }

  startHealthMonitoring() {
    setInterval(async () => {
      for (const serverId of this.servers.keys()) {
        await this.checkServerHealth(serverId);
      }
    }, this.healthCheckInterval);
  }

  /**
   * Circuit breaker management
   */
  isCircuitBreakerClosed(serverId) {
    const breaker = this.circuitBreakers.get(serverId);
    if (!breaker) return true;

    switch (breaker.state) {
      case 'closed':
        return true;

      case 'open':
        // Check if timeout has passed
        if (Date.now() - breaker.lastFailure > this.circuitBreakerTimeout) {
          breaker.state = 'half_open';
          return true;
        }
        return false;

      case 'half_open':
        return true;

      default:
        return true;
    }
  }

  recordCircuitBreakerSuccess(serverId) {
    const breaker = this.circuitBreakers.get(serverId);
    if (!breaker) return;

    if (breaker.state === 'half_open') {
      breaker.state = 'closed';
      breaker.failures = 0;
    }
  }

  recordCircuitBreakerFailure(serverId) {
    const breaker = this.circuitBreakers.get(serverId);
    if (!breaker) return;

    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= this.circuitBreakerThreshold) {
      breaker.state = 'open';
    }
  }

  /**
   * Utility methods
   */
  getAvailableServers(request) {
    const servers = [];

    for (const [serverId, server] of this.servers) {
      // Check if server supports the request type
      if (request.type && !this.serverSupportsRequest(server, request)) {
        continue;
      }

      // Check server capacity
      const metrics = this.loadMetrics.get(serverId);
      if (metrics.activeRequests >= server.maxConnections) {
        continue;
      }

      servers.push(server);
    }

    return servers;
  }

  serverSupportsRequest(server, request) {
    if (!server.capabilities || server.capabilities.length === 0) {
      return true; // No capabilities defined, assume supports all
    }

    return server.capabilities.includes(request.type);
  }

  updateMetrics(serverId, startTime, success) {
    const responseTime = Date.now() - startTime;
    const metrics = this.loadMetrics.get(serverId);

    if (metrics) {
      // Update average response time
      const totalRequests = metrics.totalRequests;
      metrics.avgResponseTime =
        (metrics.avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    }

    // Update global metrics
    this.metrics.totalResponseTime += responseTime;
    this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.totalRequests;
  }

  async initializeServerGroups() {
    // Initialize default groups
    this.serverGroups.set('memory', []);
    this.serverGroups.set('productivity', []);
    this.serverGroups.set('communication', []);
    this.serverGroups.set('automation', []);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Public API methods
   */
  getServerStatus(serverId) {
    const server = this.servers.get(serverId);
    const health = this.serverHealth.get(serverId);
    const metrics = this.loadMetrics.get(serverId);
    const breaker = this.circuitBreakers.get(serverId);

    if (!server) return null;

    return {
      server: {
        id: server.id,
        group: server.group,
        capabilities: server.capabilities,
        maxConnections: server.maxConnections,
      },
      health: {
        status: health?.status || 'unknown',
        lastCheck: health?.lastCheck,
        consecutiveFailures: health?.consecutiveFailures || 0,
        responseTime: health?.responseTime || 0,
      },
      metrics: {
        activeRequests: metrics?.activeRequests || 0,
        totalRequests: metrics?.totalRequests || 0,
        successfulRequests: metrics?.successfulRequests || 0,
        avgResponseTime: metrics?.avgResponseTime || 0,
        lastUsed: metrics?.lastUsed || 0,
      },
      circuitBreaker: {
        state: breaker?.state || 'closed',
        failures: breaker?.failures || 0,
        lastFailure: breaker?.lastFailure || 0,
      },
    };
  }

  getAllServerStatus() {
    const status = {};
    for (const serverId of this.servers.keys()) {
      status[serverId] = this.getServerStatus(serverId);
    }
    return status;
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate:
        this.metrics.totalRequests > 0
          ? this.metrics.successfulRequests / this.metrics.totalRequests
          : 0,
      activeServers: this.servers.size,
      healthyServers: Array.from(this.serverHealth.values()).filter(h => h.status === 'healthy')
        .length,
      circuitBreakersOpen: Array.from(this.circuitBreakers.values()).filter(
        cb => cb.state === 'open'
      ).length,
    };
  }

  setRoutingStrategy(strategy) {
    if (!this.strategies[strategy]) {
      throw new Error(`Unknown routing strategy: ${strategy}`);
    }

    this.currentStrategy = strategy;
    this.emit('strategy_changed', { strategy });
    console.log(`Routing strategy changed to: ${strategy}`);
  }

  async removeServer(serverId) {
    // Wait for active requests to complete
    const metrics = this.loadMetrics.get(serverId);
    if (metrics && metrics.activeRequests > 0) {
      console.log(`Waiting for ${metrics.activeRequests} active requests to complete...`);
      // In production, implement proper graceful shutdown
    }

    // Remove from all data structures
    this.servers.delete(serverId);
    this.serverHealth.delete(serverId);
    this.circuitBreakers.delete(serverId);
    this.loadMetrics.delete(serverId);

    // Remove from groups
    for (const [groupName, serverIds] of this.serverGroups) {
      const index = serverIds.indexOf(serverId);
      if (index > -1) {
        serverIds.splice(index, 1);
      }
    }

    this.emit('server_removed', { serverId });
    console.log(`Server removed: ${serverId}`);
  }

  async shutdown() {
    console.log('Shutting down IntelligentRouter...');

    // Wait for all active requests to complete
    let activeRequests = 0;
    for (const metrics of this.loadMetrics.values()) {
      activeRequests += metrics.activeRequests;
    }

    if (activeRequests > 0) {
      console.log(`Waiting for ${activeRequests} active requests to complete...`);
      await this.delay(5000); // Wait up to 5 seconds
    }

    // Clear all data structures
    this.servers.clear();
    this.serverHealth.clear();
    this.circuitBreakers.clear();
    this.loadMetrics.clear();
    this.serverGroups.clear();
    this.pendingRequests.clear();

    console.log('IntelligentRouter shutdown complete');
  }
}

export default IntelligentRouter;
