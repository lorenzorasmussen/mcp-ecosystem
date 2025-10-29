// Database connection manager for MCP Client Bridge
// Handles SQLite database connections with proper pooling and error handling

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { performance } = require('perf_hooks');
const logger = require('./src/utils/logger');

class DatabaseManager {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.isInitialized = false;
    this.queryStats = [];
    this.maxStats = 1000; // Keep last 1000 query stats
    this.preparedStatements = new Map();
  }

  async initialize() {
    try {
      // Open database connection
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database,
      });

      // Configure database settings for better performance and reliability
      await this.db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = 10000;
        PRAGMA locking_mode = NORMAL;
        PRAGMA temp_store = MEMORY;
        PRAGMA mmap_size = 268435456;  -- 256MB memory mapping
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = 30000;   -- 30 second timeout
      `);

      console.log(`Database connection established at: ${this.dbPath}`);
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async ensureConnection() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.db;
  }

  async run(sql, params = []) {
    const startTime = performance.now();
    const db = await this.ensureConnection();
    
    try {
      const result = await db.run(sql, params);
      
      // Record query performance
      const executionTime = performance.now() - startTime;
      this.recordQueryStat(sql, executionTime);
      
      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      logger.error(`Database query failed: ${sql}`, { 
        error, 
        executionTime,
        params 
      });
      throw error;
    }
  }

  async get(sql, params = []) {
    const startTime = performance.now();
    const db = await this.ensureConnection();
    
    try {
      const result = await db.get(sql, params);
      
      // Record query performance
      const executionTime = performance.now() - startTime;
      this.recordQueryStat(sql, executionTime);
      
      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      logger.error(`Database query failed: ${sql}`, { 
        error, 
        executionTime,
        params 
      });
      throw error;
    }
  }

  async all(sql, params = []) {
    const startTime = performance.now();
    const db = await this.ensureConnection();
    
    try {
      const result = await db.all(sql, params);
      
      // Record query performance
      const executionTime = performance.now() - startTime;
      this.recordQueryStat(sql, executionTime);
      
      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      logger.error(`Database query failed: ${sql}`, { 
        error, 
        executionTime,
        params 
      });
      throw error;
    }
  }

  async exec(sql) {
    const startTime = performance.now();
    const db = await this.ensureConnection();
    
    try {
      const result = await db.exec(sql);
      
      // Record query performance
      const executionTime = performance.now() - startTime;
      this.recordQueryStat(sql, executionTime);
      
      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      logger.error(`Database query failed: ${sql}`, { 
        error, 
        executionTime
      });
      throw error;
    }
  }

  async close() {
    if (this.db) {
      await this.db.close();
      this.isInitialized = false;
      console.log('Database connection closed');
    }
    
    // Close all prepared statements
    for (const [sql, stmt] of this.preparedStatements) {
      try {
        await stmt.finalize();
      } catch (error) {
        logger.warn(`Error finalizing prepared statement: ${sql}`, error);
      }
    }
    this.preparedStatements.clear();
  }

  // Transaction helper with performance tracking
  async transaction(transactionFn) {
    const db = await this.ensureConnection();
    const startTime = performance.now();
    
    try {
      await db.exec('BEGIN TRANSACTION');
      const result = await transactionFn(db);
      await db.exec('COMMIT');
      
      const executionTime = performance.now() - startTime;
      logger.info(`Transaction completed successfully`, { executionTime });
      
      return result;
    } catch (error) {
      await db.exec('ROLLBACK');
      const executionTime = performance.now() - startTime;
      logger.error(`Transaction failed and rolled back`, { 
        error, 
        executionTime 
      });
      throw error;
    }
  }

  // Batch operations for better performance
  async batchInsert(table, columns, values) {
    if (values.length === 0) return;
    
    const placeholders = `(${columns.map(() => '?').join(',')})`;
    const valueSets = Array(values.length).fill(placeholders).join(',');
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${valueSets}`;
    
    // Flatten the values array
    const flattenedValues = values.flat();
    
    await this.run(sql, flattenedValues);
  }

  // Bulk operations with performance tracking
  async bulkInsert(table, data) {
    if (data.length === 0) return;
    
    const columns = Object.keys(data[0]);
    const values = data.map(item => columns.map(col => item[col]));
    
    await this.batchInsert(table, columns, values);
  }

  // Prepared statement support for better performance
  async prepareAndRun(sql, params = []) {
    const db = await this.ensureConnection();
    
    // Check if we already have a prepared statement for this query
    if (!this.preparedStatements.has(sql)) {
      const stmt = await db.prepare(sql);
      this.preparedStatements.set(sql, stmt);
    }
    
    const stmt = this.preparedStatements.get(sql);
    return await stmt.run(params);
  }

  // Health check
  async healthCheck() {
    try {
      const startTime = performance.now();
      const result = await this.get('SELECT 1 as test');
      const executionTime = performance.now() - startTime;
      
      logger.info(`Database health check completed`, { executionTime });
      
      return { 
        status: 'healthy', 
        message: `Database connection is healthy (query time: ${executionTime.toFixed(2)}ms)` 
      };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  // Query performance tracking
  recordQueryStat(query, executionTime) {
    this.queryStats.push({
      query: query.substring(0, 100), // Truncate long queries
      executionTime,
      timestamp: new Date()
    });
    
    // Keep only the last N stats to prevent memory issues
    if (this.queryStats.length > this.maxStats) {
      this.queryStats = this.queryStats.slice(-this.maxStats);
    }
  }

  // Get query performance statistics
  getQueryStats() {
    return [...this.queryStats]; // Return a copy to prevent external modification
  }

  // Get slow query report
  getSlowQueryReport(thresholdMs = 100) {
    return this.queryStats
      .filter(stat => stat.executionTime > thresholdMs)
      .sort((a, b) => b.executionTime - a.executionTime);
  }

  // Clear query stats
  clearQueryStats() {
    this.queryStats = [];
  }
}

module.exports = DatabaseManager;