# Proposed MCP Server Organization Plan

## Current Issues:
1. PM2 is resource-intensive and we want to remove it
2. Servers don't have individual directories with their own config files
3. Need to preserve existing .env files and create a shared .env

## Proposed Solution:

### 1. Create Individual Server Directories
Each server will have its own directory with:
- Server code files
- Configuration files specific to that server
- Environment files
- README/documentation
- Tests (if applicable)

### 2. Remove PM2 Dependency
Replace PM2 with:
- Individual systemd services (Linux)
- Launchd services (macOS)
- Docker containers with docker-compose
- Simple shell scripts for development

### 3. Shared Configuration
- Create a shared .env file at the root
- Allow each server to have its own .env override
- Use configuration inheritance

## Proposed Directory Structure:

```
mcp-ecosystem/
├── README.md                           # Main documentation
├── .env                                # Shared environment variables
├── docker-compose.yml                  # For containerized deployment
├── launch.sh                           # Main launcher script
├── systemd/                            # Systemd service files (Linux)
│   ├── mcp-browsertools.service
│   ├── mcp-desktop-control.service
│   ├── mcp-filesystem.service
│   └── ... (one for each server)
├── launchd/                            # Launchd plists (macOS)
│   ├── com.mcp.browsertools.plist
│   ├── com.mcp.desktop-control.plist
│   ├── com.mcp.filesystem.plist
│   └── ... (one for each server)
├── core/
│   ├── config/
│   │   ├── mcp.json                    # Main MCP configuration
│   │   └── shared.env                  # Shared environment variables
│   ├── mcp_proxy.js                    # MCP proxy server
│   ├── lazy_loader.js                 # Lazy loading server manager
│   └── orchestrator.js                # System orchestrator
├── servers/
│   ├── browsertools/
│   │   ├── browsertools_server.js     # Server code
│   │   ├── config.json                # Server-specific config
│   │   ├── .env                       # Server-specific environment
│   │   ├── README.md                  # Server documentation
│   │   └── tests/                      # Server tests
│   ├── desktop-control/
│   │   ├── desktop_control_server.js
│   │   ├── config.json
│   │   ├── .env
│   │   ├── README.md
│   │   └── tests/
│   ├── filesystem/
│   │   ├── filesystem_server.js
│   │   ├── config.json
│   │   ├── .env
│   │   ├── README.md
│   │   └── tests/
│   ├── gemini-bridge/
│   │   ├── gemini_bridge.js
│   │   ├── config.json
│   │   ├── .env
│   │   ├── README.md
│   │   └── tests/
│   ├── google-suite/
│   │   ├── google_suite_server.js
│   │   ├── config.json
│   │   ├── .env
│   │   ├── README.md
│   │   └── tests/
│   ├── mem0/
│   │   ├── mem0_server.py             # Python implementation
│   │   ├── mem0_server.js             # JavaScript implementation
│   │   ├── config.json
│   │   ├── .env
│   │   ├── README.md
│   │   ├── requirements.txt           # Python dependencies
│   │   ├── package.json               # Node.js dependencies
│   │   └── tests/
│   ├── notion/
│   │   ├── notion_server.js
│   │   ├── config.json
│   │   ├── .env
│   │   ├── README.md
│   │   └── tests/
│   ├── task/
│   │   ├── task_server.js
│   │   ├── config.json
│   │   ├── .env
│   │   ├── README.md
│   │   └── tests/
│   └── webfetch/
│       ├── webfetch_server.js
│       ├── config.json
│       ├── .env
│       ├── README.md
│       └── tests/
├── integrations/
│   ├── Rube/
│   │   ├── ... (keep existing structure)
│   │   └── mcp/
│   │       ├── rube-mcp-server.js    # Rube MCP adapter
│   │       ├── config.json
│   │       ├── .env
│   │       └── README.md
│   ├── mcp-integration-project/
│   │   └── ... (keep existing structure)
│   ├── mcp-platform/
│   │   └── ... (keep existing structure)
│   └── mcp-superassistant/
│       └── ... (keep existing structure)
├── clients/                            # MCP client libraries
├── tools/                              # MCP tools and utilities
├── docs/                               # General documentation
│   ├── QWEN.md
│   ├── architecture.md
│   └── ... (existing docs)
├── examples/                           # Example implementations
└── scripts/                            # Utility scripts
    ├── dev-launch.sh                   # Development launcher
    ├── prod-launch.sh                  # Production launcher
    └── health-check.sh                 # Health monitoring

## Implementation Steps:

1. Create the new directory structure
2. Move existing server files to their respective directories
3. Create configuration files for each server
4. Extract and preserve existing environment variables
5. Create a shared .env file with common variables
6. Create launcher scripts for different deployment scenarios
7. Create systemd/launchd service files for production deployment
8. Update documentation to reflect the new structure
9. Test each server individually
10. Test the integrated system

## Benefits:

1. **Resource Efficiency**: No PM2 overhead
2. **Scalability**: Easy to add/remove servers
3. **Maintainability**: Each server isolated with its own config
4. **Flexibility**: Multiple deployment options (dev, prod, containerized)
5. **Configuration Management**: Clear separation of shared vs. server-specific configs
6. **Standardization**: Consistent structure across all servers
```