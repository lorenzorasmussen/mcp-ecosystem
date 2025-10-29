import EventEmitter from 'events';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Context Manager - Intelligent context compression and retrieval
 *
 * This component provides sophisticated context management:
 * - Smart context compression and summarization
 * - Semantic similarity-based retrieval
 * - Context window optimization
 * - Conversation state management
 * - Memory-efficient storage and retrieval
 */
class ContextManager extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration
    this.maxContextTokens = options.maxContextTokens || 8000;
    this.compressionThreshold = options.compressionThreshold || 0.7; // Compress at 70% capacity
    this.summarizationThreshold = options.summarizationThreshold || 50; // Summarize after 50 entries
    this.relevanceThreshold = options.relevanceThreshold || 0.3; // Minimum relevance score
    this.contextWindow = options.contextWindow || 20; // Recent entries to always keep

    // Storage
    this.contexts = new Map(); // sessionId -> context data
    this.summaries = new Map(); // sessionId -> summary data
    this.embeddings = new Map(); // contentId -> embedding vector
    this.index = new Map(); // term -> [contentIds]

    // Context processing
    this.compressionStrategies = {
      temporal: this.temporalCompression.bind(this),
      semantic: this.semanticCompression.bind(this),
      importance: this.importanceBasedCompression.bind(this),
      hybrid: this.hybridCompression.bind(this),
    };

    this.currentStrategy = options.strategy || 'hybrid';

    // Performance metrics
    this.metrics = {
      totalContexts: 0,
      totalEntries: 0,
      compressedContexts: 0,
      summarizedContexts: 0,
      avgContextSize: 0,
      avgCompressionRatio: 0,
      retrievalTime: 0,
      compressionTime: 0,
    };

    // Storage directories
    this.storageDir = options.storageDir || path.join(__dirname, '../../../data/contexts');

    this.init();
  }

  async init() {
    try {
      // Create storage directory
      await fs.mkdir(this.storageDir, { recursive: true });

      // Load existing contexts
      await this.loadContexts();

      console.log('ContextManager initialized');
      console.log(`  Max context tokens: ${this.maxContextTokens}`);
      console.log(`  Compression strategy: ${this.currentStrategy}`);
      console.log(`  Context window: ${this.contextWindow}`);
    } catch (error) {
      console.error('Failed to initialize ContextManager:', error);
    }
  }

  /**
   * Add context entry
   */
  async addContext(sessionId, content, metadata = {}) {
    const startTime = Date.now();

    try {
      // Get or create context
      let context = this.contexts.get(sessionId);
      if (!context) {
        context = await this.createContext(sessionId);
      }

      // Create context entry
      const entry = {
        id: crypto.randomUUID(),
        sessionId,
        content,
        metadata: {
          ...metadata,
          timestamp: Date.now(),
          tokens: this.estimateTokens(content),
          type: metadata.type || 'user_input',
        },
        importance: this.calculateImportance(content, metadata),
        embedding: await this.generateEmbedding(content),
      };

      // Add to context
      context.entries.push(entry);
      context.totalTokens += entry.metadata.tokens;
      context.lastUpdated = Date.now();

      // Update search index
      this.updateIndex(entry);

      // Check if compression is needed
      if (this.shouldCompress(context)) {
        await this.compressContext(sessionId);
      }

      // Update metrics
      this.metrics.totalEntries++;
      this.updateMetrics(startTime);

      // Persist context
      await this.saveContext(sessionId);

      this.emit('context_added', { sessionId, entryId: entry.id });

      return entry;
    } catch (error) {
      console.error(`Failed to add context for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve relevant context
   */
  async getRelevantContext(sessionId, query, options = {}) {
    const startTime = Date.now();

    try {
      const context = this.contexts.get(sessionId);
      if (!context) {
        return [];
      }

      const maxTokens = options.maxTokens || this.maxContextTokens;
      const maxEntries = options.maxEntries || 50;

      // Get all entries
      let entries = [...context.entries];

      // Add summary if available
      if (context.summary) {
        entries.unshift({
          id: 'summary',
          content: context.summary.content,
          metadata: {
            type: 'summary',
            tokens: context.summary.tokens,
            timestamp: context.summary.timestamp,
          },
          importance: 1.0,
          isSummary: true,
        });
      }

      // Calculate relevance scores
      const queryEmbedding = await this.generateEmbedding(query);
      const scoredEntries = entries.map(entry => ({
        ...entry,
        relevance: this.calculateRelevance(entry, query, queryEmbedding),
      }));

      // Filter by relevance threshold
      const relevantEntries = scoredEntries.filter(
        entry => entry.relevance >= this.relevanceThreshold || entry.isSummary
      );

      // Sort by relevance and importance
      relevantEntries.sort((a, b) => {
        // Always keep summary first
        if (a.isSummary) return -1;
        if (b.isSummary) return 1;

        // Sort by combined score
        const scoreA = a.relevance * 0.7 + a.importance * 0.3;
        const scoreB = b.relevance * 0.7 + b.importance * 0.3;
        return scoreB - scoreA;
      });

      // Select entries within token limit
      let selectedEntries = [];
      let totalTokens = 0;

      for (const entry of relevantEntries) {
        const entryTokens = entry.metadata.tokens || this.estimateTokens(entry.content);

        if (totalTokens + entryTokens > maxTokens) {
          break;
        }

        selectedEntries.push(entry);
        totalTokens += entryTokens;

        if (selectedEntries.length >= maxEntries) {
          break;
        }
      }

      // Update metrics
      this.metrics.retrievalTime += Date.now() - startTime;

      this.emit('context_retrieved', {
        sessionId,
        query,
        entriesReturned: selectedEntries.length,
        totalTokens,
      });

      return selectedEntries;
    } catch (error) {
      console.error(`Failed to retrieve context for session ${sessionId}:`, error);
      return [];
    }
  }

  /**
   * Create new context
   */
  async createContext(sessionId) {
    const context = {
      id: sessionId,
      entries: [],
      summary: null,
      totalTokens: 0,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      compressionCount: 0,
      strategy: this.currentStrategy,
    };

    this.contexts.set(sessionId, context);
    this.metrics.totalContexts++;

    return context;
  }

  /**
   * Compress context using configured strategy
   */
  async compressContext(sessionId) {
    const startTime = Date.now();

    try {
      const context = this.contexts.get(sessionId);
      if (!context || context.entries.length < this.summarizationThreshold) {
        return;
      }

      const strategy = this.compressionStrategies[this.currentStrategy];
      if (!strategy) {
        throw new Error(`Unknown compression strategy: ${this.currentStrategy}`);
      }

      const result = await strategy(context);

      // Update context with compressed data
      context.entries = result.entries;
      context.summary = result.summary;
      context.compressionCount++;
      context.lastUpdated = Date.now();

      // Update metrics
      this.metrics.compressedContexts++;
      if (result.summary) {
        this.metrics.summarizedContexts++;
      }
      this.metrics.compressionTime += Date.now() - startTime;

      // Calculate compression ratio
      const originalSize = result.originalSize;
      const compressedSize = context.totalTokens;
      const ratio = compressedSize / originalSize;
      this.metrics.avgCompressionRatio =
        (this.metrics.avgCompressionRatio * (this.metrics.compressedContexts - 1) + ratio) /
        this.metrics.compressedContexts;

      this.emit('context_compressed', {
        sessionId,
        originalSize,
        compressedSize,
        compressionRatio: ratio,
        strategy: this.currentStrategy,
      });
    } catch (error) {
      console.error(`Failed to compress context for session ${sessionId}:`, error);
    }
  }

  /**
   * Compression strategies
   */
  async temporalCompression(context) {
    const entries = [...context.entries];
    const originalSize = context.totalTokens;

    // Keep most recent entries
    const recentEntries = entries.slice(-this.contextWindow);

    // Summarize older entries
    const olderEntries = entries.slice(0, -this.contextWindow);
    let summary = null;

    if (olderEntries.length > 0) {
      const summaryContent = await this.summarizeEntries(olderEntries);
      summary = {
        content: summaryContent,
        tokens: this.estimateTokens(summaryContent),
        timestamp: Date.now(),
        entryCount: olderEntries.length,
      };
    }

    // Recalculate tokens
    let totalTokens = summary ? summary.tokens : 0;
    for (const entry of recentEntries) {
      totalTokens += entry.metadata.tokens;
    }

    return {
      entries: recentEntries,
      summary,
      originalSize,
      compressedSize: totalTokens,
    };
  }

  async semanticCompression(context) {
    const entries = [...context.entries];
    const originalSize = context.totalTokens;

    // Group entries by semantic similarity
    const clusters = await this.clusterBySimilarity(entries);

    // Select representative entries from each cluster
    const representativeEntries = [];
    const summaries = [];

    for (const cluster of clusters) {
      if (cluster.length === 1) {
        representativeEntries.push(cluster[0]);
      } else {
        // Keep the most important entry from the cluster
        const mostImportant = cluster.sort((a, b) => b.importance - a.importance)[0];
        representativeEntries.push(mostImportant);

        // Summarize the rest
        const others = cluster.filter(e => e.id !== mostImportant.id);
        if (others.length > 0) {
          const summaryContent = await this.summarizeEntries(others);
          summaries.push({
            content: summaryContent,
            tokens: this.estimateTokens(summaryContent),
            timestamp: Date.now(),
            clusterSize: others.length,
          });
        }
      }
    }

    // Combine summaries
    let summary = null;
    if (summaries.length > 0) {
      const combinedSummary = summaries.map(s => s.content).join('\n\n');
      summary = {
        content: combinedSummary,
        tokens: this.estimateTokens(combinedSummary),
        timestamp: Date.now(),
        entryCount: summaries.reduce((sum, s) => sum + s.clusterSize, 0),
      };
    }

    // Sort by importance and recency
    representativeEntries.sort((a, b) => {
      const scoreA = a.importance * 0.5 + (Date.now() - a.metadata.timestamp) / 1000000;
      const scoreB = b.importance * 0.5 + (Date.now() - b.metadata.timestamp) / 1000000;
      return scoreB - scoreA;
    });

    // Calculate compressed size
    let totalTokens = summary ? summary.tokens : 0;
    for (const entry of representativeEntries) {
      totalTokens += entry.metadata.tokens;
    }

    return {
      entries: representativeEntries,
      summary,
      originalSize,
      compressedSize: totalTokens,
    };
  }

  async importanceBasedCompression(context) {
    const entries = [...context.entries];
    const originalSize = context.totalTokens;

    // Sort by importance
    entries.sort((a, b) => b.importance - a.importance);

    // Select top entries within token limit
    const selectedEntries = [];
    let totalTokens = 0;
    const maxTokens = this.maxContextTokens * 0.6; // Keep 60% for important entries

    for (const entry of entries) {
      if (totalTokens + entry.metadata.tokens > maxTokens) {
        break;
      }
      selectedEntries.push(entry);
      totalTokens += entry.metadata.tokens;
    }

    // Summarize remaining entries
    const remainingEntries = entries.slice(selectedEntries.length);
    let summary = null;

    if (remainingEntries.length > 0) {
      const summaryContent = await this.summarizeEntries(remainingEntries);
      summary = {
        content: summaryContent,
        tokens: this.estimateTokens(summaryContent),
        timestamp: Date.now(),
        entryCount: remainingEntries.length,
      };
    }

    return {
      entries: selectedEntries,
      summary,
      originalSize,
      compressedSize: totalTokens + (summary ? summary.tokens : 0),
    };
  }

  async hybridCompression(context) {
    // Combine multiple strategies for optimal compression
    const temporal = await this.temporalCompression(context);
    const semantic = await this.semanticCompression(context);
    const importance = await this.importanceBasedCompression(context);

    // Choose the best result based on compression ratio and information preservation
    const strategies = [
      { name: 'temporal', result: temporal },
      { name: 'semantic', result: semantic },
      { name: 'importance', result: importance },
    ];

    strategies.sort((a, b) => {
      const scoreA = this.evaluateCompressionResult(a.result);
      const scoreB = this.evaluateCompressionResult(b.result);
      return scoreB - scoreA;
    });

    return strategies[0].result;
  }

  /**
   * Utility methods
   */
  shouldCompress(context) {
    const utilization = context.totalTokens / this.maxContextTokens;
    return (
      utilization >= this.compressionThreshold ||
      context.entries.length >= this.summarizationThreshold
    );
  }

  calculateImportance(content, metadata) {
    let importance = 0.5; // Base importance

    // Boost based on metadata
    if (metadata.type === 'error' || metadata.type === 'critical') {
      importance += 0.3;
    }
    if (metadata.type === 'user_input') {
      importance += 0.2;
    }
    if (metadata.pinned) {
      importance += 0.4;
    }

    // Boost based on content characteristics
    const contentLower = content.toLowerCase();
    if (contentLower.includes('error') || contentLower.includes('failed')) {
      importance += 0.2;
    }
    if (contentLower.includes('important') || contentLower.includes('critical')) {
      importance += 0.2;
    }

    // Boost based on length (longer content might be more important)
    const length = content.length;
    if (length > 500) {
      importance += 0.1;
    }

    return Math.min(1.0, importance);
  }

  async generateEmbedding(content) {
    // Simple embedding simulation - in production, use actual embedding model
    const words = content.toLowerCase().split(/\s+/);
    const embedding = new Array(128).fill(0);

    // Create simple word-based embedding
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < Math.min(word.length, embedding.length); j++) {
        embedding[j] += word.charCodeAt(j) / 1000;
      }
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  calculateRelevance(entry, query, queryEmbedding) {
    if (!entry.embedding) {
      return 0.5; // Default relevance
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < Math.min(entry.embedding.length, queryEmbedding.length); i++) {
      dotProduct += entry.embedding[i] * queryEmbedding[i];
      magnitudeA += entry.embedding[i] * entry.embedding[i];
      magnitudeB += queryEmbedding[i] * queryEmbedding[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    const similarity = dotProduct / (magnitudeA * magnitudeB);

    // Boost by importance and recency
    const recencyBoost = Math.max(
      0,
      1 - (Date.now() - entry.metadata.timestamp) / (24 * 60 * 60 * 1000)
    );

    return similarity * 0.7 + entry.importance * 0.2 + recencyBoost * 0.1;
  }

  updateIndex(entry) {
    const words = entry.content.toLowerCase().split(/\s+/);

    for (const word of words) {
      if (word.length > 2) {
        // Skip very short words
        if (!this.index.has(word)) {
          this.index.set(word, new Set());
        }
        this.index.get(word).add(entry.id);
      }
    }
  }

  async clusterBySimilarity(entries) {
    // Simple clustering based on embedding similarity
    const clusters = [];
    const used = new Set();

    for (let i = 0; i < entries.length; i++) {
      if (used.has(entries[i].id)) continue;

      const cluster = [entries[i]];
      used.add(entries[i].id);

      for (let j = i + 1; j < entries.length; j++) {
        if (used.has(entries[j].id)) continue;

        const similarity = this.calculateSimilarity(entries[i], entries[j]);
        if (similarity > 0.7) {
          // High similarity threshold
          cluster.push(entries[j]);
          used.add(entries[j].id);
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  calculateSimilarity(entry1, entry2) {
    if (!entry1.embedding || !entry2.embedding) {
      return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < Math.min(entry1.embedding.length, entry2.embedding.length); i++) {
      dotProduct += entry1.embedding[i] * entry2.embedding[i];
      magnitudeA += entry1.embedding[i] * entry1.embedding[i];
      magnitudeB += entry2.embedding[i] * entry2.embedding[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  async summarizeEntries(entries) {
    // Simple summarization - in production, use actual summarization model
    const contents = entries.map(e => e.content);
    const totalLength = contents.reduce((sum, content) => sum + content.length, 0);

    if (totalLength < 200) {
      return contents.join(' ');
    }

    // Extract key sentences
    const sentences = contents
      .join(' ')
      .split(/[.!?]+/)
      .filter(s => s.trim().length > 0);
    const keySentences = sentences.slice(0, Math.min(5, sentences.length));

    return `Summary of ${entries.length} entries: ${keySentences.join('. ')}.`;
  }

  evaluateCompressionResult(result) {
    const compressionRatio = result.compressedSize / result.originalSize;
    const informationRetention = this.estimateInformationRetention(result);

    // Balance compression and information preservation
    return (1 - compressionRatio) * 0.6 + informationRetention * 0.4;
  }

  estimateInformationRetention(result) {
    // Simple heuristic based on number of entries preserved
    const preservedEntries = result.entries.length;
    const totalEntries = preservedEntries + (result.summary ? result.summary.entryCount : 0);

    return Math.min(1.0, preservedEntries / Math.max(1, totalEntries * 0.3));
  }

  estimateTokens(text) {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  updateMetrics(startTime) {
    const duration = Date.now() - startTime;
    // Update average context size, etc.
  }

  /**
   * Storage operations
   */
  async saveContext(sessionId) {
    try {
      const context = this.contexts.get(sessionId);
      if (!context) return;

      const filePath = path.join(this.storageDir, `${sessionId}.json`);
      await fs.writeFile(filePath, JSON.stringify(context, null, 2));
    } catch (error) {
      console.error(`Failed to save context for session ${sessionId}:`, error);
    }
  }

  async loadContexts() {
    try {
      const files = await fs.readdir(this.storageDir);
      const contextFiles = files.filter(file => file.endsWith('.json'));

      for (const file of contextFiles) {
        try {
          const sessionId = file.replace('.json', '');
          const filePath = path.join(this.storageDir, file);
          const data = await fs.readFile(filePath, 'utf8');
          const context = JSON.parse(data);

          this.contexts.set(sessionId, context);
          this.metrics.totalContexts++;
          this.metrics.totalEntries += context.entries.length;
        } catch (error) {
          console.error(`Failed to load context file ${file}:`, error);
        }
      }

      console.log(`Loaded ${this.contexts.size} contexts from storage`);
    } catch (error) {
      console.error('Failed to load contexts:', error);
    }
  }

  /**
   * Public API methods
   */
  getContextStats(sessionId) {
    const context = this.contexts.get(sessionId);
    if (!context) return null;

    return {
      sessionId,
      entryCount: context.entries.length,
      totalTokens: context.totalTokens,
      hasSummary: !!context.summary,
      compressionCount: context.compressionCount,
      lastUpdated: context.lastUpdated,
      utilization: context.totalTokens / this.maxContextTokens,
    };
  }

  getAllStats() {
    return {
      ...this.metrics,
      activeContexts: this.contexts.size,
      avgEntriesPerContext: this.metrics.totalEntries / Math.max(1, this.metrics.totalContexts),
      avgContextSize:
        this.metrics.totalContexts > 0
          ? Array.from(this.contexts.values()).reduce((sum, ctx) => sum + ctx.totalTokens, 0) /
            this.metrics.totalContexts
          : 0,
    };
  }

  setCompressionStrategy(strategy) {
    if (!this.compressionStrategies[strategy]) {
      throw new Error(`Unknown compression strategy: ${strategy}`);
    }

    this.currentStrategy = strategy;
    this.emit('strategy_changed', { strategy });
    console.log(`Compression strategy changed to: ${strategy}`);
  }

  async deleteContext(sessionId) {
    try {
      this.contexts.delete(sessionId);
      this.summaries.delete(sessionId);

      const filePath = path.join(this.storageDir, `${sessionId}.json`);
      await fs.unlink(filePath);

      this.emit('context_deleted', { sessionId });
    } catch (error) {
      console.error(`Failed to delete context for session ${sessionId}:`, error);
    }
  }

  async shutdown() {
    console.log('Shutting down ContextManager...');

    // Save all contexts
    for (const sessionId of this.contexts.keys()) {
      await this.saveContext(sessionId);
    }

    // Clear memory
    this.contexts.clear();
    this.summaries.clear();
    this.embeddings.clear();
    this.index.clear();

    console.log('ContextManager shutdown complete');
  }
}

export default ContextManager;
