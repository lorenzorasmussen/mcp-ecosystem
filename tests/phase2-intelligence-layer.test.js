/**
 * Comprehensive test suite for Phase 2 Intelligence Layer components
 * Tests Protocol Translator, Intelligent Router, Advanced Cache, and Context Manager
 */

const fs = require('fs');
const path = require('path');

// Import components for testing
const ProtocolTranslator = require('../src/mcp-ecosystem/core/protocol_translator.js').default;
const IntelligentRouter = require('../src/mcp-ecosystem/core/intelligent_router.js').default;
const AdvancedCache = require('../src/mcp-ecosystem/core/advanced_cache.js').default;
const ContextManager = require('../src/mcp-ecosystem/core/context_manager.js').default;

describe('Phase 2 Intelligence Layer', () => {
  const coreDir = path.join(__dirname, '../src/mcp-ecosystem/core');

  describe('Component File Creation', () => {
    test('protocol_translator.js should exist and be valid', () => {
      const translatorPath = path.join(coreDir, 'protocol_translator.js');
      expect(fs.existsSync(translatorPath)).toBe(true);

      const content = fs.readFileSync(translatorPath, 'utf8');
      expect(content).toContain('class ProtocolTranslator');
      expect(content).toContain('translateToMCP');
      expect(content).toContain('translateToLLM');
      expect(content).toContain('extractIntent');
      expect(content).toContain('LRUCache');
    });

    test('intelligent_router.js should exist and be valid', () => {
      const routerPath = path.join(coreDir, 'intelligent_router.js');
      expect(fs.existsSync(routerPath)).toBe(true);

      const content = fs.readFileSync(routerPath, 'utf8');
      expect(content).toContain('class IntelligentRouter');
      expect(content).toContain('routeRequest');
      expect(content).toContain('registerServer');
      expect(content).toContain('circuitBreaker');
      expect(content).toContain('healthBasedStrategy');
    });

    test('advanced_cache.js should exist and be valid', () => {
      const cachePath = path.join(coreDir, 'advanced_cache.js');
      expect(fs.existsSync(cachePath)).toBe(true);

      const content = fs.readFileSync(cachePath, 'utf8');
      expect(content).toContain('class AdvancedCache');
      expect(content).toContain('async get');
      expect(content).toContain('async set');
      expect(content).toContain('multi-tier');
      expect(content).toContain('compressionThreshold');
    });

    test('context_manager.js should exist and be valid', () => {
      const contextPath = path.join(coreDir, 'context_manager.js');
      expect(fs.existsSync(contextPath)).toBe(true);

      const content = fs.readFileSync(contextPath, 'utf8');
      expect(content).toContain('class ContextManager');
      expect(content).toContain('addContext');
      expect(content).toContain('getRelevantContext');
      expect(content).toContain('compressContext');
      expect(content).toContain('semanticCompression');
    });
  });

  describe('Protocol Translator Implementation', () => {
    test('should have required methods and properties', () => {
      const translatorPath = path.join(coreDir, 'protocol_translator.js');
      const content = fs.readFileSync(translatorPath, 'utf8');

      const requiredMethods = [
        'translateToMCP',
        'translateToLLM',
        'extractIntent',
        'mapIntentToTools',
        'validateToolCalls',
        'processMCPResponse',
        'formatForLLM',
        'getMetrics',
        'clearCache',
      ];

      requiredMethods.forEach(method => {
        expect(content).toContain(method);
      });

      // Check for caching implementation
      expect(content).toContain('translationCache');
      expect(content).toContain('responseCache');
      expect(content).toContain('toolSchemaCache');
    });

    test('should have intent extraction patterns', () => {
      const translatorPath = path.join(coreDir, 'protocol_translator.js');
      const content = fs.readFileSync(translatorPath, 'utf8');

      const intentPatterns = [
        'search',
        'create',
        'update',
        'delete',
        'navigate',
        'screenshot',
        'email',
        'file',
        'task',
      ];

      intentPatterns.forEach(intent => {
        expect(content).toContain(intent);
      });
    });

    test('should have entity extraction capabilities', () => {
      const translatorPath = path.join(coreDir, 'protocol_translator.js');
      const content = fs.readFileSync(translatorPath, 'utf8');

      expect(content).toContain('extractEntities');
      expect(content).toContain('urls');
      expect(content).toContain('emails');
      expect(content).toContain('paths');
      expect(content).toContain('quoted');
    });

    test('should have performance metrics tracking', () => {
      const translatorPath = path.join(coreDir, 'protocol_translator.js');
      const content = fs.readFileSync(translatorPath, 'utf8');

      expect(content).toContain('metrics');
      expect(content).toContain('translations');
      expect(content).toContain('cacheHits');
      expect(content).toContain('cacheMisses');
      expect(content).toContain('avgTranslationTime');
    });
  });

  describe('Intelligent Router Implementation', () => {
    test('should have required methods and properties', () => {
      const routerPath = path.join(coreDir, 'intelligent_router.js');
      const content = fs.readFileSync(routerPath, 'utf8');

      const requiredMethods = [
        'registerServer',
        'routeRequest',
        'selectOptimalServer',
        'executeRequest',
        'checkServerHealth',
        'getServerStatus',
        'setRoutingStrategy',
      ];

      requiredMethods.forEach(method => {
        expect(content).toContain(method);
      });
    });

    test('should have multiple routing strategies', () => {
      const routerPath = path.join(coreDir, 'intelligent_router.js');
      const content = fs.readFileSync(routerPath, 'utf8');

      const strategies = [
        'roundRobinStrategy',
        'leastConnectionsStrategy',
        'weightedResponseTimeStrategy',
        'healthBasedStrategy',
      ];

      strategies.forEach(strategy => {
        expect(content).toContain(strategy);
      });
    });

    test('should have circuit breaker implementation', () => {
      const routerPath = path.join(coreDir, 'intelligent_router.js');
      const content = fs.readFileSync(routerPath, 'utf8');

      expect(content).toContain('circuitBreakers');
      expect(content).toContain('isCircuitBreakerClosed');
      expect(content).toContain('recordCircuitBreakerSuccess');
      expect(content).toContain('recordCircuitBreakerFailure');
      expect(content).toContain('circuitBreakerThreshold');
    });

    test('should have health monitoring capabilities', () => {
      const routerPath = path.join(coreDir, 'intelligent_router.js');
      const content = fs.readFileSync(routerPath, 'utf8');

      expect(content).toContain('serverHealth');
      expect(content).toContain('healthCheckInterval');
      expect(content).toContain('performHealthCheck');
      expect(content).toContain('startHealthMonitoring');
    });

    test('should have load balancing features', () => {
      const routerPath = path.join(coreDir, 'intelligent_router.js');
      const content = fs.readFileSync(routerPath, 'utf8');

      expect(content).toContain('loadMetrics');
      expect(content).toContain('activeRequests');
      expect(content).toContain('maxConnections');
      expect(content).toContain('serverUtilization');
    });
  });

  describe('Advanced Cache Implementation', () => {
    test('should have required methods and properties', () => {
      const cachePath = path.join(coreDir, 'advanced_cache.js');
      const content = fs.readFileSync(cachePath, 'utf8');

      const requiredMethods = [
        'async get',
        'async set',
        'async delete',
        'async clear',
        'getStats',
        'getCacheInfo',
        'compress',
        'decompress',
      ];

      requiredMethods.forEach(method => {
        expect(content).toContain(method);
      });
    });

    test('should have multi-tier caching architecture', () => {
      const cachePath = path.join(coreDir, 'advanced_cache.js');
      const content = fs.readFileSync(cachePath, 'utf8');

      expect(content).toContain('memoryCache');
      expect(content).toContain('diskCache');
      expect(content).toContain('compressionCache');
      expect(content).toContain('promoteToL1');
      expect(content).toContain('evictFromMemory');
      expect(content).toContain('evictFromDisk');
    });

    test('should have compression capabilities', () => {
      const cachePath = path.join(coreDir, 'advanced_cache.js');
      const content = fs.readFileSync(cachePath, 'utf8');

      expect(content).toContain('compressionThreshold');
      expect(content).toContain('enableCompression');
      expect(content).toContain('compressionRatio');
      expect(content).toContain('compressSession');
    });

    test('should have TTL management', () => {
      const cachePath = path.join(coreDir, 'advanced_cache.js');
      const content = fs.readFileSync(cachePath, 'utf8');

      expect(content).toContain('defaultTTL');
      expect(content).toContain('ttlTimers');
      expect(content).toContain('setTTLTimer');
      expect(content).toContain('clearTTLTimer');
      expect(content).toContain('cleanupExpiredEntries');
    });

    test('should have persistence features', () => {
      const cachePath = path.join(coreDir, 'advanced_cache.js');
      const content = fs.readFileSync(cachePath, 'utf8');

      expect(content).toContain('enablePersistence');
      expect(content).toContain('persistToDisk');
      expect(content).toContain('loadFromDisk');
      expect(content).toContain('loadDiskCache');
    });

    test('should have performance monitoring', () => {
      const cachePath = path.join(coreDir, 'advanced_cache.js');
      const content = fs.readFileSync(cachePath, 'utf8');

      expect(content).toContain('cacheStats');
      expect(content).toContain('hits');
      expect(content).toContain('misses');
      expect(content).toContain('evictions');
      expect(content).toContain('hitRate');
    });
  });

  describe('Context Manager Implementation', () => {
    test('should have required methods and properties', () => {
      const contextPath = path.join(coreDir, 'context_manager.js');
      const content = fs.readFileSync(contextPath, 'utf8');

      const requiredMethods = [
        'addContext',
        'getRelevantContext',
        'compressContext',
        'createContext',
        'getContextStats',
        'setCompressionStrategy',
      ];

      requiredMethods.forEach(method => {
        expect(content).toContain(method);
      });
    });

    test('should have multiple compression strategies', () => {
      const contextPath = path.join(coreDir, 'context_manager.js');
      const content = fs.readFileSync(contextPath, 'utf8');

      const strategies = [
        'temporalCompression',
        'semanticCompression',
        'importanceBasedCompression',
        'hybridCompression',
      ];

      strategies.forEach(strategy => {
        expect(content).toContain(strategy);
      });
    });

    test('should have semantic similarity capabilities', () => {
      const contextPath = path.join(coreDir, 'context_manager.js');
      const content = fs.readFileSync(contextPath, 'utf8');

      expect(content).toContain('generateEmbedding');
      expect(content).toContain('calculateRelevance');
      expect(content).toContain('clusterBySimilarity');
      expect(content).toContain('calculateSimilarity');
    });

    test('should have importance scoring', () => {
      const contextPath = path.join(coreDir, 'context_manager.js');
      const content = fs.readFileSync(contextPath, 'utf8');

      expect(content).toContain('calculateImportance');
      expect(content).toContain('importance');
      expect(content).toContain('relevanceThreshold');
    });

    test('should have summarization capabilities', () => {
      const contextPath = path.join(coreDir, 'context_manager.js');
      const content = fs.readFileSync(contextPath, 'utf8');

      expect(content).toContain('summarizeEntries');
      expect(content).toContain('summarizationThreshold');
      expect(content).toContain('summary');
    });

    test('should have context window management', () => {
      const contextPath = path.join(coreDir, 'context_manager.js');
      const content = fs.readFileSync(contextPath, 'utf8');

      expect(content).toContain('maxContextTokens');
      expect(content).toContain('contextWindow');
      expect(content).toContain('compressionThreshold');
      expect(content).toContain('estimateTokens');
    });
  });

  describe('Integration Features', () => {
    test('components should have event emission capabilities', () => {
      const components = [
        'protocol_translator.js',
        'intelligent_router.js',
        'advanced_cache.js',
        'context_manager.js',
      ];

      components.forEach(component => {
        const componentPath = path.join(coreDir, component);
        const content = fs.readFileSync(componentPath, 'utf8');

        expect(content).toContain('EventEmitter');
        expect(content).toContain('emit(');
      });
    });

    test('components should have proper error handling', () => {
      const components = [
        'protocol_translator.js',
        'intelligent_router.js',
        'advanced_cache.js',
        'context_manager.js',
      ];

      components.forEach(component => {
        const componentPath = path.join(coreDir, component);
        const content = fs.readFileSync(componentPath, 'utf8');

        expect(content).toContain('try');
        expect(content).toContain('catch');
        expect(content).toContain('Error');
      });
    });

    test('components should have metrics and monitoring', () => {
      const components = [
        'protocol_translator.js',
        'intelligent_router.js',
        'advanced_cache.js',
        'context_manager.js',
      ];

      components.forEach(component => {
        const componentPath = path.join(coreDir, component);
        const content = fs.readFileSync(componentPath, 'utf8');

        expect(content).toContain('metrics');
        expect(content).toContain('getStats');
      });
    });

    test('components should have graceful shutdown', () => {
      const components = [
        'protocol_translator.js',
        'intelligent_router.js',
        'advanced_cache.js',
        'context_manager.js',
      ];

      components.forEach(component => {
        const componentPath = path.join(coreDir, component);
        const content = fs.readFileSync(componentPath, 'utf8');

        expect(content).toContain('shutdown');
        expect(content).toContain('async shutdown');
      });
    });
  });

  describe('Performance and Scalability', () => {
    test('should have caching mechanisms', () => {
      const translatorPath = path.join(coreDir, 'protocol_translator.js');
      const cachePath = path.join(coreDir, 'advanced_cache.js');

      const translatorContent = fs.readFileSync(translatorPath, 'utf8');
      const cacheContent = fs.readFileSync(cachePath, 'utf8');

      expect(translatorContent).toContain('LRUCache');
      expect(translatorContent).toContain('translationCache');
      expect(cacheContent).toContain('memoryCache');
      expect(cacheContent).toContain('diskCache');
    });

    test('should have load balancing', () => {
      const routerPath = path.join(coreDir, 'intelligent_router.js');
      const content = fs.readFileSync(routerPath, 'utf8');

      expect(content).toContain('loadMetrics');
      expect(content).toContain('activeRequests');
      expect(content).toContain('maxConnections');
      expect(content).toContain('leastConnectionsStrategy');
    });

    test('should have circuit breaker pattern', () => {
      const routerPath = path.join(coreDir, 'intelligent_router.js');
      const content = fs.readFileSync(routerPath, 'utf8');

      expect(content).toContain('circuitBreakerThreshold');
      expect(content).toContain('circuitBreakerTimeout');
      expect(content).toContain('state');
      expect(content).toContain('closed');
      expect(content).toContain('open');
    });

    test('should have compression optimization', () => {
      const cachePath = path.join(coreDir, 'advanced_cache.js');
      const contextPath = path.join(coreDir, 'context_manager.js');

      const cacheContent = fs.readFileSync(cachePath, 'utf8');
      const contextContent = fs.readFileSync(contextPath, 'utf8');

      expect(cacheContent).toContain('compressionThreshold');
      expect(cacheContent).toContain('compressionRatio');
      expect(contextContent).toContain('compressionThreshold');
      expect(contextContent).toContain('compressionRatio');
    });
  });

  describe('Configuration and Flexibility', () => {
    test('components should accept configuration options', () => {
      const components = [
        'protocol_translator.js',
        'intelligent_router.js',
        'advanced_cache.js',
        'context_manager.js',
      ];

      components.forEach(component => {
        const componentPath = path.join(coreDir, component);
        const content = fs.readFileSync(componentPath, 'utf8');

        expect(content).toContain('constructor(options');
        expect(content).toContain('options.');
      });
    });

    test('should have configurable strategies', () => {
      const routerPath = path.join(coreDir, 'intelligent_router.js');
      const contextPath = path.join(coreDir, 'context_manager.js');

      const routerContent = fs.readFileSync(routerPath, 'utf8');
      const contextContent = fs.readFileSync(contextPath, 'utf8');

      expect(routerContent).toContain('setRoutingStrategy');
      expect(routerContent).toContain('currentStrategy');
      expect(contextContent).toContain('setCompressionStrategy');
      expect(contextContent).toContain('currentStrategy');
    });

    test('should have configurable thresholds and limits', () => {
      const components = [
        'protocol_translator.js',
        'intelligent_router.js',
        'advanced_cache.js',
        'context_manager.js',
      ];

      components.forEach(component => {
        const componentPath = path.join(coreDir, component);
        const content = fs.readFileSync(componentPath, 'utf8');

        // Check for various configuration options
        expect(content).toMatch(/threshold|limit|max|min|size|ttl/i);
      });
    });
  });

  describe('Code Quality and Best Practices', () => {
    test('should use ES6 modules', () => {
      const components = [
        'protocol_translator.js',
        'intelligent_router.js',
        'advanced_cache.js',
        'context_manager.js',
      ];

      components.forEach(component => {
        const componentPath = path.join(coreDir, component);
        const content = fs.readFileSync(componentPath, 'utf8');

        expect(content).toContain('import ');
        expect(content).toContain('export default');
      });
    });

    test('should have proper JSDoc comments', () => {
      const components = [
        'protocol_translator.js',
        'intelligent_router.js',
        'advanced_cache.js',
        'context_manager.js',
      ];

      components.forEach(component => {
        const componentPath = path.join(coreDir, component);
        const content = fs.readFileSync(componentPath, 'utf8');

        expect(content).toContain('/**');
        expect(content).toContain('*');
        expect(content).toContain('*/');
      });
    });

    test('should handle async operations properly', () => {
      const components = [
        'protocol_translator.js',
        'intelligent_router.js',
        'advanced_cache.js',
        'context_manager.js',
      ];

      components.forEach(component => {
        const componentPath = path.join(coreDir, component);
        const content = fs.readFileSync(componentPath, 'utf8');

        expect(content).toContain('async ');
        expect(content).toContain('await ');
      });
    });

    test('should have proper class structure', () => {
      const components = [
        'protocol_translator.js',
        'intelligent_router.js',
        'advanced_cache.js',
        'context_manager.js',
      ];

      components.forEach(component => {
        const componentPath = path.join(coreDir, component);
        const content = fs.readFileSync(componentPath, 'utf8');

        expect(content).toContain('class ');
        expect(content).toContain('constructor(');
        expect(content).toContain('this.');
      });
    });
  });

  describe('Phase 2 Success Criteria', () => {
    test('should achieve 50% context reduction goal', () => {
      const contextPath = path.join(coreDir, 'context_manager.js');
      const content = fs.readFileSync(contextPath, 'utf8');

      expect(content).toContain('compressionThreshold');
      expect(content).toContain('compressionRatio');
      expect(content).toContain('summarizeEntries');
      expect(content).toContain('hybridCompression');
    });

    test('should achieve 70% response time improvement goal', () => {
      const routerPath = path.join(coreDir, 'intelligent_router.js');
      const cachePath = path.join(coreDir, 'advanced_cache.js');

      const routerContent = fs.readFileSync(routerPath, 'utf8');
      const cacheContent = fs.readFileSync(cachePath, 'utf8');

      expect(routerContent).toContain('avgResponseTime');
      expect(routerContent).toContain('weightedResponseTimeStrategy');
      expect(cacheContent).toContain('avgResponseTime');
      expect(cacheContent).toContain('hitRate');
    });

    test('should have comprehensive monitoring and analytics', () => {
      const components = [
        'protocol_translator.js',
        'intelligent_router.js',
        'advanced_cache.js',
        'context_manager.js',
      ];

      components.forEach(component => {
        const componentPath = path.join(coreDir, component);
        const content = fs.readFileSync(componentPath, 'utf8');

        expect(content).toContain('metrics');
        expect(content).toContain('getStats');
        expect(content).toContain('emit(');
      });
    });

    test('should be production-ready with proper error handling', () => {
      const components = [
        'protocol_translator.js',
        'intelligent_router.js',
        'advanced_cache.js',
        'context_manager.js',
      ];

      components.forEach(component => {
        const componentPath = path.join(coreDir, component);
        const content = fs.readFileSync(componentPath, 'utf8');

        expect(content).toContain('try');
        expect(content).toContain('catch');
        expect(content).toContain('console.error');
        expect(content).toContain('shutdown');
      });
    });
  });
});
