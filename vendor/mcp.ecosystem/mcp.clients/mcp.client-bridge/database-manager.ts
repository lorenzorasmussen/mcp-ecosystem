// Database connection manager for MCP Client Bridge
// Handles SQLite database connections with proper pooling and error handling
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { performance } from 'perf_hooks';
import { Logger } from './utils/logger';

interface Migration {
  id: number;
  version: string;
  description: string;
  applied_at: string;
  applied_by: string;
}

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  message: string;
}

interface QueryStats {
  query: string;
  executionTime: number;
  timestamp: Date;
}

class DatabaseManager {
  private dbPath: string;
  private db: Database | null = null;
  private isInitialized: boolean = false;
  private queryStats: QueryStats[] = [];
  private maxStats: number = 1000; // Keep last 1000 query stats

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<boolean> {
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

  async ensureConnection(): Promise<Database> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.db!;
  }

  async run(sql: string, params: any[] = []): Promise<any> {
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
      Logger.error(`Database query failed: ${sql}`, { 
        error, 
        executionTime,
        params 
      });
      throw error;
    }
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
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
      Logger.error(`Database query failed: ${sql}`, { 
        error, 
        executionTime,
        params 
      });
      throw error;
    }
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
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
      Logger.error(`Database query failed: ${sql}`, { 
        error, 
        executionTime,
        params 
      });
      throw error;
    }
  }

  async exec(sql: string): Promise<void> {
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
      Logger.error(`Database query failed: ${sql}`, { 
        error, 
        executionTime
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.isInitialized = false;
      console.log('Database connection closed');
    }
  }

  // Transaction helper with performance tracking
  async transaction<T>(transactionFn: (db: Database) => Promise<T>): Promise<T> {
    const db = await this.ensureConnection();
    const startTime = performance.now();
    
    try {
      await db.exec('BEGIN TRANSACTION');
      const result = await transactionFn(db);
      await db.exec('COMMIT');
      
      const executionTime = performance.now() - startTime;
      Logger.info(`Transaction completed successfully`, { executionTime });
      
      return result;
    } catch (error) {
      await db.exec('ROLLBACK');
      const executionTime = performance.now() - startTime;
      Logger.error(`Transaction failed and rolled back`, { 
        error, 
        executionTime 
      });
      throw error;
    }
  }

  // Batch operations for better performance
  async batchInsert(table: string, columns: string[], values: any[][]): Promise<void> {
    if (values.length === 0) return;
    
    const placeholders = `(${columns.map(() => '?').join(',')})`;
    const valueSets = Array(values.length).fill(placeholders).join(',');
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${valueSets}`;
    
    // Flatten the values array
    const flattenedValues = values.flat();
    
    await this.run(sql, flattenedValues);
  }

  // Bulk operations with performance tracking
  async bulkInsert(table: string, data: any[]): Promise<void> {
    if (data.length === 0) return;
    
    const columns = Object.keys(data[0]);
    const values = data.map(item => columns.map(col => item[col]));
    
    await this.batchInsert(table, columns, values);
  }

  // Prepared statement support for better performance
  private preparedStatements = new Map<string, any>();
  
  async prepareAndRun(sql: string, params: any[] = []): Promise<any> {
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
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const startTime = performance.now();
      const result = await this.get('SELECT 1 as test');
      const executionTime = performance.now() - startTime;
      
      Logger.info(`Database health check completed`, { executionTime });
      
      return { 
        status: 'healthy', 
        message: `Database connection is healthy (query time: ${executionTime.toFixed(2)}ms)` 
      };
    } catch (error: any) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  // Migration methods
  async hasMigration(version: string): Promise<boolean> {
    const result = await this.get<Migration>(
      'SELECT * FROM schema_migrations WHERE version = ?',
      [version]
    );
    return !!result;
  }

  async recordMigration(version: string, description: string): Promise<void> {
    await this.run(
      'INSERT INTO schema_migrations (version, description, applied_by) VALUES (?, ?, ?)',
      [version, description, 'system']
    );
  }

  async getAppliedMigrations(): Promise<Migration[]> {
    return await this.all<Migration>(
      'SELECT * FROM schema_migrations ORDER BY id ASC'
    );
  }

  // Query performance tracking
  private recordQueryStat(query: string, executionTime: number): void {
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
  getQueryStats(): QueryStats[] {
    return [...this.queryStats]; // Return a copy to prevent external modification
  }

  // Get slow query report
  getSlowQueryReport(thresholdMs: number = 100): QueryStats[] {
    return this.queryStats
      .filter(stat => stat.executionTime > thresholdMs)
      .sort((a, b) => b.executionTime - a.executionTime);
  }

  // Clear query stats
  clearQueryStats(): void {
    this.queryStats = [];
  }
}

export default DatabaseManager;