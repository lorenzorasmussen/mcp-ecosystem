# Todo Enforcement Implementation Guide

## Overview

This guide explains how to implement and use the todo enforcement system that ensures all LLM agents in this directory must use todos as the start of their workflows.

## Architecture

The todo enforcement system consists of several integrated components:

### 1. Core Components

- **TodoEnforcementHook** (`scripts/todo-enforcement-hook.js`)
  - Validates todo existence before operations
  - Manages todo lifecycle
  - Provides compliance metrics

- **AgentTodoIntegration** (`scripts/agent-todo-integration.js`)
  - Wraps agent execution with todo validation
  - Integrates with existing agent workflows
  - Monitors compliance across agents

- **TodoEnforcementService** (`mcp.ecosystem/mcp.clients/mcp.client-bridge/src/services/TodoEnforcementService.js`)
  - Integrates todo validation into MCP Client Bridge
  - Provides todo management for MCP operations
  - Tracks compliance metrics

- **TodoTemplates** (`scripts/todo-templates.js`)
  - Provides predefined todo templates
  - Supports different agent types and operations
  - Enables custom template creation

### 2. Integration Points

- **Git Hooks**: Pre-commit validation for todo compliance
- **CI/CD Pipelines**: Automated todo validation in GitHub Actions
- **Agent System**: Direct integration with Qwen agents
- **MCP Client Bridge**: Todo validation for all MCP operations

## Installation and Setup

### 1. Environment Configuration

Copy the todo configuration file:

```bash
cp .env.todo.example .env.todo
```

Edit `.env.todo` to configure:

- `TODO_ENFORCEMENT_STRICT`: Enable strict mode (recommended: true)
- `TODO_COMPLIANCE_THRESHOLD`: Minimum compliance percentage (recommended: 80)
- `TODO_AUTO_CREATE`: Auto-create todos for operations (recommended: true)

### 2. Git Hooks Setup

Install the enhanced git hooks:

```bash
./scripts/setup-git-hooks.sh
```

This will install:

- Pre-commit hook with todo validation
- Pre-push hook with compliance checking
- Commit-msg hook validation

### 3. Agent Integration

Update agent definitions to include TodoWrite tool:

```json
{
  "name": "your-agent",
  "tools": ["TodoWrite", "TodoRead", "other-tools..."]
}
```

### 4. MCP Client Bridge Integration

The MCP Client Bridge is already integrated with todo enforcement. To enable:

```bash
cd mcp.ecosystem/mcp.clients/mcp.client-bridge
npm install
npm start
```

## Usage

### 1. Basic Todo Enforcement

For any agent operation, todos are automatically validated:

```bash
# Run agent with todo validation
node scripts/agent-todo-integration.js mcp-client-bridge process-request

# Monitor compliance
node scripts/agent-todo-integration.js monitor

# Initialize all agents with todos
node scripts/agent-todo-integration.js any init-all
```

### 2. Using Todo Templates

Create todos from predefined templates:

```bash
# Get template for operation
node scripts/todo-templates.js get mcp-client-bridge process-request

# Create todo from template
node scripts/todo-templates.js create general read-file --filePath /path/to/file

# List available templates
node scripts/todo-templates.js list mcp-client-bridge
```

### 3. Manual Todo Management

Direct todo operations:

```bash
# Validate todos for operation
node scripts/todo-enforcement-hook.js validate-operation your-agent your-operation

# Get compliance metrics
node scripts/todo-enforcement-hook.js compliance

# Create initial todo
node scripts/todo-enforcement-hook.js create-todo your-agent "Your todo content"
```

## Agent Workflow Integration

### 1. Todo-First Workflow Pattern

All agents must follow this pattern:

1. **Create Todo**: Use TodoWrite to create a todo for the operation
2. **Validate Todo**: System validates todo exists and is relevant
3. **Execute Operation**: Perform the actual work
4. **Update Todo**: Mark todo as completed or update progress
5. **Activate Next Todo**: Move to the next pending todo

### 2. Example Agent Workflow

```javascript
// Agent execution with todo enforcement
const todoHook = new TodoEnforcementHook();

// 1. Create todo for operation
await todoHook.createTodoForOperation("read-file", {
  filePath: "/path/to/file",
  priority: "medium",
});

// 2. Validate todo exists
await todoHook.validateTodoForOperation("read-file", "agent-id", {
  file: "/path/to/file",
});

// 3. Execute operation
const result = await readFile("/path/to/file");

// 4. Update todo status
await todoHook.updateTodoStatus("read-file", {
  success: true,
  result: result,
});
```

