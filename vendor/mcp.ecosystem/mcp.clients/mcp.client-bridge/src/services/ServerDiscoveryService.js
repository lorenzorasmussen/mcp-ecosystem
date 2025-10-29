// src/services/ServerDiscoveryService.js - Persistent storage model for agent state and metrics
const fs = require('fs').promises;
const path = require('path');

class ServerDiscoveryService {
  constructor(indexFilePath) {
    this.indexFilePath = indexFilePath || path.join(__dirname, '../../MCP_SERVER_INDEX.json');
    this.serverIndex = null;
    this.lastUpdated = null;
  }

  /**
   * Load the server index from the JSON file
   */
  async loadServerIndex() {
    try {
      const indexData = await fs.readFile(this.indexFilePath, 'utf8');
      this.serverIndex = JSON.parse(indexData);
      this.lastUpdated = new Date(this.serverIndex.last_updated);
      return this.serverIndex;
    } catch (error) {
      console.error('Failed to load server index:', error);
      throw error;
    }
  }

  /**
   * Get all available servers
   */
  async getAllServers() {
    if (!this.serverIndex) {
      await this.loadServerIndex();
    }
    
    return this.serverIndex.servers;
  }

  /**
   * Get a specific server by ID
   */
  async getServerById(serverId) {
    if (!this.serverIndex) {
      await this.loadServerIndex();
    }
    
    const server = this.serverIndex.servers.find(s => s.id === serverId);
    return server || null;
  }

  /**
   * Search for servers by category
   */
  async getServersByCategory(category) {
    if (!this.serverIndex) {
      await this.loadServerIndex();
    }
    
    return this.serverIndex.servers.filter(s => 
      s.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Search for servers by keyword in name or description
   */
  async searchServers(keyword) {
    if (!this.serverIndex) {
      await this.loadServerIndex();
    }
    
    const lowerKeyword = keyword.toLowerCase();
    return this.serverIndex.servers.filter(s => 
      s.name.toLowerCase().includes(lowerKeyword) ||
      s.description.toLowerCase().includes(lowerKeyword) ||
      s.category.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Find tools that match a natural language query
   */
  async findToolsForQuery(query) {
    if (!this.serverIndex) {
      await this.loadServerIndex();
    }
    
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    for (const server of this.serverIndex.servers) {
      // Search for matching tools in this server
      const matchingTools = server.tools.filter(tool => 
        tool.name.toLowerCase().includes(lowerQuery) ||
        tool.description.toLowerCase().includes(lowerQuery) ||
        this.toolMatchesQuery(tool, lowerQuery)
      );
      
      if (matchingTools.length > 0) {
        results.push({
          serverId: server.id,
          serverName: server.name,
          serverDescription: server.description,
          category: server.category,
          matchingTools: matchingTools
        });
      }
    }
    
    return results;
  }

  /**
   * Check if a tool matches a query (more sophisticated matching)
   */
  toolMatchesQuery(tool, lowerQuery) {
    // Simple keyword matching in tool name and description
    if (tool.name.toLowerCase().includes(lowerQuery)) return true;
    if (tool.description.toLowerCase().includes(lowerQuery)) return true;
    
    // More advanced matching could be implemented here
    // For example, matching query keywords to tool parameters
    return false;
  }

  /**
   * Get all tools from all servers
   */
  async getAllTools() {
    if (!this.serverIndex) {
      await this.loadServerIndex();
    }
    
    const allTools = [];
    for (const server of this.serverIndex.servers) {
      for (const tool of server.tools) {
        allTools.push({
          serverId: server.id,
          serverName: server.name,
          tool: tool
        });
      }
    }
    
    return allTools;
  }

  /**
   * Refresh the server index (reload from file)
   */
  async refreshIndex() {
    this.serverIndex = null;
    return await this.loadServerIndex();
  }

  /**
   * Get server index metadata
   */
  async getIndexMetadata() {
    if (!this.serverIndex) {
      await this.loadServerIndex();
    }
    
    // Calculate some metadata
    const categories = [...new Set(this.serverIndex.servers.map(s => s.category))];
    const totalTools = this.serverIndex.servers.reduce((total, server) => total + server.tools.length, 0);
    
    return {
      lastUpdated: this.lastUpdated.toISOString(),
      serverCount: this.serverIndex.servers.length,
      categories: categories,
      totalTools: totalTools
    };
  }
}

module.exports = ServerDiscoveryService;