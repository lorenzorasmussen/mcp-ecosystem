/**
 * Database connection manager for Rube MCP Server
 * Handles database connections and initialization
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger').logger;

class DatabaseManager {
  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
    this.isConnected = false;
  }

  async connect() {
    try {
      await this.prisma.$connect();
      this.isConnected = true;
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      logger.info('Database disconnected');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  // Migration runner - in production, this would be separate
  async runMigrations() {
    // In a real implementation, this would run Prisma migrations
    // For now we'll just log that this would happen
    logger.info('Running database migrations...');
    // This would typically be done via `prisma migrate deploy` command
  }

  // Health check for the database
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }
}

// Singleton instance
const dbManager = new DatabaseManager();

module.exports = {
  dbManager,
  prisma: dbManager.prisma, // Export prisma client directly for use in services
};