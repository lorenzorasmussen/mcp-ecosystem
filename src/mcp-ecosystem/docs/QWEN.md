# MCP (Model Context Protocol) System

## Project Overview

This directory contains the complete MCP (Model Context Protocol) ecosystem that provides seamless integration between language models/AI tools and various applications and services. The system is designed to work with any development environment and provides lazy-loading server architecture for efficient resource usage.

The MCP system consists of several key components:
- **Lazy Loader API** - REST API for on-demand server management (port 3007)
- **MCP Proxy** - Centralized proxy server for routing tool calls
- **Multiple MCP servers** - For different services (filesystem, git, web, AI tools, etc.)
- **Integration servers** - Custom implementations for specific services (Mem0, Notion, Google Suite, etc.)
- **Rube MCP Server** - Advanced integration server connecting to 500+ apps

## Architecture

The system follows a microservices architecture with:

1. **Core Infrastructure** - Always-running services managed by PM2
   - Lazy loader API (port 3007)
   - MCP proxy server
   - MCP memory server
   - Opencode bridge

2. **On-Demand Servers** - Started automatically when needed
   - Language servers (TypeScript, Python, Rust, Go, etc.)
   - LLM servers (llama-cpp, Ollama, vLLM, etc.)
   - Development tools (ESLint, Prettier, formatters)
   - Integration servers (Mem0, Notion, Google Suite, etc.)

3. **Orchestration Layer** - Coordinating different services
   - MCP Orchestrator
   - Health monitoring
   - Multi-agent coordination

## Building and Running

### Prerequisites
- Node.js (with npm/pnpm)
- PM2 process manager
- Git
- For LLM servers: llama.cpp, Ollama, or similar tools

### Starting the System

The system is managed through PM2:

```bash
# Start all services
cd ~/.local/share/mcp
pm2 start ecosystem.config.cjs

# Check status
pm2 list
pm2 logs lazy-loader
pm2 logs mcp-proxy

# View system status
curl http://localhost:3007/servers/status

# Monitor resources
pm2 monit
```

### Available Endpoints

The lazy loader API (port 3007) provides:
- `GET /servers` - List available servers
- `GET /servers/status` - Overall status
- `POST /start/:serverName` - Start a specific server
- `POST /stop/:serverName` - Stop a specific server
- `GET /status/:serverName` - Check specific server status

### Using the System

The system can be used in several ways:

1. **Automatic Detection**: Navigate to any project directory, and the system will automatically detect the project type and start appropriate servers.

2. **Manual Server Management**: Use the REST API to start/stop specific servers:
```bash
curl -X POST http://localhost:3007/start/typescript-language-server
curl -X POST http://localhost:3007/start/gemini-bridge
```

3. **Project-Specific Configuration**: Create `.mcp.json` in project directories to specify which servers to use for that project.

## Key Components

### Lazy Loader (lazy_loader.js)
Implements a REST API for managing MCP servers with lazy loading. It supports:
- 50+ different server types
- Memory optimization for each server type
- Auto-shutdown of idle servers after 30 minutes
- Resource limits per server type

### MCP Proxy (mcp_proxy.js)
Acts as a central coordinator that:
- Manages communication between clients and servers
- Routes tool calls to appropriate servers
- Maintains tool discovery and registration
- Handles server lifecycle management

### Rube MCP Server
Advanced integration server that connects AI tools to 500+ apps including:
- Gmail, Slack, GitHub, Notion, Linear, Airtable
- Trello, Asana, Jira, Google Drive
- Implements full MCP protocol compliance
- OAuth 2.0 with PKCE for secure connections

### Integration Servers
Custom implementations for specific services:
- Mem0 for memory management
- Notion integration
- Google Suite (Gmail, Docs, Sheets, etc.)
- Browser automation tools
- File system operations

## Development Conventions

### Resource Management
- Servers consume 0 resources when idle
- Automatic startup based on file access patterns
- Memory limits prevent resource exhaustion
- Baseline memory: <200MB for core services
- Auto-shutdown after 30 minutes of idle time

### Configuration
- Global configuration in `~/.local/share/mcp/mcp.json`
- Project-specific configuration in `.mcp.json` files
- Environment variables for sensitive information
- PM2 config in `ecosystem.config.cjs`

### Error Handling
- Comprehensive error handling in all components
- Health monitoring and automatic recovery
- Logging to files in the logs directory
- Graceful degradation when services are unavailable

## Performance Targets

- **Startup Time**: <30 seconds for core infrastructure
- **Server Start**: <5 seconds for on-demand services
- **Memory Baseline**: <200MB (core services only)
- **Auto-shutdown**: 30 minutes idle timeout
- **Recovery Time**: <10 seconds for failed services

## Troubleshooting

### Common Issues

1. **Server Won't Start**:
```bash
# Check logs
pm2 logs lazy-loader

# Manual start
cd ~/.local/share/mcp
node lazy_loader.js
```

2. **Port Conflicts**:
```bash
lsof -i :3007
# Update port in ecosystem.config.cjs
pm2 restart ecosystem.config.cjs
```

3. **Memory Issues**:
```bash
pm2 monit
# Restart with memory limits
pm2 restart --max-memory-restart
```

### Recovery Procedures

```bash
# Total system restart
pm2 stop all && pm2 delete all
pm2 start ecosystem.config.cjs

# Individual server restart
curl -X POST http://localhost:3007/restart/typescript-language-server
```

## Integration with AI Tools

The system is designed to work with various AI tools and LLMs:
- Claude Desktop/Free/Code
- Cursor IDE
- VSCode
- Custom AI clients supporting MCP protocol
- Multiple LLM backends (Gemini, OpenAI, anthropic, local models)

The mcp-connect.sh script provides a utility to:
- Check status of MCP ecosystem
- Start/stop specific servers
- Auto-detect project types and start appropriate servers
- Create project-specific configurations