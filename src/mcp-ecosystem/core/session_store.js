import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SessionStore {
  constructor(options = {}) {
    this.storageDir = options.storageDir || path.join(__dirname, '../../../data/sessions');
    this.maxAge = options.maxAge || 3600000; // 1 hour
    this.maxSessions = options.maxSessions || 10000;
    this.compressionEnabled = options.compression !== false;
    this.sessions = new Map();
    this.cleanupInterval = 300000; // 5 minutes
    this.compressionRatio = 0.7;

    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await this.loadSessions();
      this.startCleanupTimer();
    } catch (error) {
      console.error('Failed to initialize SessionStore:', error);
    }
  }

  async loadSessions() {
    try {
      const files = await fs.readdir(this.storageDir);
      const sessionFiles = files.filter(file => file.endsWith('.json'));

      for (const file of sessionFiles) {
        try {
          const filePath = path.join(this.storageDir, file);
          const data = await fs.readFile(filePath, 'utf8');
          const session = JSON.parse(data);

          // Skip expired sessions
          if (Date.now() - session.lastActivity > this.maxAge) {
            await fs.unlink(filePath);
            continue;
          }

          this.sessions.set(session.id, session);
        } catch (error) {
          console.error(`Failed to load session from ${file}:`, error);
        }
      }

      console.log(`Loaded ${this.sessions.size} sessions from disk`);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  async createSession(metadata = {}) {
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      data: {
        context: [],
        preferences: {},
        history: [],
        cache: {},
        ...metadata,
      },
      compressed: false,
      size: 0,
    };

    this.sessions.set(sessionId, session);
    await this.saveSession(sessionId);

    return session;
  }

  async getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (Date.now() - session.lastActivity > this.maxAge) {
      await this.removeSession(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = Date.now();
    return session;
  }

  async updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Merge updates
    if (updates.data) {
      session.data = { ...session.data, ...updates.data };
    }
    if (updates.lastActivity !== undefined) {
      session.lastActivity = updates.lastActivity;
    }

    // Check if compression is needed
    session.size = JSON.stringify(session).length;
    if (this.compressionEnabled && session.size > 100000) {
      // 100KB
      session = await this.compressSession(session);
    }

    this.sessions.set(sessionId, session);
    await this.saveSession(sessionId);

    return session;
  }

  async addContext(sessionId, context) {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const contextEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: context.type || 'user_input',
      content: context.content,
      metadata: context.metadata || {},
      tokens: this.estimateTokens(context.content),
    };

    session.data.context.push(contextEntry);

    // Compress if too large
    if (this.getContextSize(session) > 50000) {
      // 50KB
      session.data.context = await this.compressContext(session.data.context);
    }

    await this.updateSession(sessionId, { data: session.data });
    return contextEntry;
  }

  async getRelevantContext(sessionId, query, maxTokens = 4000) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return [];
    }

    // Use TF-IDF to find most relevant context
    const relevantContext = await this.rankByRelevance(session.data.context, query);

    // Return context within token limit
    let totalTokens = 0;
    const selectedContext = [];

    for (const entry of relevantContext) {
      if (totalTokens + entry.tokens > maxTokens) break;
      selectedContext.push(entry);
      totalTokens += entry.tokens;
    }

    return selectedContext;
  }

  async addToHistory(sessionId, entry) {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const historyEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...entry,
    };

    session.data.history.push(historyEntry);

    // Keep only last 100 entries
    if (session.data.history.length > 100) {
      session.data.history = session.data.history.slice(-100);
    }

    await this.updateSession(sessionId, { data: session.data });
    return historyEntry;
  }

  async getHistory(sessionId, limit = 50) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return [];
    }

    return session.data.history.slice(-limit);
  }

  async setCache(sessionId, key, value, ttl = 300000) {
    // 5 minutes default TTL
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.data.cache[key] = {
      value,
      expires: Date.now() + ttl,
      createdAt: Date.now(),
    };

    await this.updateSession(sessionId, { data: session.data });
  }

  async getCache(sessionId, key) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const cached = session.data.cache[key];
    if (!cached || Date.now() > cached.expires) {
      delete session.data.cache[key];
      await this.updateSession(sessionId, { data: session.data });
      return null;
    }

    return cached.value;
  }

  async removeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);

      try {
        const filePath = path.join(this.storageDir, `${sessionId}.json`);
        await fs.unlink(filePath);
      } catch (error) {
        console.error(`Failed to delete session file for ${sessionId}:`, error);
      }
    }
  }

  async saveSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    try {
      const filePath = path.join(this.storageDir, `${sessionId}.json`);
      await fs.writeFile(filePath, JSON.stringify(session, null, 2));
    } catch (error) {
      console.error(`Failed to save session ${sessionId}:`, error);
    }
  }

  async compressSession(session) {
    if (!this.compressionEnabled || session.compressed) {
      return session;
    }

    // Compress context
    if (session.data.context && session.data.context.length > 10) {
      session.data.context = await this.compressContext(session.data.context);
    }

    // Compress history
    if (session.data.history && session.data.history.length > 50) {
      session.data.history = session.data.history.slice(-50);
    }

    session.compressed = true;
    session.size = JSON.stringify(session).length;
    return session;
  }

  async compressContext(context) {
    // Simple compression: keep most recent entries and summarize older ones
    if (context.length <= 10) {
      return context;
    }

    const recent = context.slice(-5);
    const older = context.slice(0, -5);

    // Create summary of older entries
    const summary = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'summary',
      content: `Summary of ${older.length} previous context entries`,
      metadata: {
        originalCount: older.length,
        timeSpan: {
          start: older[0]?.timestamp,
          end: older[older.length - 1]?.timestamp,
        },
      },
      tokens: this.estimateTokens(`Summary of ${older.length} entries`),
    };

    return [...recent, summary];
  }

  async rankByRelevance(context, query) {
    if (!context || context.length === 0) {
      return [];
    }

    // Simple TF-IDF implementation
    const queryTerms = this.tokenize(query.toLowerCase());
    const scored = [];

    for (const entry of context) {
      const content = entry.content.toLowerCase();
      const terms = this.tokenize(content);

      let score = 0;
      for (const queryTerm of queryTerms) {
        if (terms.includes(queryTerm)) {
          score += 1;
        }
      }

      // Boost recent entries
      const age = Date.now() - entry.timestamp;
      const recencyBoost = Math.max(0, 1 - age / (24 * 60 * 60 * 1000)); // Decay over 24 hours
      score += recencyBoost;

      scored.push({ ...entry, score });
    }

    return scored.sort((a, b) => b.score - a.score);
  }

  tokenize(text) {
    return text.split(/\s+/).filter(word => word.length > 2);
  }

  estimateTokens(text) {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  getContextSize(session) {
    return JSON.stringify(session.data.context).length;
  }

  startCleanupTimer() {
    setInterval(async () => {
      await this.cleanupExpiredSessions();
    }, this.cleanupInterval);
  }

  async cleanupExpiredSessions() {
    const now = Date.now();
    const expired = [];

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > this.maxAge) {
        expired.push(sessionId);
      }
    }

    for (const sessionId of expired) {
      await this.removeSession(sessionId);
    }

    if (expired.length > 0) {
      console.log(`Cleaned up ${expired.length} expired sessions`);
    }
  }

  getStats() {
    return {
      totalSessions: this.sessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(
        s => Date.now() - s.lastActivity < 300000 // Active in last 5 minutes
      ).length,
      compressedSessions: Array.from(this.sessions.values()).filter(s => s.compressed).length,
      averageSessionSize:
        this.sessions.size > 0
          ? Array.from(this.sessions.values()).reduce((sum, s) => sum + s.size, 0) /
            this.sessions.size
          : 0,
    };
  }

  async shutdown() {
    console.log('Shutting down SessionStore...');

    // Save all sessions
    for (const sessionId of this.sessions.keys()) {
      await this.saveSession(sessionId);
    }

    console.log('SessionStore shutdown complete');
  }
}

export default SessionStore;
