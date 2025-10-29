# Agent Guidelines for MCP Ecosystem

## Build/Test Commands

- **Build**: `npm run build` (lint + test)
- **Lint**: `npm run lint` (ESLint on tools/scripts/\*.js)
- **Lint fix**: `npm run lint:fix`
- **Format**: `npm run format` (Prettier on tools/scripts/\*_/_.js)
- **Test all**: `npm test` (Jest)
- **Test watch**: `npm run test:watch`
- **Test coverage**: `npm run test:coverage`
- **Test single file**: `npm test -- tests/filename.test.js`
- **Coverage check**: `npm run coverage:check` (80% threshold)

## Code Style Guidelines

### File Naming

- Use kebab-case: `documentation-sync.js`, `shared-todo-cli.js`
- No spaces or uppercase in filenames
- Component prefix: `mcp.` for ecosystem components

### Code Structure

- ES6 modules with `import`/`export`
- JSDoc comments for all public functions/classes
- Class-based architecture with clear separation of concerns
- Proper error handling with try/catch blocks

### Imports & Dependencies

- Group imports: standard library, third-party, local modules
- Use ES6 import syntax
- Prefer named imports over default when possible

### Formatting

- 2-space indentation
- Semicolons required
- Single quotes for strings
- Trailing commas in objects/arrays

### Error Handling

- Use try/catch for async operations
- Throw descriptive Error objects
- Log errors appropriately
- Graceful degradation when possible

### Testing

- Jest framework with coverage requirements
- 70% minimum coverage for branches/functions/lines/statements
- Test files: `filename.test.js` in `tests/` directory
- Mock external dependencies appropriately

### Git Workflow

- Conventional commits: `type(scope): description`
- Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert
- Branch naming: main, develop, feature/_, bugfix/_, hotfix/_, release/_

## 🤖 Unified LLM Coordination System

### Overview

The MCP ecosystem features a **Unified LLM Coordination System** that serves as the central authority for both coordination and todo management. This system has been successfully integrated with real MCP operations through a dedicated bridge, providing production-ready multi-agent workflow management.

### 🎯 Primary Interface: Unified LLM Coordinator

**📋 [tools/scripts/llm-coordinator-unified.js](tools/scripts/llm-coordinator-unified.js)** - _Central Authority_

The Unified LLM Coordinator combines all coordination and todo functionality:

1. **Todo Management** (absorbed from separate CLI)
2. **LLM Coordination** (session management, conflict prevention)
3. **MCP Bridge Integration** (real MCP operations)
4. **Enforcement System** (mandatory todo validation)

### 🔗 MCP Bridge Integration

**📋 [tools/scripts/mcp-coordinator-bridge.js](tools/scripts/mcp-coordinator-bridge.js)** - _Real MCP Operations_

The MCP Bridge connects Unified Coordinator with actual MCP operations:

- **File Operations**: Read/write files with validation
- **Code Search**: Fast code search with ripgrep
- **Server Management**: List and manage MCP servers
- **Tool Execution**: Execute MCP tools with context

### ✅ Integration Status: COMPLETE

The unified coordination system is **production-ready** with:

- ✅ Real MCP operations instead of simulation
- ✅ Todo enforcement for all operations
- ✅ Session persistence across commands
- ✅ Comprehensive error handling
- ✅ Real-time monitoring and metrics

### 🚀 Agent Responsibilities

#### Quick Start with Unified Coordination

```bash
# 1. Start coordinated session with todo (creates todo automatically)
node tools/scripts/mcp-coordinator-bridge.js start-session your-agent "Your task description" --high

# 2. Execute real MCP operations with todo validation
node tools/scripts/mcp-coordinator-bridge.js execute your-agent file-read --filePath ./src/app.js
node tools/scripts/mcp-coordinator-bridge.js execute your-agent search-code --pattern "function" --path ./src

# 3. Monitor status
node tools/scripts/mcp-coordinator-bridge.js status
```

#### Advanced Coordinator Operations

```bash
# Direct coordinator operations
node tools/scripts/llm-coordinator-unified.js create your-agent "Another task" --medium
node tools/scripts/llm-coordinator-unified.js start your-agent todo-12345
node tools/scripts/llm-coordinator-unified.js status

# Session management
node tools/scripts/llm-coordinator-unified.js register project branch activity
node tools/scripts/llm-coordinator-unified.js execute "operation" '{"context": "data"}'
node tools/scripts/llm-coordinator-unified.js complete-op "operation"
```

#### Legacy Coordination (Still Available)

