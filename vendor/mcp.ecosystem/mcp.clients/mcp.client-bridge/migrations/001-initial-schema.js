// Migration: Initialize MCP Client Bridge Schema
// Version: 001-initial-schema
// Description: Creates the initial database schema for MCP client bridge

module.exports = {
  version: '001-initial-schema',
  description: 'Creates the initial database schema for MCP client bridge',
  
  up: async (db) => {
    // Create client connections table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS client_connections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id TEXT UNIQUE NOT NULL,
          client_name TEXT NOT NULL,
          connection_string TEXT NOT NULL,
          connection_type TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_connected_at DATETIME,
          metadata TEXT
      );
    `);

    // Create client sessions table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS client_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT UNIQUE NOT NULL,
          client_id TEXT NOT NULL,
          connection_id INTEGER,
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          ended_at DATETIME,
          status TEXT DEFAULT 'active',
          metadata TEXT,
          FOREIGN KEY (client_id) REFERENCES client_connections(client_id) ON DELETE CASCADE,
          FOREIGN KEY (connection_id) REFERENCES client_connections(id) ON DELETE SET NULL
      );
    `);

    // Create bridge messages table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bridge_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          message_id TEXT NOT NULL,
          message_type TEXT NOT NULL,
          direction TEXT NOT NULL,
          content TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'processed',
          error_message TEXT,
          FOREIGN KEY (session_id) REFERENCES client_sessions(session_id) ON DELETE CASCADE
      );
    `);

    // Create indexes
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_client_connections_client_id ON client_connections(client_id);
      CREATE INDEX IF NOT EXISTS idx_client_connections_status ON client_connections(status);
      CREATE INDEX IF NOT EXISTS idx_client_sessions_client_id ON client_sessions(client_id);
      CREATE INDEX IF NOT EXISTS idx_client_sessions_session_id ON client_sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_client_sessions_status ON client_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_bridge_messages_session_id ON bridge_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_bridge_messages_timestamp ON bridge_messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_bridge_messages_status ON bridge_messages(status);
    `);

    // Create schema migrations table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version TEXT UNIQUE NOT NULL,
          description TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          applied_by TEXT DEFAULT 'system'
      );
    `);

    // Record this migration
    await db.run(
      'INSERT INTO schema_migrations (version, description, applied_by) VALUES (?, ?, ?)',
      ['001-initial-schema', 'Initial schema for MCP client bridge', 'migration-script']
    );
  },

  down: async (db) => {
    // Remove indexes first
    await db.exec(`
      DROP INDEX IF EXISTS idx_client_connections_client_id;
      DROP INDEX IF EXISTS idx_client_connections_status;
      DROP INDEX IF EXISTS idx_client_sessions_client_id;
      DROP INDEX IF EXISTS idx_client_sessions_session_id;
      DROP INDEX IF EXISTS idx_client_sessions_status;
      DROP INDEX IF EXISTS idx_bridge_messages_session_id;
      DROP INDEX IF EXISTS idx_bridge_messages_timestamp;
      DROP INDEX IF EXISTS idx_bridge_messages_status;
    `);

    // Drop tables
    await db.exec(`
      DROP TABLE IF EXISTS bridge_messages;
      DROP TABLE IF EXISTS client_sessions;
      DROP TABLE IF EXISTS client_connections;
      DROP TABLE IF EXISTS schema_migrations;
    `);
  }
};