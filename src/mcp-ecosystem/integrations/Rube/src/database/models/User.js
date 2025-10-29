/**
 * User model for Rube MCP Server
 */

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static async create(userData) {
    // In a real implementation, this would insert into the database
    // For now, we'll use in-memory storage
    const users = require('../userStorage').users;
    const id = require('uuid').v4();
    const user = new User({
      ...userData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    users.set(id, user);
    return user;
  }

  static async findById(id) {
    // In a real implementation, this would query the database
    const users = require('../userStorage').users;
    return users.get(id) || null;
  }

  static async findByEmail(email) {
    // In a real implementation, this would query the database
    const users = require('../userStorage').users;
    for (const [id, user] of users) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }
}

module.exports = User;