```bash
# Session manager for persistent workflows
node tools/scripts/llm-session-manager.js start-session agent-id "Task title"
node tools/scripts/llm-session-manager.js execute "operation" '{"context": "data"}'
node tools/scripts/llm-session-manager.js complete "operation"
node tools/scripts/llm-session-manager.js end-session
```

### Coordination Rules

#### Branch Switching

- **Required**: Coordination check before switching branches
- **Block Active Branches**: Cannot switch to branches with active sessions
- **Force Override**: Available with `--force` flag (emergency only)

#### Todo Management

- **Assignment Required**: Critical operations need agent assignment
- **Duplicate Prevention**: Warnings about potential duplicate work
- **Priority Enforcement**: Optional priority-based enforcement

#### Git Operations

- **Clean Working Directory**: Push/merge requires clean state
- **Protected Branch Safety**: No force pushes to main/master/develop
- **Status Check Required**: Coordination validation before operations

#### Session Management

- **Session Limits**: Maximum 3 sessions per branch
- **Timeout Enforcement**: 120-minute session timeout
- **Activity Updates**: Regular activity updates required

### 🔗 MCP Integration

The unified coordination system is fully integrated with real MCP operations:

#### Real MCP Operations via Bridge

```bash
# File operations with todo validation
node tools/scripts/mcp-coordinator-bridge.js execute agent-id file-read --filePath ./src/app.js
node tools/scripts/mcp-coordinator-bridge.js execute agent-id file-write --filePath ./test.js --content "code"

# Code search operations
node tools/scripts/mcp-coordinator-bridge.js execute agent-id search-code --pattern "function" --path ./src

# Server management
node tools/scripts/mcp-coordinator-bridge.js execute agent-id list-servers
node tools/scripts/mcp-coordinator-bridge.js execute agent-id execute-tool --toolName mcp-connect
```

#### Bridge Status and Monitoring

```bash
# Check bridge status
node tools/scripts/mcp-coordinator-bridge.js status

# Clean up connections
node tools/scripts/mcp-coordinator-bridge.js cleanup
```

#### Legacy Orchestrator Integration (Optional)

```bash
# Health check via orchestrator (if running)
curl http://localhost:3103/coordination/health

# Status via orchestrator
curl http://localhost:3103/coordination/status
```

### Agent ID Convention

Use consistent agent IDs following this pattern:

- `documentation-agent` - For documentation tasks
- `test-agent` - For testing tasks
- `dev-agent` - For development tasks
- `review-agent` - For code review tasks

### 🛠️ Error Handling

If unified coordination operations fail:

1. **Check bridge status**: `node tools/scripts/mcp-coordinator-bridge.js status`
2. **Verify coordinator status**: `node tools/scripts/llm-coordinator-unified.js status`
3. **Check todo validation**: Ensure todos exist and are properly assigned
4. **Review session data**: Check for active sessions and conflicts
5. **Use force flags**: Only in emergencies with proper understanding

### 📊 Monitoring and Metrics

The unified system provides comprehensive monitoring:

#### Bridge Monitoring

- Real-time MCP connection status
- Operation execution metrics
- Todo compliance rates
- Resource usage tracking

#### Coordinator Monitoring

- Active session tracking
- Todo creation and completion rates
- Agent activity metrics
- Violation detection and reporting

#### Performance Metrics

- Operation latency and success rates
- Todo enforcement compliance
- Session persistence health
- System resource utilization

### 🎯 Best Practices

#### Unified Coordination Workflow

1. **Use MCP bridge for operations** - Primary interface for real MCP work
2. **Start coordinated sessions** - Creates todos automatically and tracks work
3. **Validate before executing** - All operations require todo validation
4. **Monitor bridge status** - Check connections and operation health
5. **Complete operations properly** - Ensures todo tracking and audit trails

#### Todo Management

1. **Descriptive task titles** - Clear, actionable todo descriptions
2. **Appropriate priorities** - Use priority flags for important work
3. **Proper assignment** - Assign todos to correct agents
4. **Complete with notes** - Add context and results when completing todos

#### Session Management

1. **Start sessions before work** - Ensures proper coordination
2. **End sessions promptly** - Frees up resources and prevents conflicts
3. **Monitor session health** - Check for timeouts and issues
4. **Use persistent sessions** - For long-running workflows

#### MCP Operations

1. **Use bridge for file operations** - Real file I/O with validation
2. **Leverage code search** - Fast, structured code searching
3. **Monitor server status** - Track MCP server health
4. **Execute tools properly** - Use correct context and parameters

