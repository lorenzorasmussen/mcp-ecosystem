const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');

// Import the optimized components
const MCPClientBridge = require('../src/services/MCPClientBridge');
const DatabaseManager = require('../database-manager');
const PersistentStorage = require('../src/models/PersistentStorage');
const configManager = require('../src/config/config');

describe('MCP Client Bridge - Optimization Tests', function() {
  this.timeout(10000); // 10 seconds timeout for tests that might involve I/O

  let app;
  let mcpBridge;
  let server;

  before(async function() {
    // Create a test app instance
    const express = require('express');
    app = express();
    
    // Initialize the optimized MCP bridge
    mcpBridge = new MCPClientBridge('./tests/test-data.db');
    await mcpBridge.initialize();
    
    // Set the bridge in the app for testing
    app.set('mcpBridge', mcpBridge);
    
    // Import and mount routes
    const mcpRoutes = require('../src/routes/mcpRoutes');
    app.use('/api/mcp', mcpRoutes);
    
    // Add a basic error handler for testing
    app.use((err, req, res, next) => {
      console.error('Test error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
    
    // Start the test server
    server = app.listen(0); // Use random available port
  });

  after(async function() {
    if (mcpBridge && typeof mcpBridge.cleanup === 'function') {
      await mcpBridge.cleanup();
    }
    
    if (server) {
      server.close();
    }
    
    // Clean up test database file
    try {
      await fs.unlink('./tests/test-data.db');
    } catch (err) {
      // Ignore if file doesn't exist
    }
  });

  describe('Database Manager', function() {
    let dbManager;

    before(function() {
      dbManager = new DatabaseManager('./tests/test-optimization.db');
    });

    after(async function() {
      if (dbManager && typeof dbManager.close === 'function') {
        await dbManager.close();
      }
      
      try {
        await fs.unlink('./tests/test-optimization.db');
      } catch (err) {
        // Ignore if file doesn't exist
      }
    });

    it('should initialize successfully with performance optimizations', async function() {
      await dbManager.initialize();
      
      // Check that performance optimizations are applied
      const health = await dbManager.healthCheck();
      expect(health.status).to.equal('healthy');
      expect(health.message).to.include('query time');
    });

    it('should track query performance statistics', async function() {
      await dbManager.initialize();
      
      // Execute a query to generate stats
      await dbManager.get('SELECT 1 as test');
      
      const stats = dbManager.getQueryStats();
      expect(stats).to.be.an('array');
      expect(stats.length).to.be.greaterThan(0);
      expect(stats[0]).to.have.property('query');
      expect(stats[0]).to.have.property('executionTime');
      expect(stats[0]).to.have.property('timestamp');
    });

    it('should identify slow queries', async function() {
      await dbManager.initialize();
      
      // Execute a dummy query (not actually slow, but should be recorded)
      await dbManager.get('SELECT 1 as test');
      
      const slowQueries = dbManager.getSlowQueryReport(0); // Threshold of 0 to get all queries
      expect(slowQueries).to.be.an('array');
      expect(slowQueries.length).to.be.greaterThan(0);
    });
  });

  describe('Persistent Storage', function() {
    let storage;

    before(async function() {
      storage = new PersistentStorage('./tests/test-storage.db');
      await storage.initialize();
    });

    after(async function() {
      if (storage && typeof storage.close === 'function') {
        await storage.close();
      }
      
      try {
        await fs.unlink('./tests/test-storage.db');
      } catch (err) {
        // Ignore if file doesn't exist
      }
    });

    it('should initialize with SQLite backend', async function() {
      const agentState = await storage.getAgentState();
      expect(agentState).to.be.an('object');
      expect(agentState).to.have.property('status');
    });

    it('should record and retrieve request metrics', async function() {
      const request = 'Test request';
      const result = { success: true, serverId: 'test-server', intent: 'test', responseTime: 100 };
      
      await storage.recordRequest(request, result);
      
      const metrics = await storage.getMetrics();
      expect(metrics.totalRequests).to.equal(1);
      expect(metrics.successfulRequests).to.equal(1);
      
      const history = await storage.getRequestHistory(10);
      expect(history).to.be.an('array');
      expect(history.length).to.equal(1);
      expect(history[0]).to.have.property('request', request);
      expect(history[0]).to.have.property('result', true);
    });

    it('should update and retrieve server statistics', async function() {
      const serverId = 'test-server-2';
      const statsUpdate = { 
        successful: true, 
        responseTime: 150 
      };
      
      await storage.updateServerStats(serverId, statsUpdate);
      
      const serverStats = await storage.getServerStats(serverId);
      expect(serverStats).to.be.an('object');
      expect(serverStats.requests).to.equal(1);
      expect(serverStats.successful).to.equal(1);
      expect(serverStats.failed).to.equal(0);
      expect(serverStats.totalResponseTime).to.equal(150);
    });
  });

  describe('Configuration Management', function() {
    it('should have valid configuration structure', function() {
      const config = configManager.getAll();
      
      expect(config).to.be.an('object');
      expect(config).to.have.property('server');
      expect(config).to.have.property('mcp');
      expect(config).to.have.property('storage');
      expect(config).to.have.property('logging');
      expect(config).to.have.property('cache');
      expect(config).to.have.property('security');
      expect(config).to.have.property('database');
      expect(config).to.have.property('monitoring');
    });

    it('should validate configuration values', function() {
      const port = configManager.get('server.port');
      expect(port).to.be.a('number');
      expect(port).to.be.within(1, 65535);
      
      const cacheTtl = configManager.get('cache.ttl');
      expect(cacheTtl).to.be.a('number');
      expect(cacheTtl).to.be.greaterThan(0);
    });
  });

  describe('API Endpoints', function() {
    it('should handle process requests with validation', function(done) {
      request(app)
        .post('/api/mcp/process')
        .send({ request: 'Test natural language request' })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          expect(res.body).to.have.property('success');
          expect(res.body).to.have.property('responseTime');
          done();
        });
    });

    it('should validate request format', function(done) {
      request(app)
        .post('/api/mcp/process')
        .send({}) // Missing 'request' field
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('should return statistics', function(done) {
      request(app)
        .get('/api/mcp/stats')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          expect(res.body).to.have.property('connectionPoolSize');
          expect(res.body).to.have.property('cachedRequests');
          expect(res.body).to.have.property('metrics');
          done();
        });
    });

    it('should return performance metrics', function(done) {
      request(app)
        .get('/api/mcp/performance')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          expect(res.body).to.have.property('connections');
          expect(res.body).to.have.property('cache');
          expect(res.body).to.have.property('database');
          done();
        });
    });
  });

  describe('MCP Client Bridge', function() {
    it('should have enhanced error handling', async function() {
      // Test error classification
      const connectionError = new Error('connect ECONNREFUSED');
      connectionError.code = 'ECONNREFUSED';
      
      const errorType = mcpBridge.classifyError(connectionError);
      expect(errorType).to.equal('CONNECTION_ERROR');
      
      const timeoutError = new Error('timeout');
      const timeoutErrorType = mcpBridge.classifyError(timeoutError);
      expect(timeoutErrorType).to.equal('TIMEOUT_ERROR');
    });

    it('should implement circuit breaker pattern', function() {
      const serverId = 'test-circuit-breaker';
      
      // Initially should not be open
      expect(mcpBridge.isCircuitBreakerOpen(serverId)).to.be.false;
      
      // Simulate multiple failures to open circuit
      for (let i = 0; i < 6; i++) {
        mcpBridge.updateCircuitBreaker(serverId, new Error('Test failure'));
      }
      
      // Now it should be open
      expect(mcpBridge.isCircuitBreakerOpen(serverId)).to.be.true;
      
      // Reset it
      mcpBridge.resetCircuitBreaker(serverId);
      expect(mcpBridge.isCircuitBreakerOpen(serverId)).to.be.false;
    });

    it('should calculate backoff with jitter', function() {
      const delay1 = mcpBridge.calculateBackoffDelay(1);
      const delay2 = mcpBridge.calculateBackoffDelay(1);
      
      // With jitter, delays should be slightly different
      expect(delay1).to.be.a('number');
      expect(delay2).to.be.a('number');
    });

    it('should return comprehensive stats', async function() {
      const stats = await mcpBridge.getStats();
      
      expect(stats).to.have.property('connectionPoolSize');
      expect(stats).to.have.property('connectionPoolConfig');
      expect(stats).to.have.property('connectionHealth');
      expect(stats).to.have.property('circuitBreakerStatus');
      expect(stats).to.have.property('cachedRequests');
      expect(stats).to.have.property('activeRequests');
      expect(stats).to.have.property('serverCapabilities');
      expect(stats).to.have.property('metrics');
      expect(stats).to.have.property('cacheStats');
      expect(stats).to.have.property('discoveryStats');
      expect(stats).to.have.property('performanceMetrics');
      expect(stats).to.have.property('systemHealth');
    });
  });
});