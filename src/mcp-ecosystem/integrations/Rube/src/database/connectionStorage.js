/**
 * In-memory storage for app connections
 * In production, this would be replaced with actual database connections
 */

// In-memory storage for app connections
const connections = new Map();

module.exports = {
  connections,
};