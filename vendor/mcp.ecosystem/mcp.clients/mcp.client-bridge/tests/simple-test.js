// test/mcpClientBridge.test.js - Simple test to verify MCP Client Bridge functionality
const MCPClientBridge = require('../src/services/MCPClientBridge');

async function testMCPClientBridge() {
  console.log('Testing MCP Client Bridge...');
  
  try {
    // Initialize the MCP Client Bridge
    const mcpBridge = new MCPClientBridge();
    await mcpBridge.initialize();
    
    console.log('✅ MCP Client Bridge initialized successfully');
    
    // Test parsing a simple request
    const testRequest = "Read the file README.md";
    const parsedRequest = await mcpBridge.parseRequest(testRequest);
    
    console.log('✅ Request parsing successful');
    console.log('   Parsed request:', JSON.stringify(parsedRequest, null, 2));
    
    // Test getting server configurations
    const servers = await mcpBridge.getAllServers();
    console.log('✅ Server configuration retrieval successful');
    console.log(`   Found ${servers.length} servers`);
    
    // Test finding tools for a query
    const tools = await mcpBridge.findToolsForQuery("read file");
    console.log('✅ Tool discovery successful');
    console.log(`   Found ${tools.length} matching tools`);
    
    // Test getting statistics
    const stats = await mcpBridge.getStats();
    console.log('✅ Statistics retrieval successful');
    console.log('   Stats keys:', Object.keys(stats));
    
    console.log('\n🎉 All tests passed! MCP Client Bridge is working correctly.');
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test if called directly
if (require.main === module) {
  testMCPClientBridge().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testMCPClientBridge };