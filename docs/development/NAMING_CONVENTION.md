# MCP Ecosystem Naming Convention Standard

## Overview
This document establishes a consistent naming convention for all components within the MCP ecosystem to eliminate confusion and ensure uniformity across all services, directories, and files.

## Naming Convention Rules

### 1. General Principles
- Use lowercase with hyphens for separation (kebab-case)
- Be descriptive but concise
- Use singular nouns for components
- Use plural nouns for collections/directories containing multiple items

### 2. Component Prefixes
All MCP ecosystem components MUST use one of these prefixes:
- `mcp.` - For core MCP components and services
- `@` - For scoped packages/modules (Node.js convention)

### 3. Component Types and Naming Patterns

#### Servers
Pattern: `mcp.[service-name]-server`
Examples:
- `mcp.gemini-bridge-server`
- `mcp.mem0-server`
- `mcp.notion-server`
- `mcp.task-server`

#### Clients
Pattern: `mcp.[service-name]-client`
Examples:
- `mcp.gemini-bridge-client`
- `mcp.mem0-client`

#### Bridges
Pattern: `mcp.[service-name]-bridge`
Examples:
- `mcp.gemini-bridge`
- `mcp.qwen-bridge`

#### Agents
Pattern: `mcp.[service-name]-agent`
Examples:
- `mcp.client-bridge-agent`
- `mcp.memory-agent`

#### Libraries
Pattern: `@mcp/[library-name]`
Examples:
- `@mcp/sdk`
- `@mcp/client`
- `@mcp/server`

#### Tools
Pattern: `mcp.[tool-name]`
Examples:
- `mcp.webfetch`
- `mcp.filesystem`

### 4. Directory Structure

#### Root Directories
```
mcp-ecosystem/
├── mcp.clients/              # All client implementations
├── mcp.servers/              # All server implementations
├── mcp.bridges/              # All bridge implementations
├── mcp.agents/               # All agent implementations
├── mcp.libs/                 # Library packages
├── mcp.tools/                # Tool implementations
└── mcp.docs/                # Documentation
```

#### Component Directories
```
mcp.clients/
└── mcp.client-bridge/
    ├── package.json          # Package definition
    ├── README.md             # Component documentation
    ├── src/                  # Source code
    │   ├── index.js          # Entry point
    │   ├── client.js         # Main client implementation
    │   └── utils/            # Utility functions
    ├── config/               # Configuration files
    ├── tests/                # Test files
    └── examples/             # Example usage
```

### 5. File Naming

#### Source Files
- Use kebab-case for filenames: `client-bridge.js`, `persistent-storage.js`
- Use descriptive names that clearly indicate purpose
- Group related files in appropriately named directories

#### Configuration Files
- Main config: `mcp.config.json`
- Component config: `[component-name].config.json`
- Environment: `.env`

### 6. Package Names (Node.js)
- Scoped packages: `@mcp/[component-name]`
- Examples: `@mcp/client-bridge`, `@mcp/gemini-bridge`

### 7. Server Naming Examples
| Component Purpose | Directory Name | File Name | Package Name |
|------------------|----------------|-----------|--------------|
| Gemini AI Bridge | `mcp.gemini-bridge` | `gemini-bridge.js` | `@mcp/gemini-bridge` |
| Mem0 Service | `mcp.mem0` | `mem0-server.js` | `@mcp/mem0` |
| Notion Integration | `mcp.notion` | `notion-server.js` | `@mcp/notion` |
| File System Ops | `mcp.filesystem` | `filesystem-server.js` | `@mcp/filesystem` |

### 8. Client Naming Examples
| Component Purpose | Directory Name | File Name | Package Name |
|------------------|----------------|-----------|--------------|
| Client Bridge | `mcp.client-bridge` | `client-bridge.js` | `@mcp/client-bridge` |
| Gemini Client | `mcp.gemini-client` | `gemini-client.js` | `@mcp/gemini-client` |

### 9. Bridge Naming Examples
| Component Purpose | Directory Name | File Name | Package Name |
|------------------|----------------|-----------|--------------|
| Qwen Bridge | `mcp.qwen-bridge` | `qwen-bridge.js` | `@mcp/qwen-bridge` |
| Gemini Bridge | `mcp.gemini-bridge` | `gemini-bridge.js` | `@mcp/gemini-bridge` |

## Migration Plan

### Phase 1: Standardize Existing Components
1. Rename directories to follow naming convention
2. Update references in code and configuration files
3. Update package.json files with correct names

### Phase 2: Update File Names
1. Rename files to follow kebab-case convention
2. Update imports and references
3. Update documentation

### Phase 3: Update Package Names
1. Update package.json with scoped package names
2. Update import statements
3. Publish updated packages

## Implementation Checklist

### Current Components to Standardize
- [ ] `mcp-client-bridge` → `mcp.client-bridge`
- [ ] `gemini-bridge` → `mcp.gemini-bridge`
- [ ] `mem0-server` → `mcp.mem0`
- [ ] `notion-server` → `mcp.notion`
- [ ] `task-server` → `mcp.task`
- [ ] `webfetch-server` → `mcp.webfetch`
- [ ] `filesystem-server` → `mcp.filesystem`
- [ ] `desktop-control-server` → `mcp.desktop-control`
- [ ] `browsertools-server` → `mcp.browsertools`
- [ ] `google-suite-server` → `mcp.google-suite`

### New Components to Follow Convention
- [ ] All new components must follow the established naming convention
- [ ] Documentation must reference the naming convention
- [ ] CI/CD pipelines must validate naming consistency

This naming convention ensures consistency, clarity, and maintainability across the entire MCP ecosystem.