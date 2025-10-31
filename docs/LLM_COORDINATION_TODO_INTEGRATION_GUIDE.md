# LLM Coordination with Todo Enforcement Integration Guide

## Overview

This guide documents the integration between the LLM Coordination System and the Todo Enforcement System, creating a comprehensive framework for managing multi-agent workflows with proper task tracking and accountability.

## Architecture

### Core Components

1. **Enhanced LLM Coordinator** (`llm-coordination-with-todos.js`)
   - Extends the basic LLM coordination with todo validation
   - Ensures all coordinated operations have corresponding todos
   - Tracks compliance metrics across all sessions

2. **Todo Enforcement Hook** (`todo-enforcement-hook.js`)
   - Validates todo existence before allowing operations
   - Provides detailed error messages and guidance
   - Supports both strict and warning modes

3. **MCP Client Integration** (`mcp-client-todo-integration.js`)
   - Bridges MCP operations with coordination and todo systems
   - Wraps all MCP operations with validation
   - Provides simulation for testing

4. **Shared Todo Service** (`shared-todo-service.js`)
   - Centralized todo management
   - Persistent storage with audit trails
   - Multi-agent support with assignment capabilities

## Integration Flow

### 1. Session Registration

```
LLM Agent → Enhanced Coordinator → Todo Validation → Session Registered
```

### 2. Operation Execution

```
Operation Request → Todo Validation → Coordination Check → Execute → Update Todos
```

### 3. Completion

```
Operation Complete → Todo Status Update → Session Update → Compliance Metrics
```

## Usage Examples

### Basic Coordinated Operation

```javascript
import EnhancedLLMCoordinator from "./llm-coordination-with-todos.js";

const coordinator = new EnhancedLLMCoordinator();

// Register session (requires todo validation)
await coordinator.registerSession(
  "my-project",
  "feature-branch",
  "implementing new feature",
);

// Execute coordinated operation
const result = await coordinator.executeCoordinatedOperation(
  "implement-user-auth",
  { file: "src/auth.js", feature: "authentication" },
);

if (result.success) {
  console.log("Operation completed with todo compliance");
  await coordinator.completeOperation("implement-user-auth");
}
```

### MCP Integration

```javascript
import MCPClientTodoIntegration from "./mcp-client-todo-integration.js";

const integration = new MCPClientTodoIntegration();

// Execute MCP operation with full validation
const result = await integration.executeMCPOperation("server-connect", {
  serverName: "auth-server",
  serverType: "stdio",
});

console.log("MCP operation result:", result);
```

### Todo-First Workflow

```bash
# 1. Create todo for the operation
node tools/scripts/shared-todo-cli.js create my-agent "Connect to MCP server"

# 2. Start the todo
node tools/scripts/shared-todo-cli.js start my-agent <todo-id>

# 3. Execute coordinated operation
node tools/scripts/llm-coordination-with-todos.js execute "server-connect"

# 4. Complete operation
node tools/scripts/llm-coordination-with-todos.js complete "server-connect"
```

## Configuration

### Environment Variables

```bash
# Todo enforcement mode
TODO_ENFORCEMENT_STRICT=true    # Block operations without todos
TODO_ENFORCEMENT_STRICT=false   # Warn but allow operations

# Coordination settings
LLM_COORDINATION_TIMEOUT=120     # Session timeout in minutes
LLM_COORDINATION_CLEANUP=true   # Auto-cleanup expired sessions
```

### Integration Configuration

```json
{
  "enabled": true,
  "enforcementMode": "strict",
  "coordination": {
    "requireSessionRegistration": true,
    "validateBranchSwitches": true,
    "trackOperationMetrics": true
  },
  "todo": {
    "requireForOperations": [
      "server-connect",
      "server-disconnect",
      "tool-execute",
      "resource-access",
      "prompt-generate"
    ],
    "autoCreateForOperations": true,
    "categories": {
      "server-connect": "infrastructure",
      "server-disconnect": "infrastructure",
      "tool-execute": "development",
      "resource-access": "data",
      "prompt-generate": "ai-operations"
    }
  }
}
```

## Testing

### Simple Integration Test

```bash
# Run basic integration test
node tools/scripts/simple-coordination-test.js test

# Run full workflow demo
node tools/scripts/simple-coordination-test.js demo
```

### MCP Integration Test

```bash
# Initialize integration
node tools/scripts/mcp-client-todo-integration.js init

# Test status
node tools/scripts/mcp-client-todo-integration.js status

# Run integration tests
node tools/scripts/mcp-client-todo-integration.js test

# Generate report
node tools/scripts/mcp-client-todo-integration.js report
```

## Monitoring and Compliance

### Compliance Metrics

The system tracks several key metrics:

- **Todo Compliance Rate**: Percentage of agents with active todos
- **Operation Validation Rate**: Success rate of todo validation
- **Session Coordination**: Number of active coordinated sessions
- **Branch Conflicts**: Detected and prevented conflicts

