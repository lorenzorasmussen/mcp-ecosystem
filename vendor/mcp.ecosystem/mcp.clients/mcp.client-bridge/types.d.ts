// TypeScript type definitions for MCP Client Bridge storage

interface ClientConnection {
  id: number;
  client_id: string;
  client_name: string;
  connection_string: string;
  connection_type: string; // 'websocket', 'http', 'tcp', etc.
  status: string; // 'active', 'inactive', 'disconnected'
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  last_connected_at?: string; // ISO date string
  metadata?: string; // JSON string
}

interface ClientSession {
  id: number;
  session_id: string;
  client_id: string;
  connection_id?: number;
  started_at: string; // ISO date string
  ended_at?: string; // ISO date string
  status: string; // 'active', 'ended', 'error'
  metadata?: string; // JSON string
}

interface BridgeMessage {
  id: number;
  session_id: string;
  message_id: string;
  message_type: string; // 'request', 'response', 'notification'
  direction: string; // 'inbound', 'outbound'
  content: string; // JSON string
  timestamp: string; // ISO date string
  status: string; // 'received', 'processing', 'processed', 'error'
  error_message?: string;
}

interface SchemaMigration {
  id: number;
  version: string;
  description: string;
  applied_at: string; // ISO date string
  applied_by: string;
}

interface DatabaseConfig {
  path: string;
  options: {
    journalMode: string;
    synchronous: string;
    cacheSize: number;
    lockingMode: string;
    tempStore: string;
  };
}

interface MigrationConfig {
  autoRun: boolean;
  directory: string;
}

interface LoggingConfig {
  level: string;
  file: string;
}

interface PerformanceConfig {
  connectionTimeout: number;
  maxRetries: number;
  retryDelay: number;
}

interface AppConfig {
  database: DatabaseConfig;
  migrations: MigrationConfig;
  logging: LoggingConfig;
  performance: PerformanceConfig;
}