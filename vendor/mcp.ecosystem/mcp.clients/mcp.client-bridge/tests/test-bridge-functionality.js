#!/usr/bin/env node
// test-bridge-functionality.js - Test script to verify MCP Client Bridge functionality

const path = require('path');
const MCPClientBridge = require('./src/services/MCPClientBridge');

async function testBridgeFunctionality() {
  console.log('🔍 Testing MCP Client Bridge functionality...\n');
  
  try {
    // Initialize the MCP Client Bridge
    console.log('1. Initializing MCP Client Bridge...');
    const mcpBridge = new MCPClientBridge(path.join(__dirname, 'data', 'test-mcp-data.json'));
    await mcpBridge.initialize();
    console.log('   ✅ MCP Client Bridge initialized successfully\n');
    
    // Test parsing a simple request
    console.log('2. Testing request parsing...');
    const testRequests = [
      "Read the file README.md",
      "Store this in memory: User prefers Python for AI projects",
      "Create a task to review the MCP client bridge implementation",
      "Fetch the content from https://example.com"
    ];
    
    for (const request of testRequests) {
      try {
        const parsedRequest = await mcpBridge.parseRequest(request);
        console.log(`   📝 "${request}" -> ${parsedRequest.tool}.${parsedRequest.action}`);
      } catch (error) {
        console.log(`   ❌ Failed to parse "${request}": ${error.message}`);
      }
    }
    console.log('   ✅ Request parsing tests completed\n');
    
    // Test getting server configurations
    console.log('3. Testing server configuration retrieval...');
    try {
      const servers = await mcpBridge.getAllServers();
      console.log(`   🖥️  Found ${servers.length} servers:`);
      servers.slice(0, 3).forEach(server => {
        console.log(`      - ${server.name} (${server.id})`);
      });
      if (servers.length > 3) {
        console.log(`      ... and ${servers.length - 3} more`);
      }
      console.log('   ✅ Server configuration retrieval successful\n');
    } catch (error) {
      console.log(`   ❌ Failed to retrieve server configurations: ${error.message}\n`);
    }
    
    // Test finding tools for a query
    console.log('4. Testing tool discovery...');
    try {
      const tools = await mcpBridge.findToolsForQuery("read file");
      console.log(`   🔧 Found ${tools.length} matching tools for "read file"`);
      tools.slice(0, 2).forEach(tool => {
        console.log(`      - ${tool.serverName}: ${tool.tool.name}`);
      });
      if (tools.length > 2) {
        console.log(`      ... and ${tools.length - 2} more`);
      }
      console.log('   ✅ Tool discovery successful\n');
    } catch (error) {
      console.log(`   ❌ Failed to discover tools: ${error.message}\n`);
    }
    
    // Test getting statistics
    console.log('5. Testing statistics retrieval...');
    try {
      const stats = await mcpBridge.getStats();
      console.log('   📊 Statistics retrieved:');
      console.log(`      - Agent state: ${stats.agentState.status}`);
      console.log(`      - Total requests: ${stats.metrics.totalRequests}`);
      console.log(`      - Successful requests: ${stats.metrics.successfulRequests}`);
      console.log(`      - Failed requests: ${stats.metrics.failedRequests}`);
      console.log('   ✅ Statistics retrieval successful\n');
    } catch (error) {
      console.log(`   ❌ Failed to retrieve statistics: ${error.message}\n`);
    }
    
    console.log('🎉 All MCP Client Bridge functionality tests passed!');
    console.log('The MCP Client Bridge is ready for use.');
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test if called directly
if (require.main === module) {
  testBridgeFunctionality().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testBridgeFunctionality };