/**
 * In-memory storage for database entities
 * In production, this would be replaced with actual database connections
 */

// In-memory storage for users
const users = new Map();

// Initialize with a default user for testing
const User = require('./models/User');
User.create({
  email: 'admin@rube.app',
  name: 'Admin User',
}).catch(console.error);

module.exports = {
  users,
};