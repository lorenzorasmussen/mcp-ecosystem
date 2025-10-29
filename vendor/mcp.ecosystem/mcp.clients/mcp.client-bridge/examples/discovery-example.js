#!/usr/bin/env node
// mcp.ecosystem/mcp.clients/mcp.client-bridge/examples/discovery-example.js
const ServerDiscoveryService = require('../src/services/ServerDiscoveryService');
const path = require('path');

async function demonstrateDiscovery() {
  console.log('🔍 Demonstrating MCP Server Discovery Service\n');
  
  // Initialize the discovery service with the correct path
  const indexPath = path.join(__dirname, '../../../MCP_SERVER_INDEX.json');
  const discoveryService = new ServerDiscoveryService(indexPath);
  
  try {
    // Load the server index
    console.log('1. Loading server index...');
    const index = await discoveryService.loadServerIndex();
    console.log(`   ✅ Loaded index with ${index.servers.length} servers\n`);
    
    // Get index metadata
    console.log('2. Getting index metadata...');
    const metadata = await discoveryService.getIndexMetadata();
    console.log(`   ℹ️  Last updated: ${metadata.lastUpdated}`);
    console.log(`   ℹ️  Total servers: ${metadata.serverCount}`);
    console.log(`   ℹ️  Total tools: ${metadata.totalTools}`);
    console.log(`   ℹ️  Categories: ${metadata.categories.join(', ')}\n`);
    
    // Get all servers
    console.log('3. Listing all servers...');
    const allServers = await discoveryService.getAllServers();
    allServers.forEach((server, index) => {
      console.log(`   ${index + 1}. ${server.name} (${server.id}) - ${server.category}`);
    });
    console.log('');
    
    // Search for servers by category
    console.log('4. Searching for AI servers...');
    const aiServers = await discoveryService.getServersByCategory('AI');
    aiServers.forEach(server => {
      console.log(`   🤖 ${server.name}: ${server.description}`);
    });
    console.log('');
    
    // Search for servers by keyword
    console.log('5. Searching for servers with "memory" in name/description...');
    const memoryServers = await discoveryService.searchServers('memory');
    memoryServers.forEach(server => {
      console.log(`   💾 ${server.name}: ${server.description}`);
    });
    console.log('');
    
    // Find tools for a natural language query
    console.log('6. Finding tools for query: "read a file"...');
    const fileTools = await discoveryService.findToolsForQuery('read a file');
    fileTools.forEach(result => {
      console.log(`   📁 ${result.serverName}:`);
      result.matchingTools.forEach(tool => {
        console.log(`      - ${tool.name}: ${tool.description}`);
      });
    });
    console.log('');
    
    // Get all tools
    console.log('7. Getting all available tools...');
    const allTools = await discoveryService.getAllTools();
    console.log(`   🛠️  Total tools available: ${allTools.length}`);
    // Show sample of tools
    const sampleTools = allTools.slice(0, 5);
    sampleTools.forEach(tool => {
      console.log(`      - ${tool.serverName} :: ${tool.tool.name}`);
    });
    if (allTools.length > 5) {
      console.log(`      ... and ${allTools.length - 5} more tools`);
    }
    console.log('');
    
    console.log('🎉 Discovery demonstration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during discovery demonstration:', error.message);
    process.exit(1);
  }
}

// Run the demonstration if called directly
if (require.main === module) {
  demonstrateDiscovery();
}

module.exports = { demonstrateDiscovery };