### Status Monitoring

```bash
# Check coordination status with todo metrics
node tools/scripts/llm-coordination-with-todos.js status

# Check todo system status
node tools/scripts/shared-todo-cli.js status

# Monitor integration health
node tools/scripts/mcp-client-todo-integration.js status
```

## Best Practices

### 1. Todo-First Development

Always create todos before starting operations:

```bash
# Create todo for the work
node tools/scripts/shared-todo-cli.js create agent-name "Description of work"

# Start the todo
node tools/scripts/shared-todo-cli.js start agent-name <todo-id>

# Execute the work
# ... your operations here ...

# Complete the todo
node tools/scripts/shared-todo-cli.js complete agent-name <todo-id>
```

### 2. Session Management

Register sessions for all coordinated work:

```bash
# Register session
node tools/scripts/llm-coordination-with-todos.js register project branch activity

# Check branch safety before switching
node tools/scripts/llm-coordination-with-todos.js check-switch target-branch

# Unregister when done
node tools/scripts/llm-coordination-with-todos.js unregister
```

### 3. Error Handling

The system provides detailed error messages when operations are blocked:

```
🚫 TODO ENFORCEMENT BLOCKED

📋 ERROR DETAILS:
   • Reason: No relevant todos found for operation 'deploy'
   • Operation: deploy
   • Agent: deployment-agent

💡 HOW TO FIX:
   Create a relevant todo or update existing todos to match this operation.

🔧 CREATE A NEW TODO:
   node tools/scripts/shared-todo-cli.js create deployment-agent "deploy"
```

### 4. Integration Patterns

#### For MCP Operations

```javascript
// Wrap all MCP operations
const result = await integration.executeMCPOperation("tool-execute", {
  toolName: "deploy",
  arguments: { environment: "prod" },
});
```

#### For Multi-Agent Workflows

```javascript
// Each agent registers with coordination
await coordinator.registerSession(project, branch, agentActivity);

// Operations are validated and coordinated
await coordinator.executeCoordinatedOperation(operation, context);
```

## Troubleshooting

### Common Issues

1. **"Todo not found" errors**
   - Ensure todo is created before operation
   - Check todo ID matches exactly
   - Verify todo is started (not just created)

2. **"Session not found" errors**
   - Register session before executing operations
   - Check session hasn't expired (default 2 hours)
   - Verify session ID consistency

3. **"Branch switch blocked" errors**
   - Check for other active sessions on target branch
   - Coordinate with other agents working on the branch
   - Use `check-switch` command before switching

### Debug Commands

```bash
# Check todo system health
node tools/scripts/shared-todo-cli.js status

# Check coordination status
node tools/scripts/llm-coordination-with-todos.js status

# Test integration components
node tools/scripts/simple-coordination-test.js test

# Generate detailed report
node tools/scripts/mcp-client-todo-integration.js report
```

## File Structure

```
tools/scripts/
├── llm-coordination-with-todos.js     # Enhanced coordination with todos
├── todo-enforcement-hook.js            # Todo validation logic
├── mcp-client-todo-integration.js     # MCP bridge integration
├── simple-coordination-test.js        # Integration testing
├── shared-todo-cli.js                 # Todo management CLI
└── shared-todo-service.js             # Todo service backend

config/
└── mcp-todo-integration.json          # Integration configuration

data/shared-knowledge/.mcp-shared-knowledge/
└── tasks/
    └── shared_tasks.json              # Todo storage
```

## API Reference

### EnhancedLLMCoordinator

#### Methods

- `registerSession(project, branch, activity)` - Register with todo validation
- `executeCoordinatedOperation(operation, context)` - Execute with validation
- `completeOperation(operation, result)` - Complete and update todos
- `checkBranchSwitch(targetBranch)` - Validate branch switching
- `getStatus()` - Get status with compliance metrics

### TodoEnforcementHook

#### Methods

- `validateTodoForOperation(operation, agentId, context)` - Validate todo exists
- `initializeAgentSession(agentId, operation)` - Create initial todo
- `updateTodoStatus(agentId, operation, result)` - Update todo status
- `run(operation, agentId, context)` - Run full validation

### MCPClientTodoIntegration

#### Methods

- `initializeIntegration()` - Set up integration configuration
- `executeMCPOperation(operation, params, agentId)` - Execute with validation
- `getStatus()` - Get integration status
- `testIntegration()` - Run integration tests

## Conclusion

The integration of LLM coordination with todo enforcement creates a robust system for managing multi-agent workflows. By ensuring all operations are properly tracked and coordinated, teams can maintain accountability while preventing conflicts and ensuring smooth collaboration.

The system is designed to be flexible, supporting both strict enforcement (blocking operations without todos) and warning modes (allowing operations but logging warnings). This allows teams to adopt the approach that best fits their workflow and maturity level.
