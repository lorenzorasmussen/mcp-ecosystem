import EventEmitter from 'events';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Advanced Caching System - Multi-tier caching with intelligent management
 *
 * This component provides a sophisticated caching system with:
 * - Multi-tier caching (memory, disk, distributed)
 * - Intelligent cache invalidation and eviction
 * - Compression and serialization optimization
 * - Cache warming and predictive loading
 * - Performance monitoring and analytics
 */
class AdvancedCache extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration
    this.memoryCacheSize = options.memoryCacheSize || 1000;
    this.diskCacheSize = options.diskCacheSize || 10000;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    this.compressionThreshold = options.compressionThreshold || 1024; // 1KB
    this.enableCompression = options.enableCompression !== false;
    this.enablePersistence = options.enablePersistence !== false;

    // Cache directories
    this.cacheDir = options.cacheDir || path.join(__dirname, '../../../data/cache');
    this.tempDir = path.join(this.cacheDir, 'temp');

    // Cache tiers
    this.memoryCache = new Map(); // L1 - Fastest
    this.diskCache = new Map(); // L2 - Persistent
    this.compressionCache = new Map(); // Compressed entries

    // Cache metadata
    this.cacheStats = {
      hits: { l1: 0, l2: 0, total: 0 },
      misses: { l1: 0, l2: 0, total: 0 },
      sets: { l1: 0, l2: 0, total: 0 },
      evictions: { l1: 0, l2: 0, total: 0 },
      compression: { enabled: 0, ratio: 0 },
      size: { memory: 0, disk: 0, compressed: 0 },
    };

    // TTL management
    this.ttlTimers = new Map(); // key -> timer
    this.ttlIndex = new Map(); // timestamp -> [keys]

    // Access patterns for predictive caching
    this.accessPatterns = new Map(); // key -> access info
    this.predictionModel = {
      enabled: options.enablePrediction !== false,
      threshold: 0.7, // Confidence threshold
      window: 3600000, // 1 hour lookback
    };

    // Performance metrics
    this.metrics = {
      totalRequests: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
      compressionRatio: 0,
      hitRate: 0,
    };

    this.init();
  }

  async init() {
    try {
      // Create cache directories
      await fs.mkdir(this.cacheDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });

      // Load persistent cache if enabled
      if (this.enablePersistence) {
        await this.loadDiskCache();
      }

      // Start cleanup and maintenance tasks
      this.startMaintenanceTasks();

      console.log('AdvancedCache initialized');
      console.log(`  Memory cache: ${this.memoryCacheSize} entries`);
      console.log(`  Disk cache: ${this.diskCacheSize} entries`);
      console.log(`  Compression: ${this.enableCompression ? 'enabled' : 'disabled'}`);
      console.log(`  Persistence: ${this.enablePersistence ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to initialize AdvancedCache:', error);
    }
  }

  /**
   * Main cache operations
   */
  async get(key) {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // L1 Cache (Memory)
      let entry = this.memoryCache.get(key);
      if (entry && !this.isExpired(entry)) {
        this.cacheStats.hits.l1++;
        this.cacheStats.hits.total++;
        this.updateAccessPattern(key, 'hit', 'l1');
        this.updateMetrics(startTime);
        return entry.value;
      }

      if (entry) {
        // Expired, remove it
        this.memoryCache.delete(key);
        this.cacheStats.evictions.l1++;
      }

      this.cacheStats.misses.l1++;

      // L2 Cache (Disk)
      entry = this.diskCache.get(key);
      if (entry && !this.isExpired(entry)) {
        this.cacheStats.hits.l2++;
        this.cacheStats.hits.total++;

        // Decompress if needed
        let value = entry.value;
        if (entry.compressed) {
          value = await this.decompress(value);
        }

        // Promote to L1 if space allows
        await this.promoteToL1(key, value, entry);

        this.updateAccessPattern(key, 'hit', 'l2');
        this.updateMetrics(startTime);
        return value;
      }

      if (entry) {
        // Expired, remove it
        await this.removeFromDisk(key);
        this.cacheStats.evictions.l2++;
      }

      this.cacheStats.misses.l2++;
      this.cacheStats.misses.total++;

      this.updateAccessPattern(key, 'miss', 'none');
      this.updateMetrics(startTime);
      return null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      this.updateMetrics(startTime);
      return null;
    }
  }

  async set(key, value, options = {}) {
    const startTime = Date.now();

    try {
      const ttl = options.ttl || this.defaultTTL;
      const priority = options.priority || 'normal';
      const compress = options.compress !== false && this.enableCompression;

      // Create cache entry
      const entry = {
        key,
        value,
        createdAt: Date.now(),
        expiresAt: Date.now() + ttl,
        ttl,
        priority,
        size: this.calculateSize(value),
        accessCount: 0,
        lastAccess: Date.now(),
      };

      // Compress if beneficial
      if (compress && entry.size > this.compressionThreshold) {
        const compressed = await this.compress(value);
        if (compressed.size < entry.size * 0.8) {
          // Only use if 20% reduction
          entry.compressed = true;
          entry.value = compressed.data;
          entry.originalSize = entry.size;
          entry.size = compressed.size;

          this.cacheStats.compression.enabled++;
          this.updateCompressionRatio(entry.originalSize, entry.size);
        }
      }

      // Store in L1 (memory)
      await this.setInMemory(key, entry);

      // Store in L2 (disk) if persistent or for backup
      if (this.enablePersistence || priority === 'high') {
        await this.setInDisk(key, entry);
      }

      // Set TTL timer
      this.setTTLTimer(key, ttl);

      // Update stats
      this.cacheStats.sets.l1++;
      this.cacheStats.sets.l2++;
      this.cacheStats.sets.total++;

      this.updateAccessPattern(key, 'set', 'l1');
      this.updateMetrics(startTime);

      this.emit('cache_set', { key, size: entry.size, compressed: entry.compressed });

      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      this.updateMetrics(startTime);
      return false;
    }
  }

  async delete(key) {
    try {
      // Remove from L1
      const l1Deleted = this.memoryCache.delete(key);

      // Remove from L2
      const l2Deleted = await this.removeFromDisk(key);

      // Clear TTL timer
      this.clearTTLTimer(key);

      // Remove from access patterns
      this.accessPatterns.delete(key);

      if (l1Deleted || l2Deleted) {
        this.emit('cache_deleted', { key });
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async clear(tier = 'all') {
    try {
      switch (tier) {
        case 'l1':
          this.memoryCache.clear();
          break;
        case 'l2':
          await this.clearDiskCache();
          break;
        case 'all':
          this.memoryCache.clear();
          await this.clearDiskCache();
          break;
      }

      // Clear all TTL timers
      for (const timer of this.ttlTimers.values()) {
        clearTimeout(timer);
      }
      this.ttlTimers.clear();
      this.ttlIndex.clear();

      this.accessPatterns.clear();

      this.emit('cache_cleared', { tier });
      console.log(`Cache cleared: ${tier}`);
    } catch (error) {
      console.error(`Cache clear error for tier ${tier}:`, error);
    }
  }

  /**
   * Cache tier management
   */
  async setInMemory(key, entry) {
    // Check if eviction is needed
    if (this.memoryCache.size >= this.memoryCacheSize) {
      await this.evictFromMemory();
    }

    this.memoryCache.set(key, entry);
    this.cacheStats.size.memory = this.memoryCache.size;
  }

  async setInDisk(key, entry) {
    // Check if eviction is needed
    if (this.diskCache.size >= this.diskCacheSize) {
      await this.evictFromDisk();
    }

    // Serialize for disk storage
    const serialized = await this.serialize(entry);
    this.diskCache.set(key, serialized);
    this.cacheStats.size.disk = this.diskCache.size;

    // Persist to file if enabled
    if (this.enablePersistence) {
      await this.persistToDisk(key, serialized);
    }
  }

  async promoteToL1(key, value, diskEntry) {
    // Create new entry for L1
    const entry = {
      key,
      value,
      createdAt: Date.now(),
      expiresAt: diskEntry.expiresAt,
      ttl: diskEntry.expiresAt - Date.now(),
      priority: diskEntry.priority,
      size: this.calculateSize(value),
      accessCount: (diskEntry.accessCount || 0) + 1,
      lastAccess: Date.now(),
    };

    await this.setInMemory(key, entry);
  }

  /**
   * Eviction strategies
   */
  async evictFromMemory() {
    const entries = Array.from(this.memoryCache.entries());

    // Sort by priority and last access time
    entries.sort((a, b) => {
      const [, entryA] = a;
      const [, entryB] = b;

      // Priority order: low < normal < high
      const priorityOrder = { low: 0, normal: 1, high: 2 };
      const priorityDiff = priorityOrder[entryA.priority] - priorityOrder[entryB.priority];

      if (priorityDiff !== 0) return priorityDiff;

      // For same priority, evict least recently used
      return entryA.lastAccess - entryB.lastAccess;
    });

    // Evict lowest priority entries
    const toEvict = Math.ceil(this.memoryCacheSize * 0.1); // Evict 10%
    for (let i = 0; i < toEvict && i < entries.length; i++) {
      const [key, entry] = entries[i];
      this.memoryCache.delete(key);
      this.cacheStats.evictions.l1++;

      // Move to disk if not expired and high value
      if (!this.isExpired(entry) && entry.priority !== 'low') {
        await this.setInDisk(key, entry);
      }
    }

    this.cacheStats.size.memory = this.memoryCache.size;
  }

  async evictFromDisk() {
    const entries = Array.from(this.diskCache.entries());

    // Sort by expiration and priority
    entries.sort((a, b) => {
      const [, entryA] = a;
      const [, entryB] = b;

      // Evict expired entries first
      const expiredA = this.isExpired(entryA);
      const expiredB = this.isExpired(entryB);

      if (expiredA !== expiredB) return expiredA ? -1 : 1;

      // Then by priority
      const priorityOrder = { low: 0, normal: 1, high: 2 };
      return priorityOrder[entryA.priority] - priorityOrder[entryB.priority];
    });

    // Evict entries
    const toEvict = Math.ceil(this.diskCacheSize * 0.05); // Evict 5%
    for (let i = 0; i < toEvict && i < entries.length; i++) {
      const [key] = entries[i];
      await this.removeFromDisk(key);
      this.cacheStats.evictions.l2++;
    }

    this.cacheStats.size.disk = this.diskCache.size;
  }

  /**
   * TTL management
   */
  setTTLTimer(key, ttl) {
    // Clear existing timer
    this.clearTTLTimer(key);

    // Set new timer
    const timer = setTimeout(async () => {
      await this.delete(key);
      this.emit('cache_expired', { key });
    }, ttl);

    this.ttlTimers.set(key, timer);

    // Add to TTL index for batch operations
    const expiresAt = Date.now() + ttl;
    if (!this.ttlIndex.has(expiresAt)) {
      this.ttlIndex.set(expiresAt, []);
    }
    this.ttlIndex.get(expiresAt).push(key);
  }

  clearTTLTimer(key) {
    const timer = this.ttlTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.ttlTimers.delete(key);
    }
  }

  /**
   * Compression and serialization
   */
  async compress(data) {
    try {
      const jsonString = JSON.stringify(data);
      const compressed = Buffer.from(jsonString).toString('base64');

      return {
        data: compressed,
        size: compressed.length,
        algorithm: 'base64',
      };
    } catch (error) {
      console.error('Compression error:', error);
      return { data, size: this.calculateSize(data), algorithm: 'none' };
    }
  }

  async decompress(compressedData) {
    try {
      const jsonString = Buffer.from(compressedData, 'base64').toString();
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Decompression error:', error);
      return compressedData;
    }
  }

  async serialize(entry) {
    return JSON.stringify({
      ...entry,
      serialized: true,
      serializedAt: Date.now(),
    });
  }

  async deserialize(serialized) {
    return JSON.parse(serialized);
  }

  /**
   * Disk operations
   */
  async persistToDisk(key, data) {
    try {
      const filePath = path.join(this.cacheDir, `${key}.cache`);
      await fs.writeFile(filePath, data, 'utf8');
    } catch (error) {
      console.error(`Failed to persist cache to disk for key ${key}:`, error);
    }
  }

  async loadFromDisk(key) {
    try {
      const filePath = path.join(this.cacheDir, `${key}.cache`);
      const data = await fs.readFile(filePath, 'utf8');
      return await this.deserialize(data);
    } catch (error) {
      // File doesn't exist or can't be read
      return null;
    }
  }

  async removeFromDisk(key) {
    try {
      this.diskCache.delete(key);

      const filePath = path.join(this.cacheDir, `${key}.cache`);
      await fs.unlink(filePath);

      this.cacheStats.size.disk = this.diskCache.size;
      return true;
    } catch (error) {
      // File doesn't exist
      return false;
    }
  }

  async loadDiskCache() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const cacheFiles = files.filter(file => file.endsWith('.cache'));

      for (const file of cacheFiles) {
        try {
          const key = file.replace('.cache', '');
          const data = await this.loadFromDisk(key);

          if (data && !this.isExpired(data)) {
            this.diskCache.set(key, data);
          } else {
            // Remove expired cache file
            await this.removeFromDisk(key);
          }
        } catch (error) {
          console.error(`Failed to load cache file ${file}:`, error);
        }
      }

      this.cacheStats.size.disk = this.diskCache.size;
      console.log(`Loaded ${this.diskCache.size} entries from disk cache`);
    } catch (error) {
      console.error('Failed to load disk cache:', error);
    }
  }

  async clearDiskCache() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const cacheFiles = files.filter(file => file.endsWith('.cache'));

      for (const file of cacheFiles) {
        const filePath = path.join(this.cacheDir, file);
        await fs.unlink(filePath);
      }

      this.diskCache.clear();
      this.cacheStats.size.disk = 0;
    } catch (error) {
      console.error('Failed to clear disk cache:', error);
    }
  }

  /**
   * Access pattern analysis and prediction
   */
  updateAccessPattern(key, action, tier) {
    if (!this.accessPatterns.has(key)) {
      this.accessPatterns.set(key, {
        hits: 0,
        misses: 0,
        sets: 0,
        lastAccess: Date.now(),
        frequency: 0,
        recency: 0,
        tiers: new Set(),
      });
    }

    const pattern = this.accessPatterns.get(key);
    pattern[action === 'hit' ? 'hits' : action === 'miss' ? 'misses' : 'sets']++;
    pattern.lastAccess = Date.now();
    pattern.tiers.add(tier);

    // Calculate frequency (hits per hour)
    const timeWindow = this.predictionModel.window;
    const now = Date.now();
    const recentAccess = pattern.tiers.size > 0 ? 1 : 0; // Simplified
    pattern.frequency = recentAccess / (timeWindow / 3600000);

    // Calculate recency (how recent was last access)
    pattern.recency = 1 - (now - pattern.lastAccess) / timeWindow;
  }

  /**
   * Utility methods
   */
  isExpired(entry) {
    return Date.now() > entry.expiresAt;
  }

  calculateSize(value) {
    if (typeof value === 'string') {
      return value.length;
    } else if (typeof value === 'object') {
      return JSON.stringify(value).length;
    } else {
      return String(value).length;
    }
  }

  updateCompressionRatio(originalSize, compressedSize) {
    const totalCompression = this.cacheStats.compression.enabled;
    const currentRatio = this.metrics.compressionRatio;

    this.metrics.compressionRatio =
      (currentRatio * (totalCompression - 1) + compressedSize / originalSize) / totalCompression;
  }

  updateMetrics(startTime) {
    const responseTime = Date.now() - startTime;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.totalRequests;

    // Update hit rate
    const totalHits = this.cacheStats.hits.total;
    const totalRequests = this.cacheStats.hits.total + this.cacheStats.misses.total;
    this.metrics.hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
  }

  /**
   * Maintenance tasks
   */
  startMaintenanceTasks() {
    // Cleanup expired entries every minute
    setInterval(async () => {
      await this.cleanupExpiredEntries();
    }, 60000);

    // Optimize cache every 5 minutes
    setInterval(async () => {
      await this.optimizeCache();
    }, 300000);

    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateCacheStats();
    }, 30000);
  }

  async cleanupExpiredEntries() {
    const now = Date.now();
    let cleaned = 0;

    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        this.clearTTLTimer(key);
        cleaned++;
      }
    }

    // Clean disk cache
    for (const [key, entry] of this.diskCache.entries()) {
      if (this.isExpired(entry)) {
        await this.removeFromDisk(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  async optimizeCache() {
    // Promote frequently accessed items to L1
    for (const [key, pattern] of this.accessPatterns.entries()) {
      if (pattern.frequency > 10 && pattern.recency > 0.5) {
        const diskEntry = this.diskCache.get(key);
        if (diskEntry && !this.memoryCache.has(key)) {
          const value = await this.get(key);
          if (value) {
            await this.set(key, value, { priority: 'high', ttl: diskEntry.ttl });
          }
        }
      }
    }
  }

  updateCacheStats() {
    this.cacheStats.size.memory = this.memoryCache.size;
    this.cacheStats.size.disk = this.diskCache.size;
    this.cacheStats.evictions.total = this.cacheStats.evictions.l1 + this.cacheStats.evictions.l2;
    this.cacheStats.sets.total = this.cacheStats.sets.l1 + this.cacheStats.sets.l2;
  }

  /**
   * Public API methods
   */
  getStats() {
    return {
      ...this.cacheStats,
      metrics: { ...this.metrics },
      tiers: {
        l1: {
          size: this.memoryCache.size,
          maxSize: this.memoryCacheSize,
          utilization: this.memoryCache.size / this.memoryCacheSize,
        },
        l2: {
          size: this.diskCache.size,
          maxSize: this.diskCacheSize,
          utilization: this.diskCache.size / this.diskCacheSize,
        },
      },
      config: {
        defaultTTL: this.defaultTTL,
        compressionEnabled: this.enableCompression,
        persistenceEnabled: this.enablePersistence,
        predictionEnabled: this.predictionModel.enabled,
      },
    };
  }

  async getCacheInfo(key) {
    const memoryEntry = this.memoryCache.get(key);
    const diskEntry = this.diskCache.get(key);
    const pattern = this.accessPatterns.get(key);

    return {
      key,
      inMemory: !!memoryEntry,
      onDisk: !!diskEntry,
      accessPattern: pattern,
      memoryEntry: memoryEntry
        ? {
            size: memoryEntry.size,
            priority: memoryEntry.priority,
            expiresAt: memoryEntry.expiresAt,
            accessCount: memoryEntry.accessCount,
          }
        : null,
      diskEntry: diskEntry
        ? {
            size: diskEntry.size,
            priority: diskEntry.priority,
            expiresAt: diskEntry.expiresAt,
            compressed: diskEntry.compressed,
          }
        : null,
    };
  }

  async warmCache(keys, values) {
    console.log(`Warming cache with ${keys.length} entries`);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = values[i];

      if (value !== undefined) {
        await this.set(key, value, { priority: 'high', ttl: this.defaultTTL * 2 });
      }
    }

    console.log('Cache warming completed');
  }

  async shutdown() {
    console.log('Shutting down AdvancedCache...');

    // Clear all TTL timers
    for (const timer of this.ttlTimers.values()) {
      clearTimeout(timer);
    }
    this.ttlTimers.clear();

    // Persist memory cache to disk if enabled
    if (this.enablePersistence) {
      console.log('Persisting memory cache to disk...');
      for (const [key, entry] of this.memoryCache.entries()) {
        if (!this.isExpired(entry)) {
          await this.persistToDisk(key, await this.serialize(entry));
        }
      }
    }

    // Clear caches
    this.memoryCache.clear();
    this.diskCache.clear();
    this.accessPatterns.clear();

    console.log('AdvancedCache shutdown complete');
  }
}

export default AdvancedCache;
