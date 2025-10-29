-- MCP Client Bridge Database Schema
-- SQLite-based schema for persistent storage

-- Client connections table
CREATE TABLE IF NOT EXISTS client_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    connection_string TEXT NOT NULL,
    connection_type TEXT NOT NULL, -- 'websocket', 'http', 'tcp', etc.
    status TEXT DEFAULT 'active', -- 'active', 'inactive', 'disconnected'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_connected_at DATETIME,
    metadata TEXT -- JSON string for additional client-specific data
);

-- Client sessions table
CREATE TABLE IF NOT EXISTS client_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    client_id TEXT NOT NULL,
    connection_id INTEGER,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    status TEXT DEFAULT 'active', -- 'active', 'ended', 'error'
    metadata TEXT, -- JSON string for session-specific data
    FOREIGN KEY (client_id) REFERENCES client_connections(client_id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES client_connections(id) ON DELETE SET NULL
);

-- Messages exchanged through the bridge
CREATE TABLE IF NOT EXISTS bridge_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    message_type TEXT NOT NULL, -- 'request', 'response', 'notification'
    direction TEXT NOT NULL, -- 'inbound', 'outbound'
    content TEXT NOT NULL, -- JSON string containing the message content
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'processed', -- 'received', 'processing', 'processed', 'error'
    error_message TEXT,
    FOREIGN KEY (session_id) REFERENCES client_sessions(session_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_connections_client_id ON client_connections(client_id);
CREATE INDEX IF NOT EXISTS idx_client_connections_status ON client_connections(status);
CREATE INDEX IF NOT EXISTS idx_client_sessions_client_id ON client_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_sessions_session_id ON client_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_client_sessions_status ON client_sessions(status);
CREATE INDEX IF NOT EXISTS idx_bridge_messages_session_id ON bridge_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_bridge_messages_timestamp ON bridge_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_bridge_messages_status ON bridge_messages(status);

-- Table for tracking schema migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    applied_by TEXT DEFAULT 'system'
);