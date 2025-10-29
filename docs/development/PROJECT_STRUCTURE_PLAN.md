# Project Structure Reorganization Plan

## 🎯 Objective

Clean up the root directory by organizing files into proper directories following the specification-driven structure.

## 📋 Current Root Directory Analysis

### ✅ Should Stay in Root

- `SPECIFICATION.md` - Main specification (source of truth)
- `README.md` - Project entry point
- `LICENSE` - Legal information
- `package.json` - Project metadata
- `.gitignore` - Git configuration
- `ecosystem.config.cjs` - PM2 configuration

### 📁 Directories to Create/Move To

#### 1. `src/` - Source Code

```
src/
├── server/          # MCP server implementations
├── client/          # MCP client implementations
├── tools/           # Development tools
├── shared/          # Shared utilities
└── types/           # TypeScript definitions
```

#### 2. `docs/` - Documentation (already exists but needs content)

```
docs/
├── architecture/    # System architecture
├── api/            # API documentation
├── development/     # Development guides
├── examples/       # Code examples
└── guides/         # User guides
```

#### 3. `tests/` - Test Files

```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
└── fixtures/       # Test data
```

#### 4. `tools/` - Development Tools

```
tools/
├── cli/            # CLI tools
├── scripts/        # Utility scripts
├── setup/          # Setup and installation
└── monitoring/     # Monitoring tools
```

#### 5. `config/` - Configuration Files

```
config/
├── development/    # Development configs
├── production/     # Production configs
├── testing/        # Test configs
└── templates/      # Config templates
```

#### 6. `.github/` - GitHub Configuration (already correct)

```
.github/
├── workflows/      # CI/CD workflows
├── templates/      # Issue/PR templates
└── prompts/        # AI prompts
```

#### 7. `vendor/` - Third-party Dependencies

```
vendor/
├── @modelcontextprotocol/  # MCP SDK
├── @notionhq/           # Notion client
├── pm2/                 # PM2 process manager
└── ws/                  # WebSocket library
```

#### 8. `data/` - Data and Knowledge

```
data/
├── shared-knowledge/      # Shared context
├── memory/              # Memory storage
└── agents/              # Agent configurations
```

## 🔄 Files to Move

### Test Files → `tests/`

- `test_mcp_tools.js`
- `test_proxy.js`
- `test_single_server.js`

### Scripts → `tools/scripts/`

- All files in `scripts/` directory

### Configuration → `config/`

- `.modules.yaml`
- `pnpm-lock.yaml` (move to root but consider package-lock.json)

### Vendor Dependencies → `vendor/`

- `@modelcontextprotocol/`
- `@notionhq/`
- `pm2/`
- `ws/`

### Data/Knowledge → `data/`

- `.mcp-shared-knowledge/`
- `.qwen/`

### Build/Deployment → `tools/setup/`

- `lazy_loader.sh`
- `update-profiles.cjs`
- `verify_standardized_structure.sh`

### Binaries → `.bin/` (already exists)

- Keep `.bin/` as is for executable dependencies

## 📁 Root Directory After Cleanup

```
mcp-ecosystem/
├── SPECIFICATION.md          # ✅ Main specification
├── README.md                 # ✅ Project entry point
├── package.json              # ✅ Project metadata
├── ecosystem.config.cjs      # ✅ PM2 configuration
├── .gitignore               # ✅ Git configuration
├── LICENSE                  # ✅ Legal information
├── pnpm-lock.yaml          # ✅ Dependency lock file
├── INFRASTRUCTURE_STATUS.md # ✅ Project status
├── TEAM_COLLABORATION.md    # ✅ Team guide
├── ROADMAP.md              # ✅ Project roadmap
├── src/                    # 📁 Source code
├── docs/                   # 📁 Documentation
├── tests/                  # 📁 Test files
├── tools/                  # 📁 Development tools
├── config/                 # 📁 Configuration
├── vendor/                 # 📁 Third-party deps
├── data/                   # 📁 Data & knowledge
├── .github/                # 📁 GitHub config
├── .bin/                   # 📁 Executables
└── SPECIFICATION/           # 📁 Specification system
```

## 🎯 Benefits

1. **Clean Root** - Only essential files in root directory
2. **Logical Organization** - Files grouped by purpose
3. **Scalability** - Easy to add new files in appropriate places
4. **Developer Experience** - Intuitive structure for new contributors
5. **Maintenance** - Easier to find and maintain files

## 📋 Execution Steps

1. Create new directory structure
2. Move files to appropriate directories
3. Update import paths and references
4. Update configuration files
5. Test that everything still works
6. Update documentation to reflect new structure
