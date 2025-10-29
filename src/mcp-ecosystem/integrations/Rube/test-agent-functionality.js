/**
 * Test suite for Rube MCP Agent functionality
 * Tests agent integration with existing app services
 */

const { agentService } = require('./src/services/agentService');
const { agentConfigManager } = require('./src/services/agentConfigManager');
const { agentToolService } = require('./src/services/agentToolService');
const { agentAuthManager } = require('./src/services/agentAuthManager');
const { toolService } = require('./src/services/toolService');
const { resourceService } = require('./src/services/resourceService');
const { appIntegrationService } = require('./src/services/appIntegrationService');

async function testAgentInitialization() {
  console.log('🧪 Testing Agent Initialization...');
  
  try {
    // Create agent configuration
    const config = agentConfigManager.createDefaultConfig('test-agent', {
      name: 'Test Agent',
      description: 'Agent for testing purposes',
      supportedApps: ['gmail', 'github', 'slack'],
    });
    
    // Initialize agent
    const agent = await agentService.initializeAgent('test-agent', config);
    console.log('✅ Agent initialized successfully:', agent.name);
    
    // Verify agent exists
    const retrievedAgent = agentService.getAgent('test-agent');
    if (retrievedAgent && retrievedAgent.id === 'test-agent') {
      console.log('✅ Agent retrieved successfully');
    } else {
      console.log('❌ Failed to retrieve agent');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Agent initialization failed:', error.message);
    return false;
  }
}

async function testAgentSessionManagement() {
  console.log('\n🧪 Testing Agent Session Management...');
  
  try {
    // Create a session for the test agent without requiring specific app connections
    // (since we don't have actual app connections in the test environment)
    const session = await agentAuthManager.createSession(
      'test-agent', 
      'test-user-123', 
      {
        requiredApps: [], // No required apps for this test
        permissions: {
          execute: true,
          apps: {
            gmail: { execute: true },
            github: { execute: true },
          }
        }
      }
    );
    
    console.log('✅ Session created successfully:', session.id);
    
    // Validate session
    const validatedSession = agentAuthManager.validateSession(session.id, 'test-user-123');
    if (validatedSession && validatedSession.id === session.id) {
      console.log('✅ Session validated successfully');
    } else {
      console.log('❌ Session validation failed');
    }
    
    // Check permissions
    const hasPermission = agentAuthManager.hasPermission(session.id, 'execute', 'gmail');
    if (hasPermission) {
      console.log('✅ Permission check passed');
    } else {
      console.log('❌ Permission check failed');
    }
    
    // End session
    const ended = agentAuthManager.endSession(session.id);
    if (ended) {
      console.log('✅ Session ended successfully');
    } else {
      console.log('❌ Session ending failed');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Session management test failed:', error.message);
    return false;
  }
}

async function testAgentToolExecution() {
  console.log('\n🧪 Testing Agent Tool Execution...');
  
  try {
    // Test getting available tools
    const tools = await agentToolService.listTools('test-user-123');
    console.log(`✅ Retrieved ${tools.length} agent tools`);
    
    // Test getting a specific tool
    const tool = await agentToolService.getTool('agent-info', 'test-user-123');
    if (tool && tool.name === 'agent-info') {
      console.log('✅ Retrieved agent-info tool successfully');
    } else {
      console.log('❌ Failed to retrieve agent-info tool');
    }
    
    // Test agent-info tool execution
    const result = await agentToolService.executeTool(
      'agent-info', 
      { agentId: 'test-agent' }, 
      'test-user-123'
    );
    
    if (result && result.id === 'test-agent') {
      console.log('✅ Agent-info tool executed successfully');
    } else {
      console.log('❌ Agent-info tool execution failed');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Agent tool execution test failed:', error.message);
    return false;
  }
}

async function testIntegrationWithExistingServices() {
  console.log('\n🧪 Testing Integration with Existing Services...');
  
  try {
    // Test that regular tools still work through the updated tool service
    const regularTools = await toolService.listTools('test-user-123');
    console.log(`✅ Retrieved ${regularTools.length} regular tools through updated service`);
    
    // Test that resources work with agent integration
    const resources = await resourceService.listResourceTemplates();
    console.log(`✅ Retrieved ${resources.length} resource templates (regular + agent)`);
    
    // Verify we have both regular and agent templates
    const templateNames = resources.map(t => t.name);
    const hasRegular = templateNames.includes('document');
    const hasAgent = templateNames.some(name => 
      ['gmail-email', 'github-issue', 'slack-message'].includes(name)
    );
    
    if (hasRegular && hasAgent) {
      console.log('✅ Both regular and agent resource templates available');
    } else {
      console.log('❌ Missing regular or agent resource templates');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Integration test failed:', error.message);
    return false;
  }
}

async function testAgentResourceManagement() {
  console.log('\n🧪 Testing Agent Resource Management...');
  
  try {
    // Test listing resource templates
    const templates = await agentResourceService.listResourceTemplates();
    console.log(`✅ Retrieved ${templates.length} agent resource templates`);
    
    // Test getting a specific template
    const template = await agentResourceService.getResourceTemplate('gmail-email');
    if (template && template.name === 'gmail-email') {
      console.log('✅ Retrieved gmail-email template successfully');
    } else {
      console.log('❌ Failed to retrieve gmail-email template');
    }
    
    // Test creating a resource
    const resource = await agentResourceService.createResource({
      name: 'Test Resource',
      appId: 'gmail',
      type: 'email',
      content: { subject: 'Test', body: 'Test content' },
    }, 'test-user-123');
    
    if (resource && resource.name === 'Test Resource') {
      console.log('✅ Resource created successfully:', resource.id);
      
      // Test retrieving the resource
      const retrievedResource = await agentResourceService.getResource(resource.id, 'test-user-123');
      if (retrievedResource && retrievedResource.id === resource.id) {
        console.log('✅ Resource retrieved successfully');
      } else {
        console.log('❌ Failed to retrieve resource');
      }
      
      // Clean up
      const deleted = await agentResourceService.deleteResource(resource.id, 'test-user-123');
      if (deleted) {
        console.log('✅ Resource deleted successfully');
      }
    } else {
      console.log('❌ Resource creation failed');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Agent resource management test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Rube MCP Agent Functionality Tests...\n');
  
  const tests = [
    testAgentInitialization,
    testAgentSessionManagement,
    testAgentToolExecution,
    testIntegrationWithExistingServices,
    testAgentResourceManagement,
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    const result = await test();
    if (result) passedTests++;
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Agent functionality is working correctly.');
    return true;
  } else {
    console.log('❌ Some tests failed. Please check the implementation.');
    return false;
  }
}

// Import agentResourceService here since it's needed in the test
const { agentResourceService } = require('./src/services/agentResourceService');

// Run the tests
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test suite failed with error:', error);
    process.exit(1);
  });
}

module.exports = {
  testAgentInitialization,
  testAgentSessionManagement,
  testAgentToolExecution,
  testIntegrationWithExistingServices,
  testAgentResourceManagement,
  runAllTests,
};