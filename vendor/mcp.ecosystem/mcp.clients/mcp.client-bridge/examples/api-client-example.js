// mcp.ecosystem/mcp.clients/mcp.client-bridge/examples/api-client-example.js
const axios = require('axios');

class MCPAPIClient {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get all available servers
   */
  async getAllServers() {
    try {
      const response = await this.client.get('/api/mcp/discovery/servers');
      return response.data.servers;
    } catch (error) {
      throw new Error(`Failed to get servers: ${error.message}`);
    }
  }

  /**
   * Search servers by category
   */
  async getServersByCategory(category) {
    try {
      const response = await this.client.get(`/api/mcp/discovery/servers/category/${category}`);
      return response.data.servers;
    } catch (error) {
      throw new Error(`Failed to get servers by category: ${error.message}`);
    }
  }

  /**
   * Search servers by keyword
   */
  async searchServers(keyword) {
    try {
      const response = await this.client.get(`/api/mcp/discovery/servers/search/${keyword}`);
      return response.data.servers;
    } catch (error) {
      throw new Error(`Failed to search servers: ${error.message}`);
    }
  }

  /**
   * Find tools for a natural language query
   */
  async findToolsForQuery(query) {
    try {
      const response = await this.client.post('/api/mcp/discovery/tools/search', { query });
      return response.data.results;
    } catch (error) {
      throw new Error(`Failed to find tools: ${error.message}`);
    }
  }

  /**
   * Get all tools
   */
  async getAllTools() {
    try {
      const response = await this.client.get('/api/mcp/discovery/tools');
      return response.data.tools;
    } catch (error) {
      throw new Error(`Failed to get tools: ${error.message}`);
    }
  }

  /**
   * Get index metadata
   */
  async getIndexMetadata() {
    try {
      const response = await this.client.get('/api/mcp/discovery/index/metadata');
      return response.data.metadata;
    } catch (error) {
      throw new Error(`Failed to get index metadata: ${error.message}`);
    }
  }

  /**
   * Process a natural language request
   */
  async processRequest(request) {
    try {
      const response = await this.client.post('/api/mcp/process', { request });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to process request: ${error.message}`);
    }
  }

  /**
   * Get bridge statistics
   */
  async getStats() {
    try {
      const response = await this.client.get('/api/mcp/stats');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }
}

// Example usage
async function demonstrateAPIClient() {
  console.log('🚀 Demonstrating MCP API Client\n');
  
  const client = new MCPAPIClient('http://localhost:3000');
  
  try {
    // Get index metadata
    console.log('1. Getting index metadata...');
    const metadata = await client.getIndexMetadata();
    console.log(`   ℹ️  Last updated: ${metadata.lastUpdated}`);
    console.log(`   ℹ️  Server count: ${metadata.serverCount}`);
    console.log(`   ℹ️  Total tools: ${metadata.totalTools}\n`);
    
    // Get all servers
    console.log('2. Getting all servers...');
    const servers = await client.getAllServers();
    console.log(`   🖥️  Found ${servers.length} servers:`);
    servers.slice(0, 3).forEach(server => {
      console.log(`      - ${server.name} (${server.id})`);
    });
    if (servers.length > 3) {
      console.log(`      ... and ${servers.length - 3} more`);
    }
    console.log('');
    
    // Search for AI servers
    console.log('3. Searching for AI servers...');
    const aiServers = await client.getServersByCategory('AI');
    console.log(`   🤖 Found ${aiServers.length} AI servers:`);
    aiServers.forEach(server => {
      console.log(`      - ${server.name}: ${server.description}`);
    });
    console.log('');
    
    // Find tools for a query
    console.log('4. Finding tools for query: "read a file"...');
    const results = await client.findToolsForQuery('read a file');
    console.log(`   🛠️  Found ${results.length} matching servers:`);
    results.slice(0, 2).forEach(result => {
      console.log(`      - ${result.serverName}:`);
      result.matchingTools.slice(0, 2).forEach(tool => {
        console.log(`         • ${tool.name}: ${tool.description}`);
      });
    });
    console.log('');
    
    // Get all tools
    console.log('5. Getting all tools...');
    const tools = await client.getAllTools();
    console.log(`   🔧 Found ${tools.length} tools:`);
    tools.slice(0, 5).forEach(tool => {
      console.log(`      - ${tool.serverName} :: ${tool.tool.name}`);
    });
    if (tools.length > 5) {
      console.log(`      ... and ${tools.length - 5} more`);
    }
    console.log('');
    
    console.log('🎉 API client demonstration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during API client demonstration:', error.message);
    process.exit(1);
  }
}

// Run the demonstration if called directly
if (require.main === module) {
  demonstrateAPIClient();
}

module.exports = { MCPAPIClient, demonstrateAPIClient };