#### Communication

1. **Coordinate with other agents** - Prevent duplicate work
2. **Share session information** - Keep team informed
3. **Report issues promptly** - Help maintain system health
4. **Document workflows** - Share best practices and patterns

### 🔧 Troubleshooting

#### Common Issues

**"MCP Bridge operation failed: validation failed"**

- Check if you have active todos for the operation
- Verify your agent ID and permissions
- Create appropriate todos before executing operations

**"Session start failed: MCP connection timeout"**

- Check if MCP servers are running
- Verify network connectivity
- Use simplified session start without MCP connection

**"Todo operation blocked: assignment required"**

- Ensure you're using the correct agent ID
- Check if the todo is already assigned to another agent
- Request assignment from the current assignee

**"File operation failed: permission denied"**

- Check file permissions and paths
- Ensure you have proper access rights
- Use absolute paths when necessary

**"Search operation returned no results"**

- Verify search pattern and path
- Check if files exist in the specified path
- Use broader search patterns

#### Getting Help

**Quick Diagnostics**

```bash
# Check bridge status
node tools/scripts/mcp-coordinator-bridge.js status

# Check coordinator status
node tools/scripts/llm-coordinator-unified.js status

# Check todo status
node tools/scripts/llm-coordinator-unified.js todo-status your-agent
```

**Common Solutions**

- **Restart bridge**: `node tools/scripts/mcp-coordinator-bridge.js cleanup`
- **Check sessions**: Look for conflicting or expired sessions
- **Verify todos**: Ensure todos exist and are properly assigned
- **Test operations**: Try simple operations first

**Advanced Troubleshooting**

- Review session logs in `.llm-session.json`
- Check coordination data in `.llm-coordination.json`
- Examine todo storage in `data/shared-knowledge/.mcp-shared-knowledge/tasks/shared_tasks.json`
- Contact other agents if conflicts persist

**Documentation Resources**

- 📖 [MCP Bridge Integration Guide](MCP_BRIDGE_INTEGRATION_COMPLETE.md)
- 📖 [Unified Coordination Guide](UNIFIED_COORDINATION_COMPLETE.md)
- 📖 [Integration Guide](docs/LLM_COORDINATION_TODO_INTEGRATION_GUIDE.md)

## 🚀 What's Next: Future Roadmap

### Immediate Priorities (Next Session)

1. **Advanced MCP Bridge Features**
   - Batch operations support
   - Enhanced error recovery
   - Performance optimizations
   - Additional MCP tool integrations

2. **Comprehensive Testing Suite**
   - Unit tests for unified coordinator
   - Integration tests for MCP bridge
   - End-to-end workflow testing
   - Performance and load testing

3. **Monitoring Dashboard**
   - Real-time metrics visualization
   - Todo compliance dashboard
   - MCP operation analytics
   - System health monitoring

### Medium-term Goals

1. **Multi-Server Coordination**
   - Coordinate across multiple MCP servers
   - Distributed session management
   - Cross-server todo enforcement
   - Load balancing and failover

2. **AI-Enhanced Features**
   - Smart operation suggestions
   - Automated todo creation
   - Context-aware recommendations
   - Predictive conflict detection

3. **Enterprise Features**
   - Role-based access control
   - Advanced audit logging
   - Compliance reporting
   - Multi-tenant support

### Long-term Vision

1. **Ecosystem Expansion**
   - Integration with more MCP tools
   - Plugin architecture for extensions
   - Third-party integrations
   - Community contribution framework

2. **Advanced Coordination**
   - Hierarchical coordination systems
   - Cross-repository coordination
   - Workflow automation
   - Intelligent resource allocation

## 📋 Current Session Status

### ✅ Completed (This Session)

- [x] MCP Bridge integration with real operations
- [x] Todo enforcement for all MCP operations
- [x] File operations, search, and server management
- [x] Documentation updates and guides
- [x] AGENTS.md update with unified coordination

### 🔄 In Progress

- [ ] Advanced MCP bridge features and optimizations
- [ ] Performance monitoring and metrics dashboard
- [ ] Comprehensive testing suite implementation

### ⏳ Pending (Future Sessions)

- [ ] Multi-server coordination support
- [ ] AI-enhanced coordination features
- [ ] Enterprise-grade access control
- [ ] Ecosystem expansion and plugins

---

**Last Updated**: 2025-10-29  
**System Status**: ✅ Production Ready  
**Next Session**: Advanced features and testing suite