### 3. MCP Bridge Integration

The MCP Client Bridge automatically enforces todos for all operations:

- Natural language requests require relevant todos
- Server connections need connection management todos
- Tool executions require operation-specific todos
- Results update todo status automatically

## Monitoring and Compliance

### 1. Compliance Metrics

Track todo compliance across all agents:

```bash
# Get current compliance metrics
node scripts/agent-todo-integration.js monitor

# Output includes:
# - Total agents with active todos
# - Compliance percentage
# - Active todo count
# - Recommendations for improvement
```

### 2. CI/CD Integration

GitHub Actions automatically validate todo compliance:

- Todo validation on every push/PR
- Compliance threshold checking
- Automated reporting with PR comments
- Integration test validation

### 3. Git Hook Integration

Local development includes:

- Pre-commit todo validation
- Warning for operations without todos
- Automatic todo suggestions
- Compliance reporting

## Configuration Options

### 1. Strict Mode

When `TODO_ENFORCEMENT_STRICT=true`:

- Operations without todos are blocked
- Non-compliant commits are rejected
- CI/CD failures on low compliance
- Mandatory todo creation

### 2. Compliance Threshold

Set minimum compliance percentage:

- `TODO_COMPLIANCE_THRESHOLD=80` (recommended)
- Fails CI/CD if below threshold
- Generates warnings for low compliance
- Provides improvement suggestions

### 3. Auto-Creation

When `TODO_AUTO_CREATE=true`:

- Automatically creates todos for operations
- Uses template-based todo generation
- Reduces manual todo management
- Maintains compliance

## Troubleshooting

### 1. Common Issues

**Issue**: "Todo validation failed" error
**Solution**: Create a relevant todo before executing the operation

**Issue**: Low compliance rate
**Solution**: Enable auto-creation or manually create todos for operations

**Issue**: Git hooks not working
**Solution**: Re-run `./scripts/setup-git-hooks.sh`

**Issue**: CI/CD failures
**Solution**: Check compliance threshold and strict mode settings

### 2. Debug Mode

Enable debug logging:

```bash
export TODO_LOG_LEVEL=debug
export TODO_ENFORCEMENT_STRICT=false  # For testing
```

### 3. Recovery

Reset todo system:

```bash
# Backup existing todos
cp .mcp-shared-knowledge/tasks/shared_tasks.json todos-backup.json

# Reset to empty state
echo "[]" > .mcp-shared-knowledge/tasks/shared_tasks.json

# Re-initialize
node scripts/agent-todo-integration.js any init-all
```

## Best Practices

### 1. Todo Creation

- Use descriptive todo content
- Set appropriate priority levels
- Include relevant context in todos
- Use templates when possible

### 2. Agent Development

- Always create todos before operations
- Update todo status after completion
- Handle todo validation errors gracefully
- Use template-based todo generation

### 3. Team Collaboration

- Enable strict mode for team projects
- Set appropriate compliance thresholds
- Monitor compliance metrics regularly
- Use CI/CD integration for enforcement

## Advanced Features

### 1. Custom Templates

Create custom todo templates:

```javascript
// Add custom template
templates.addTemplate("my-agent", "my-operation", {
  content: "Custom operation: {description}",
  priority: "high",
  estimatedTime: "15-30 minutes",
});
```

### 2. Context-Aware Validation

The system supports context-aware todo matching:

- File-based operations match file-specific todos
- Server operations match server-specific todos
- Feature development matches feature-specific todos

### 3. Integration with External Systems

The todo system can integrate with:

- Project management tools (Jira, Trello)
- Time tracking systems
- Monitoring and alerting systems
- Custom workflow engines

## Migration Guide

### 1. Existing Agents

To migrate existing agents:

1. Add TodoWrite tool to agent definition
2. Update agent code to create todos before operations
3. Integrate with todo validation hooks
4. Test with strict mode disabled first
5. Enable strict mode after validation

### 2. Existing Workflows

To migrate existing workflows:

1. Identify operations that need todos
2. Create appropriate todo templates
3. Update CI/CD pipelines
4. Configure git hooks
5. Train team on new workflow

## Support and Maintenance

### 1. Regular Maintenance

- Monitor compliance metrics weekly
- Update templates as needed
- Review and adjust configuration
- Backup todo data regularly

### 2. Updates and Improvements

- System updates through package management
- Template updates through configuration
- Feature additions through modular design
- Community contributions through GitHub

---

**Last Updated**: 2025-10-29  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
