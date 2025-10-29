#!/usr/bin/env node
// update-profiles.js - Periodically update MCP client bridge and Qwen internal agent profile

const fs = require('fs').promises;
const path = require('path');

/**
 * Update the MCP client bridge profile
 */
async function updateMCPClientBridgeProfile() {
  console.log('🔄 Updating MCP Client Bridge profile...');
  
  try {
    // Get the current timestamp
    const timestamp = new Date().toISOString();
    
    // Update the server index with the current timestamp
    const indexPath = path.join(__dirname, 'mcp.ecosystem', 'MCP_SERVER_INDEX.json');
    const indexData = await fs.readFile(indexPath, 'utf8');
    const index = JSON.parse(indexData);
    
    // Update the last_updated timestamp
    index.last_updated = timestamp;
    
    // Write the updated index back to file
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    
    console.log('✅ MCP Client Bridge profile updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to update MCP Client Bridge profile:', error.message);
    return false;
  }
}

/**
 * Update the Qwen internal agent profile
 */
async function updateQwenInternalAgentProfile() {
  console.log('🔄 Updating Qwen internal agent profile...');
  
  try {
    // Create/update the agent profile directory
    const agentProfileDir = path.join(__dirname, '.qwen', 'agents');
    await fs.mkdir(agentProfileDir, { recursive: true });
    
    // Create/update the MCP client bridge agent profile
    const mcpAgentProfile = {
      name: 'mcp-client-bridge',
      version: '1.0.0',
      description: 'MCP Client Bridge - Intelligent intermediary between users and MCP servers',
      last_updated: new Date().toISOString(),
      capabilities: [
        'natural_language_processing',
        'server_routing',
        'connection_management',
        'caching',
        'persistent_storage',
        'security',
        'monitoring'
      ],
      servers: [
        'mcp.gemini-bridge',
        'mcp.mem0',
        'mcp.notion',
        'mcp.google-suite',
        'mcp.task',
        'mcp.browsertools',
        'mcp.filesystem',
        'mcp.webfetch',
        'mcp.desktop-control'
      ],
      tools: [
        'gemini_generate_content',
        'mem0_store_memory',
        'notion_search',
        'gmail_send_message',
        'task_create_task',
        'browser_navigate',
        'filesystem_read_file',
        'webfetch_fetch_url',
        'desktop_take_screenshot'
      ]
    };
    
    const mcpAgentProfilePath = path.join(agentProfileDir, 'mcp-client-bridge.json');
    await fs.writeFile(mcpAgentProfilePath, JSON.stringify(mcpAgentProfile, null, 2));
    
    console.log('✅ Qwen internal agent profile updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to update Qwen internal agent profile:', error.message);
    return false;
  }
}

/**
 * Main update function
 */
async function updateProfiles() {
  console.log('🚀 Starting profile updates...\n');
  
  const mcpSuccess = await updateMCPClientBridgeProfile();
  const qwenSuccess = await updateQwenInternalAgentProfile();
  
  console.log('\n📊 Update Summary:');
  console.log(`   MCP Client Bridge: ${mcpSuccess ? '✅ Success' : '❌ Failed'}`);
  console.log(`   Qwen Internal Agent: ${qwenSuccess ? '✅ Success' : '❌ Failed'}`);
  
  if (mcpSuccess && qwenSuccess) {
    console.log('\n🎉 All profiles updated successfully!');
    return true;
  } else {
    console.log('\n⚠️  Some profile updates failed.');
    return false;
  }
}

/**
 * Run updates periodically
 */
function runPeriodicUpdates(intervalMinutes = 30) {
  console.log(`⏰ Setting up periodic updates every ${intervalMinutes} minutes...\n`);
  
  // Run immediately
  updateProfiles();
  
  // Schedule periodic updates
  setInterval(async () => {
    console.log(`\n⏰ Running scheduled profile update at ${new Date().toISOString()}...`);
    await updateProfiles();
  }, intervalMinutes * 60 * 1000);
}

// Run the update if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--periodic')) {
    const interval = parseInt(args[args.indexOf('--interval') + 1]) || 30;
    runPeriodicUpdates(interval);
  } else {
    updateProfiles().then(success => {
      process.exit(success ? 0 : 1);
    });
  }
}

module.exports = { updateProfiles, runPeriodicUpdates };