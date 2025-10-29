/**
 * AppConnection model for Rube MCP Server
 */

class AppConnection {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.appId = data.appId;
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.expiresAt = data.expiresAt;
    this.scopes = data.scopes;
    this.metadata = data.metadata || {};
    this.active = data.active !== undefined ? data.active : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static async create(connectionData) {
    // In a real implementation, this would insert into the database
    // For now, we'll use in-memory storage
    const connections = require('../connectionStorage').connections;
    const id = require('uuid').v4();
    const connection = new AppConnection({
      ...connectionData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    connections.set(id, connection);
    return connection;
  }

  static async findById(id) {
    // In a real implementation, this would query the database
    const connections = require('../connectionStorage').connections;
    return connections.get(id) || null;
  }

  static async findByUserIdAndAppId(userId, appId) {
    // In a real implementation, this would query the database
    const connections = require('../connectionStorage').connections;
    for (const [id, connection] of connections) {
      if (connection.userId === userId && connection.appId === appId) {
        return connection;
      }
    }
    return null;
  }

  static async findAllByUserId(userId) {
    // In a real implementation, this would query the database
    const connections = require('../connectionStorage').connections;
    const userConnections = [];
    for (const [id, connection] of connections) {
      if (connection.userId === userId) {
        userConnections.push(connection);
      }
    }
    return userConnections;
  }

  static async update(id, updates) {
    // In a real implementation, this would update the database
    const connections = require('../connectionStorage').connections;
    const connection = connections.get(id);
    if (!connection) return null;

    // Update allowed fields
    if (updates.accessToken !== undefined) connection.accessToken = updates.accessToken;
    if (updates.refreshToken !== undefined) connection.refreshToken = updates.refreshToken;
    if (updates.expiresAt !== undefined) connection.expiresAt = updates.expiresAt;
    if (updates.scopes !== undefined) connection.scopes = updates.scopes;
    if (updates.metadata !== undefined) connection.metadata = { ...connection.metadata, ...updates.metadata };
    if (updates.active !== undefined) connection.active = updates.active;
    connection.updatedAt = new Date().toISOString();

    connections.set(id, connection);
    return connection;
  }

  static async delete(id) {
    // In a real implementation, this would delete from the database
    const connections = require('../connectionStorage').connections;
    const connection = connections.get(id);
    if (!connection) return false;

    connections.delete(id);
    return true;
  }
}

module.exports = AppConnection;