# MCP Ecosystem Standardized Structure

## Overview
This document outlines the standardized directory structure for the MCP ecosystem following the established naming convention.

## Standardized Directory Structure

```
/Users/lorenzorasmussen/.local/share/mcp/mcp.ecosystem/
├── mcp.clients/
│   └── mcp.client-bridge/              # MCP Client Bridge implementation
│       ├── package.json
│       ├── README.md
│       ├── index.js
│       ├── init.sh
│       ├── src/
│       │   ├── config/
│       │   ├── models/
│       │   ├── services/
│       │   ├── routes/
│       │   └── utils/
│       ├── config/
│       ├── data/
│       ├── logs/
│       ├── tests/
│       └── docs/
├── mcp.servers/
│   ├── mcp.browsertools               # Browsertools server
│   ├── mcp.desktop-control             # Desktop control server
│   ├── mcp.filesystem                  # Filesystem operations server
│   ├── mcp.gemini-bridge               # Gemini AI bridge server
│   ├── mcp.google-suite                # Google Suite integration server
│   ├── mcp.mem0.js                     # Mem0 JavaScript server
│   ├── mcp.mem0.py                     # Mem0 Python server
│   ├── mcp.notion                      # Notion integration server
│   ├── mcp.task                        # Task management server
│   └── mcp.webfetch                    # Web content fetching server
├── mcp.bridges/
│   ├── mcp.qwen-bridge.js              # Qwen AI bridge
│   └── mcp.gemini-bridge.js            # Gemini AI bridge (alternative implementation)
├── mcp.agents/
├── mcp.libs/
├── mcp.tools/
└── mcp.docs/
    └── NAMING_CONVENTION.md            # Naming convention documentation
```

## Naming Convention Summary

### Component Prefixes
All MCP ecosystem components use one of these prefixes:
- `mcp.` - For core MCP components and services
- `@` - For scoped packages/modules (Node.js convention)

### Component Types and Naming Patterns

#### Servers
Pattern: `mcp.[service-name]`
Examples:
- `mcp.gemini-bridge`
- `mcp.mem0.js`
- `mcp.notion`
- `mcp.task`

#### Clients
Pattern: `mcp.[service-name]-client`
Examples:
- `mcp.client-bridge`

#### Bridges
Pattern: `mcp.[service-name]-bridge`
Examples:
- `mcp.gemini-bridge`

#### Agents
Pattern: `mcp.[service-name]-agent`
Examples:
- `mcp.client-bridge-agent`

#### Libraries
Pattern: `@mcp/[library-name]`
Examples:
- `@mcp/sdk`
- `@mcp/client`

## Migration Status

### Completed Migrations
- ✅ Client Bridge: `mcp-client-bridge` → `mcp.client-bridge`
- ✅ Server Naming: All servers standardized to `mcp.[service-name]` pattern
- ✅ Directory Structure: Consolidated to `/mcp.ecosystem/` with standardized subdirectories

### Benefits Achieved
1. **Consistency**: All components follow the same naming pattern
2. **Clarity**: Component purpose is immediately apparent from name
3. **Organization**: Logical directory structure with clear separation of concerns
4. **Maintainability**: Easy to locate and modify specific components
5. **Extensibility**: Clear patterns for adding new components
6. **No Duplicates**: Consolidated all duplicate implementations

This standardized structure provides a solid foundation for the MCP ecosystem with clear naming conventions that eliminate confusion and ensure uniformity across all services.