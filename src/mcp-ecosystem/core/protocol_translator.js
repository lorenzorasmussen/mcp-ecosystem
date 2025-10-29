import EventEmitter from 'events';
import crypto from 'crypto';
import LRUCache from 'lru-cache';

/**
 * Protocol Translator - Bridges LLM and MCP protocols
 *
 * This component is the core intelligence layer that:
 * - Translates between LLM chat format and MCP tool calls
 * - Maintains conversation context and state
 * - Provides intelligent caching for frequently used translations
 * - Handles protocol validation and error recovery
 * - Optimizes token usage through context compression
 */
class ProtocolTranslator extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration
    this.maxCacheSize = options.maxCacheSize || 1000;
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes
    this.maxContextTokens = options.maxContextTokens || 8000;
    this.compressionThreshold = options.compressionThreshold || 0.8;

    // Caching systems
    this.translationCache = new LRUCache({
      max: this.maxCacheSize,
      ttl: this.cacheTTL,
      allowStale: false,
    });

    this.toolSchemaCache = new LRUCache({
      max: 100,
      ttl: 600000, // 10 minutes
    });

    this.responseCache = new LRUCache({
      max: 500,
      ttl: 180000, // 3 minutes
    });

    // Protocol mappings
    this.toolMappings = new Map();
    this.serverCapabilities = new Map();
    this.conversationStates = new Map();

    // Performance metrics
    this.metrics = {
      translations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      avgTranslationTime: 0,
      totalTranslationTime: 0,
    };

    this.init();
  }

  async init() {
    // Load predefined tool mappings
    await this.loadToolMappings();
    console.log('ProtocolTranslator initialized');
  }

  /**
   * Main translation method: LLM message -> MCP tool calls
   */
  async translateToMCP(llmMessage, sessionId, context = {}) {
    const startTime = Date.now();

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey('llm-to-mcp', llmMessage, context);

      // Check cache first
      let cached = this.translationCache.get(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        this.emit('cache_hit', { type: 'translation', key: cacheKey });
        return cached;
      }

      this.metrics.cacheMisses++;

      // Extract intent and entities from LLM message
      const intent = await this.extractIntent(llmMessage, context);

      // Map intent to MCP tools
      const toolCalls = await this.mapIntentToTools(intent, sessionId);

      // Validate tool calls
      const validatedCalls = await this.validateToolCalls(toolCalls);

      // Cache the result
      this.translationCache.set(cacheKey, validatedCalls);

      // Update metrics
      this.updateMetrics(startTime);
      this.metrics.translations++;

      this.emit('translation_completed', {
        type: 'llm-to-mcp',
        sessionId,
        intent,
        toolCalls: validatedCalls,
      });

      return validatedCalls;
    } catch (error) {
      this.metrics.errors++;
      this.emit('translation_error', { type: 'llm-to-mcp', error, sessionId });
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  /**
   * Main translation method: MCP response -> LLM format
   */
  async translateToLLM(mcpResponse, sessionId, originalRequest) {
    const startTime = Date.now();

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey('mcp-to-llm', mcpResponse, originalRequest);

      // Check cache first
      let cached = this.responseCache.get(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        return cached;
      }

      this.metrics.cacheMisses++;

      // Process MCP response
      const processedResponse = await this.processMCPResponse(mcpResponse, originalRequest);

      // Format for LLM consumption
      const llmResponse = await this.formatForLLM(processedResponse, sessionId);

      // Cache the result
      this.responseCache.set(cacheKey, llmResponse);

      // Update metrics
      this.updateMetrics(startTime);

      this.emit('translation_completed', {
        type: 'mcp-to-llm',
        sessionId,
        response: llmResponse,
      });

      return llmResponse;
    } catch (error) {
      this.metrics.errors++;
      this.emit('translation_error', { type: 'mcp-to-llm', error, sessionId });
      throw new Error(`Response translation failed: ${error.message}`);
    }
  }

  /**
   * Extract intent and entities from LLM message
   */
  async extractIntent(message, context) {
    // Simple intent extraction - in production, use NLP models
    const lowerMessage = message.toLowerCase();

    // Define intent patterns
    const intentPatterns = {
      search: /\b(search|find|look for|get|retrieve)\b/,
      create: /\b(create|make|add|new|generate)\b/,
      update: /\b(update|modify|change|edit)\b/,
      delete: /\b(delete|remove|clear)\b/,
      navigate: /\b(go to|navigate|open|visit)\b/,
      screenshot: /\b(screenshot|capture|take picture)\b/,
      email: /\b(email|send|mail)\b/,
      file: /\b(file|document|upload|download)\b/,
      task: /\b(task|todo|reminder)\b/,
    };

    // Extract primary intent
    let primaryIntent = 'general';
    let confidence = 0;

    for (const [intent, pattern] of Object.entries(intentPatterns)) {
      if (pattern.test(lowerMessage)) {
        primaryIntent = intent;
        confidence = 0.8;
        break;
      }
    }

    // Extract entities (simple keyword extraction)
    const entities = this.extractEntities(message);

    // Determine target servers based on intent and entities
    const targetServers = this.determineTargetServers(primaryIntent, entities);

    return {
      intent: primaryIntent,
      confidence,
      entities,
      targetServers,
      originalMessage: message,
      context,
    };
  }

  /**
   * Map intent to specific MCP tools
   */
  async mapIntentToTools(intent, sessionId) {
    const toolCalls = [];

    // Get conversation state for context
    const conversationState = this.getConversationState(sessionId);

    // Map intent to tools based on available servers
    for (const serverId of intent.targetServers) {
      const serverTools = await this.getServerTools(serverId);

      for (const tool of serverTools) {
        if (this.toolMatchesIntent(tool, intent)) {
          const toolCall = await this.createToolCall(tool, intent, conversationState);
          if (toolCall) {
            toolCalls.push({
              ...toolCall,
              serverId,
              toolName: tool.name,
            });
          }
        }
      }
    }

    // Sort by priority and relevance
    return toolCalls.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Validate tool calls before execution
   */
  async validateToolCalls(toolCalls) {
    const validated = [];

    for (const call of toolCalls) {
      try {
        // Validate against tool schema
        const schema = await this.getToolSchema(call.serverId, call.toolName);
        const isValid = this.validateAgainstSchema(call.arguments, schema);

        if (isValid) {
          validated.push({
            ...call,
            validated: true,
            timestamp: Date.now(),
          });
        } else {
          console.warn(`Invalid tool call: ${call.toolName}`, call.arguments);
        }
      } catch (error) {
        console.error(`Validation error for ${call.toolName}:`, error);
      }
    }

    return validated;
  }

  /**
   * Process MCP response for LLM consumption
   */
  async processMCPResponse(mcpResponse, originalRequest) {
    const processed = {
      success: true,
      data: null,
      errors: [],
      metadata: {
        responseTime: Date.now() - originalRequest.timestamp,
        serverId: mcpResponse.serverId,
        toolName: mcpResponse.toolName,
      },
    };

    // Handle different response types
    if (mcpResponse.error) {
      processed.success = false;
      processed.errors.push(mcpResponse.error);
    } else if (mcpResponse.result) {
      processed.data = this.formatResponseData(mcpResponse.result);
    }

    // Add context and suggestions
    processed.suggestions = await this.generateSuggestions(processed, originalRequest);

    return processed;
  }

  /**
   * Format response for LLM consumption
   */
  async formatForLLM(processedResponse, sessionId) {
    const conversationState = this.getConversationState(sessionId);

    let response = '';

    if (processedResponse.success) {
      response = `✅ Successfully completed ${processedResponse.metadata.toolName}:\n\n`;
      response += this.formatDataForLLM(processedResponse.data);

      if (processedResponse.suggestions.length > 0) {
        response += '\n\n💡 Suggestions:\n';
        processedResponse.suggestions.forEach((suggestion, i) => {
          response += `${i + 1}. ${suggestion}\n`;
        });
      }
    } else {
      response = `❌ Error: ${processedResponse.errors.join(', ')}`;

      // Add recovery suggestions
      response += '\n\n🔧 Try:\n';
      response += '1. Check your input parameters\n';
      response += '2. Verify the server is available\n';
      response += '3. Try a different approach\n';
    }

    // Update conversation state
    this.updateConversationState(sessionId, {
      lastResponse: processedResponse,
      lastAction: processedResponse.metadata.toolName,
    });

    return {
      role: 'assistant',
      content: response,
      metadata: processedResponse.metadata,
    };
  }

  /**
   * Helper methods
   */
  extractEntities(message) {
    const entities = {};

    // Extract URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = message.match(urlRegex);
    if (urls) entities.urls = urls;

    // Extract email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = message.match(emailRegex);
    if (emails) entities.emails = emails;

    // Extract file paths
    const pathRegex = /\/[^\s]+/g;
    const paths = message.match(pathRegex);
    if (paths) entities.paths = paths;

    // Extract quoted text
    const quoteRegex = /"([^"]+)"/g;
    const quotes = [];
    let match;
    while ((match = quoteRegex.exec(message)) !== null) {
      quotes.push(match[1]);
    }
    if (quotes.length > 0) entities.quoted = quotes;

    return entities;
  }

  determineTargetServers(intent, entities) {
    const servers = [];

    // Map intents to servers
    const intentServerMap = {
      search: ['mem0', 'notion', 'google_suite'],
      create: ['notion', 'task', 'google_suite'],
      update: ['notion', 'task', 'mem0'],
      delete: ['notion', 'task'],
      navigate: ['browsertools'],
      screenshot: ['browsertools'],
      email: ['google_suite'],
      file: ['google_suite'],
      task: ['task'],
    };

    if (intentServerMap[intent.intent]) {
      servers.push(...intentServerMap[intent.intent]);
    }

    // Add servers based on entities
    if (entities.urls && entities.urls.length > 0) {
      servers.push('browsertools');
    }
    if (entities.emails && entities.emails.length > 0) {
      servers.push('google_suite');
    }

    return [...new Set(servers)]; // Remove duplicates
  }

  toolMatchesIntent(tool, intent) {
    // Simple matching based on tool name and description
    const toolName = tool.name.toLowerCase();
    const toolDesc = (tool.description || '').toLowerCase();
    const searchText = `${toolName} ${toolDesc}`;

    switch (intent.intent) {
      case 'search':
        return /search|find|get|list|query/.test(searchText);
      case 'create':
        return /create|add|new|make|generate/.test(searchText);
      case 'update':
        return /update|modify|change|edit/.test(searchText);
      case 'delete':
        return /delete|remove|clear/.test(searchText);
      case 'navigate':
        return /navigate|go|open|visit/.test(searchText);
      case 'screenshot':
        return /screenshot|capture|picture/.test(searchText);
      default:
        return true; // Default to allowing all tools for general intent
    }
  }

  async createToolCall(tool, intent, conversationState) {
    // Extract parameters from intent entities
    const parameters = this.extractParameters(tool, intent, conversationState);

    if (!parameters) {
      return null; // Skip if required parameters missing
    }

    return {
      id: crypto.randomUUID(),
      type: 'tool_call',
      arguments: parameters,
      priority: this.calculateToolPriority(tool, intent),
    };
  }

  extractParameters(tool, intent, conversationState) {
    const params = {};
    const schema = tool.inputSchema || {};

    // Extract parameters based on schema and intent entities
    for (const [paramName, paramSchema] of Object.entries(schema.properties || {})) {
      const value = this.extractParameterValue(paramName, paramSchema, intent, conversationState);
      if (value !== undefined) {
        params[paramName] = value;
      } else if (paramSchema.required) {
        // Required parameter missing
        return null;
      }
    }

    return params;
  }

  extractParameterValue(paramName, paramSchema, intent, conversationState) {
    const lowerName = paramName.toLowerCase();

    // Check entities first
    if (intent.entities) {
      if (lowerName.includes('url') && intent.entities.urls) {
        return intent.entities.urls[0];
      }
      if (lowerName.includes('email') && intent.entities.emails) {
        return intent.entities.emails[0];
      }
      if (lowerName.includes('path') && intent.entities.paths) {
        return intent.entities.paths[0];
      }
      if (lowerName.includes('query') && intent.entities.quoted) {
        return intent.entities.quoted.join(' ');
      }
    }

    // Check conversation state for context
    if (conversationState.context) {
      const contextValue = conversationState.context[lowerName];
      if (contextValue !== undefined) {
        return contextValue;
      }
    }

    // Use defaults from schema
    return paramSchema.default;
  }

  calculateToolPriority(tool, intent) {
    let priority = 0;

    // Boost priority for exact name matches
    if (tool.name.toLowerCase().includes(intent.intent.toLowerCase())) {
      priority += 10;
    }

    // Boost for recently used tools
    if (this.recentlyUsedTools.has(tool.name)) {
      priority += 5;
    }

    // Boost based on server capabilities
    const serverCap = this.serverCapabilities.get(tool.serverId);
    if (serverCap && serverCap.reliability > 0.9) {
      priority += 3;
    }

    return priority;
  }

  formatResponseData(data) {
    if (typeof data === 'string') {
      return data;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) return 'No results found';
      return data.map((item, i) => `${i + 1}. ${JSON.stringify(item, null, 2)}`).join('\n\n');
    }

    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }

    return String(data);
  }

  formatDataForLLM(data) {
    if (typeof data === 'string') {
      return data;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) return 'No results found';
      return data.map((item, i) => `${i + 1}. ${this.formatDataForLLM(item)}`).join('\n\n');
    }

    if (typeof data === 'object') {
      const formatted = [];
      for (const [key, value] of Object.entries(data)) {
        formatted.push(`**${key}**: ${this.formatDataForLLM(value)}`);
      }
      return formatted.join('\n');
    }

    return String(data);
  }

  async generateSuggestions(response, originalRequest) {
    const suggestions = [];

    if (response.success) {
      suggestions.push('Continue with related operations');
      suggestions.push('Save this result for later reference');

      if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data) && response.data.length > 1) {
          suggestions.push('Analyze these results further');
        }
      }
    } else {
      suggestions.push('Try with different parameters');
      suggestions.push('Check server availability');
    }

    return suggestions;
  }

  /**
   * Cache and state management
   */
  generateCacheKey(type, data, context = {}) {
    const hash = crypto.createHash('md5');
    hash.update(type);
    hash.update(JSON.stringify(data));
    hash.update(JSON.stringify(context));
    return hash.digest('hex');
  }

  getConversationState(sessionId) {
    if (!this.conversationStates.has(sessionId)) {
      this.conversationStates.set(sessionId, {
        context: {},
        history: [],
        lastAction: null,
        startTime: Date.now(),
      });
    }
    return this.conversationStates.get(sessionId);
  }

  updateConversationState(sessionId, updates) {
    const state = this.getConversationState(sessionId);
    Object.assign(state, updates);

    // Keep history manageable
    if (state.history && state.history.length > 50) {
      state.history = state.history.slice(-50);
    }
  }

  updateMetrics(startTime) {
    const duration = Date.now() - startTime;
    this.metrics.totalTranslationTime += duration;
    this.metrics.avgTranslationTime =
      this.metrics.totalTranslationTime / (this.metrics.translations || 1);
  }

  /**
   * Server and tool management
   */
  async loadToolMappings() {
    // Predefined tool mappings for common operations
    this.toolMappings.set('search', {
      mem0: ['mem0_search'],
      notion: ['notion_search_pages', 'notion_search_database'],
      google_suite: ['gmail_search', 'drive_list_files'],
    });

    this.toolMappings.set('create', {
      notion: ['notion_create_page'],
      task: ['task_create'],
      google_suite: ['docs_create', 'sheets_create'],
    });

    // Load server capabilities
    this.serverCapabilities.set('mem0', { reliability: 0.95, speed: 'fast' });
    this.serverCapabilities.set('notion', { reliability: 0.9, speed: 'medium' });
    this.serverCapabilities.set('browsertools', { reliability: 0.85, speed: 'slow' });
    this.serverCapabilities.set('google_suite', { reliability: 0.92, speed: 'medium' });
    this.serverCapabilities.set('task', { reliability: 0.98, speed: 'fast' });
  }

  async getServerTools(serverId) {
    // In a real implementation, this would query the MCP server
    // For now, return predefined tools
    const serverTools = {
      mem0: [
        { name: 'mem0_search', description: 'Search memory store' },
        { name: 'mem0_add', description: 'Add to memory store' },
      ],
      notion: [
        { name: 'notion_search_pages', description: 'Search Notion pages' },
        { name: 'notion_create_page', description: 'Create Notion page' },
      ],
      browsertools: [
        { name: 'browser_navigate', description: 'Navigate to URL' },
        { name: 'browser_screenshot', description: 'Take screenshot' },
      ],
      google_suite: [
        { name: 'gmail_search', description: 'Search Gmail' },
        { name: 'drive_list_files', description: 'List Drive files' },
      ],
      task: [
        { name: 'task_create', description: 'Create task' },
        { name: 'task_list', description: 'List tasks' },
      ],
    };

    return serverTools[serverId] || [];
  }

  async getToolSchema(serverId, toolName) {
    const cacheKey = `${serverId}:${toolName}`;
    let schema = this.toolSchemaCache.get(cacheKey);

    if (!schema) {
      // In a real implementation, fetch from MCP server
      schema = {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      };

      this.toolSchemaCache.set(cacheKey, schema);
    }

    return schema;
  }

  validateAgainstSchema(args, schema) {
    // Simple validation - in production, use JSON Schema validator
    if (!schema || !schema.properties) return true;

    for (const [param, paramSchema] of Object.entries(schema.properties)) {
      if (paramSchema.required && !args[param]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Public API methods
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate:
        this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
      cacheSize: {
        translation: this.translationCache.size,
        response: this.responseCache.size,
        schema: this.toolSchemaCache.size,
      },
    };
  }

  clearCache(type = 'all') {
    switch (type) {
      case 'translation':
        this.translationCache.clear();
        break;
      case 'response':
        this.responseCache.clear();
        break;
      case 'schema':
        this.toolSchemaCache.clear();
        break;
      case 'all':
        this.translationCache.clear();
        this.responseCache.clear();
        this.toolSchemaCache.clear();
        break;
    }

    this.emit('cache_cleared', { type });
  }

  resetMetrics() {
    this.metrics = {
      translations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      avgTranslationTime: 0,
      totalTranslationTime: 0,
    };
  }

  async shutdown() {
    console.log('Shutting down ProtocolTranslator...');

    // Clear caches
    this.clearCache('all');

    // Clear conversation states
    this.conversationStates.clear();

    console.log('ProtocolTranslator shutdown complete');
  }
}

export default ProtocolTranslator;
