# MCP Ecosystem - Project Structure Documentation

> **🎯 Clean & Organized Structure**  
> Complete reorganization for clarity, scalability, and maintainability with specification-driven development.

---

## 📁 Final Root Directory Structure

```
mcp-ecosystem/
├── 📋 SPECIFICATION.md              # Main specification (source of truth)
├── 📖 README.md                    # Project entry point and overview
├── 🗺️ ROADMAP.md                   # Project roadmap and phases
├── 📊 INFRASTRUCTURE_STATUS.md      # Current infrastructure status
├── 📦 package.json                 # Project metadata and npm scripts
├── ⚙️ ecosystem.config.cjs          # PM2 process management
├── 🚫 .gitignore                   # Git ignore rules
├── 🔒 pnpm-lock.yaml              # Dependency lock file
├── 🏗️ .pnpm-workspace-state-v1.json # PNPM workspace state
├── 📁 PROJECT_STRUCTURE.md          # This documentation file
│
├── 📋 SPECIFICATION/               # Specification system
├── 💻 src/                       # Source code
├── 📚 docs/                      # Documentation
├── 🛠️ tools/                     # Development tools
├── 🧪 tests/                     # Test files
├── ⚙️ config/                    # Configuration files
├── 💾 data/                      # Data and knowledge
├── 📦 vendor/                    # Third-party dependencies
├── 📋 specs/                     # Feature specifications
├── 🐙 .github/                   # GitHub configuration
└── 🔧 .bin/                      # Executable binaries
```

---

## 🔄 File Migration Mapping

### 📋 Root Files (Unchanged - Essential)

| File                       | Status    | Location                |
| -------------------------- | --------- | ----------------------- |
| `SPECIFICATION.md`         | ✅ Stayed | Root (source of truth)  |
| `README.md`                | ✅ Stayed | Root (project entry)    |
| `ROADMAP.md`               | ✅ Stayed | Root (project roadmap)  |
| `INFRASTRUCTURE_STATUS.md` | ✅ Stayed | Root (status tracking)  |
| `package.json`             | ✅ Stayed | Root (project metadata) |
| `ecosystem.config.cjs`     | ✅ Stayed | Root (PM2 config)       |
| `.gitignore`               | ✅ Stayed | Root (git rules)        |
| `pnpm-lock.yaml`           | ✅ Stayed | Root (dependency lock)  |

### 📁 Directory Migrations

#### 🛠️ Scripts → tools/scripts/

| Original Path                        | New Path                                   | Purpose                       |
| ------------------------------------ | ------------------------------------------ | ----------------------------- |
| `scripts/documentation-sync.js`      | `tools/scripts/documentation-sync.js`      | Documentation synchronization |
| `scripts/documentation-health.js`    | `tools/scripts/documentation-health.js`    | Health monitoring             |
| `scripts/specification-validator.js` | `tools/scripts/specification-validator.js` | Spec validation               |
| `scripts/validate-specs.js`          | `tools/scripts/validate-specs.js`          | Spec validation               |
| `scripts/setup-git-hooks.sh`         | `tools/scripts/setup-git-hooks.sh`         | Git hooks setup               |
| `scripts/git-workflow.sh`            | `tools/scripts/git-workflow.sh`            | Git workflow                  |
| `scripts/mcp-shell-integration.sh`   | `tools/scripts/mcp-shell-integration.sh`   | Shell integration             |
| `scripts/orchestrator.py`            | `tools/scripts/orchestrator.py`            | System orchestration          |
| `scripts/setup-integration.sh`       | `tools/scripts/setup-integration.sh`       | Integration setup             |
| `scripts/inject_opencode_env.sh`     | `tools/scripts/inject_opencode_env.sh`     | Environment injection         |
| `scripts/opencode_monitor.sh`        | `tools/scripts/opencode_monitor.sh`        | OpenCode monitoring           |
| `scripts/setup_bws_secrets.sh`       | `tools/scripts/setup_bws_secrets.sh`       | Secrets setup                 |
| `scripts/export_env.sh`              | `tools/scripts/export_env.sh`              | Environment export            |
| `scripts/test_mcp_proxy.js`          | `tools/scripts/test_mcp_proxy.js`          | Proxy testing                 |
| `scripts/test_mcp_proxy_stdio.js`    | `tools/scripts/test_mcp_proxy_stdio.js`    | STDIO testing                 |
| `scripts/todo-enforcement-hook.js`   | `tools/scripts/todo-enforcement-hook.js`   | Todo enforcement              |
| `scripts/todo-templates.js`          | `tools/scripts/todo-templates.js`          | Todo templates                |
| `scripts/agent-todo-integration.js`  | `tools/scripts/agent-todo-integration.js`  | Agent integration             |
| `scripts/shared-todo-service.js`     | `tools/scripts/shared-todo-service.js`     | Todo service                  |

#### 🧪 Test Files → tests/

| Original Path           | New Path                      | Purpose           |
| ----------------------- | ----------------------------- | ----------------- |
| `test_mcp_tools.js`     | `tests/test_mcp_tools.js`     | MCP tools testing |
| `test_proxy.js`         | `tests/test_proxy.js`         | Proxy testing     |
| `test_single_server.js` | `tests/test_single_server.js` | Server testing    |
| `runtime-mcp-test.sh`   | `tests/runtime-mcp-test.sh`   | Runtime testing   |

#### 📦 Vendor Dependencies → vendor/

| Original Path            | New Path                        | Purpose                  |
| ------------------------ | ------------------------------- | ------------------------ |
| `@modelcontextprotocol/` | `vendor/@modelcontextprotocol/` | MCP SDK                  |
| `@notionhq/`             | `vendor/@notionhq/`             | Notion client            |
| `pm2/`                   | `vendor/pm2/`                   | Process manager          |
| `ws/`                    | `vendor/ws/`                    | WebSocket library        |
| `axios/`                 | `vendor/axios/`                 | HTTP client              |
| `googleapis/`            | `vendor/googleapis/`            | Google APIs              |
| `mcp-go-sdk/`            | `vendor/mcp-go-sdk/`            | Go SDK                   |
| `express/`               | `vendor/express/`               | Web framework            |
| `puppeteer/`             | `vendor/puppeteer/`             | Browser automation       |
| `mcp.ecosystem/`         | `vendor/mcp.ecosystem/`         | MCP ecosystem components |

#### 💾 Data & Knowledge → data/

| Original Path            | New Path                                       | Purpose              |
| ------------------------ | ---------------------------------------------- | -------------------- |
| `.mcp-shared-knowledge/` | `data/shared-knowledge/.mcp-shared-knowledge/` | Shared knowledge     |
| `.qwen/`                 | `data/agents/.qwen/`                           | Agent configurations |

#### ⚙️ Configuration → config/

| Original Path                    | New Path                                | Purpose                    |
| -------------------------------- | --------------------------------------- | -------------------------- |
| `.modules.yaml`                  | `config/.modules.yaml`                  | Module configuration       |
| `.env.todo`                      | `config/.env.todo`                      | Environment template       |
| `.metadata_never_index`          | `config/.metadata_never_index`          | Metadata config            |
| `mcp-config.json`                | `config/mcp-config.json`                | MCP configuration          |
| `ecosystem-optimized.config.cjs` | `config/ecosystem-optimized.config.cjs` | Optimized ecosystem config |

#### 📚 Documentation → docs/

| Original Path               | New Path                                     | Purpose                 |
| --------------------------- | -------------------------------------------- | ----------------------- |
| `docs/templates/`           | `docs/examples/templates/`                   | Documentation templates |
| `NAMING_CONVENTION.md`      | `docs/development/NAMING_CONVENTION.md`      | Naming standards        |
| `TEAM_COLLABORATION.md`     | `docs/development/TEAM_COLLABORATION.md`     | Team guidelines         |
| `TODO_ENFORCEMENT_GUIDE.md` | `docs/development/TODO_ENFORCEMENT_GUIDE.md` | Todo enforcement        |
| `PROJECT_STRUCTURE_PLAN.md` | `docs/development/PROJECT_STRUCTURE_PLAN.md` | Structure planning      |

#### 💻 Source Code → src/

| Original Path        | New Path                        | Purpose                    |
| -------------------- | ------------------------------- | -------------------------- |
| `client/`            | `src/client/`                   | MCP client implementations |
| `mcp-ecosystem/`     | `src/mcp-ecosystem/`            | Core ecosystem code        |
| `utils/`             | `src/shared/utils/`             | Shared utilities           |
| `debug-mcp.js`       | `src/tools/debug-mcp.js`        | Debugging tool             |
| `mcp-connect.sh`     | `src/tools/mcp-connect.sh`      | Connection script          |
| `mcp-manager.sh`     | `src/tools/mcp-manager.sh`      | Management script          |
| `mcp-monitor.js`     | `src/tools/mcp-monitor.js`      | Monitoring tool            |
| `mcp-rest-api.js`    | `src/tools/mcp-rest-api.js`     | REST API tool              |
| `mcp-resting-api.js` | `src/tools/mcp-resting-api.js`  | Alternative REST API       |
| `mcp-router.cjs`     | `src/tools/mcp-router.cjs`      | Router configuration       |
| `simple_test.js`     | `src/tools/simple_test.js`      | Simple testing             |
| `all_mcp_tools.json` | `src/shared/all_mcp_tools.json` | Tools registry             |

#### 🔧 Setup Files → tools/setup/

| Original Path                      | New Path                                       | Purpose                |
| ---------------------------------- | ---------------------------------------------- | ---------------------- |
| `lazy_loader.sh`                   | `tools/setup/lazy_loader.sh`                   | Lazy loading setup     |
| `update-profiles.cjs`              | `tools/setup/update-profiles.cjs`              | Profile updates        |
| `verify_standardized_structure.sh` | `tools/setup/verify_standardized_structure.sh` | Structure verification |

#### 📊 Monitoring → tools/monitoring/

| Original Path               | New Path                                     | Purpose          |
| --------------------------- | -------------------------------------------- | ---------------- |
| `server-metrics-tracker.js` | `tools/monitoring/server-metrics-tracker.js` | Metrics tracking |

---

## 🏗️ Detailed Directory Structure

### 📋 SPECIFICATION/ - Specification System

```
SPECIFICATION/
├── constitution.md              # 📜 Foundational principles and governance
└── templates/                 # 📝 Standardized templates
    ├── spec-template.md        # Feature specification template
    ├── plan-template.md        # Implementation plan template
    └── tasks-template.md       # Task breakdown template
```

### 💻 src/ - Source Code

```
src/
├── client/                    # 🌐 MCP client implementations
│   └── multi_agent_client.js
├── mcp-ecosystem/           # 🏗️ Core ecosystem functionality
│   ├── core/                 # Core components
│   ├── servers/               # Server implementations
│   ├── integrations/          # Third-party integrations
│   └── docs/                 # Internal documentation
├── shared/                   # 🔧 Shared utilities and helpers
│   ├── utils/                # Utility functions
│   └── all_mcp_tools.json    # Tools registry
└── tools/                    # 🛠️ Development and operational tools
    ├── debug-mcp.js          # Debugging utilities
    ├── mcp-*.sh             # Shell scripts
    ├── mcp-*.js             # JavaScript tools
    └── simple_test.js        # Simple testing
```

### 📚 docs/ - Documentation

```
docs/
├── development/               # 📖 Development guides and standards
│   ├── NAMING_CONVENTION.md
│   ├── TEAM_COLLABORATION.md
│   ├── TODO_ENFORCEMENT_GUIDE.md
│   └── PROJECT_STRUCTURE_PLAN.md
├── examples/                 # 💡 Code examples and templates
│   └── templates/           # Documentation templates
└── DOCUMENTATION_ASSESSMENT_REPORT.md
```

### 🛠️ tools/ - Development Tools

```
tools/
├── scripts/                  # 📜 Automation and utility scripts
│   ├── documentation-*.js     # Documentation tools
│   ├── specification-*.js     # Specification tools
│   ├── setup-*.sh            # Setup scripts
│   └── [various scripts]     # Other utilities
├── monitoring/               # 📊 System monitoring and metrics
│   └── server-metrics-tracker.js
└── setup/                   # ⚙️ Installation and setup utilities
    ├── lazy_loader.sh
    ├── update-profiles.cjs
    └── verify_standardized_structure.sh
```

### 🧪 tests/ - Test Files

```
tests/
├── test_mcp_tools.js         # MCP tools testing
├── test_proxy.js            # Proxy testing
├── test_single_server.js     # Server testing
└── runtime-mcp-test.sh      # Runtime testing
```

### ⚙️ config/ - Configuration Files

```
config/
├── .env.todo                # Environment template
├── .metadata_never_index     # Metadata configuration
├── .modules.yaml           # Module configuration
├── mcp-config.json         # MCP configuration
└── ecosystem-optimized.config.cjs # Optimized ecosystem config
```

### 💾 data/ - Data and Knowledge Storage

```
data/
├── shared-knowledge/        # 🧠 Shared context and memory
│   └── .mcp-shared-knowledge/
│       ├── context/         # Shared context
│       ├── memory/         # Memory storage
│       └── tasks/          # Shared tasks
└── agents/                # 🤖 Agent configurations
    └── .qwen/
        ├── agents/         # Agent definitions
        └── configurations
```

### 📦 vendor/ - Third-party Dependencies

```
vendor/
├── @modelcontextprotocol/  # MCP SDK
├── @notionhq/            # Notion client
├── pm2/                  # Process manager
├── ws/                   # WebSocket library
├── axios/                # HTTP client
├── googleapis/           # Google APIs
├── mcp-go-sdk/          # Go SDK
├── express/              # Web framework
├── puppeteer/            # Browser automation
└── mcp.ecosystem/       # MCP ecosystem components
```

---

## 🔄 Updated Configuration References

### package.json Scripts

All script paths have been updated to reflect the new structure:

```json
{
  "scripts": {
    "docs:sync": "node tools/scripts/documentation-sync.js",
    "docs:health": "node tools/scripts/documentation-health.js",
    "docs:validate": "node tools/scripts/validate-specs.js",
    "docs:validate-spec": "node tools/scripts/specification-validator.js",
    "docs:init": "node tools/scripts/init-spec-kit.js",
    "lint": "eslint tools/scripts/ --ext .js",
    "lint:fix": "eslint tools/scripts/ --ext .js --fix",
    "format": "prettier --write tools/scripts/**/*.js"
  }
}
```

### Git Hooks

Updated to use new paths:

- Pre-commit: `tools/scripts/specification-validator.js`
- Pre-push: `tools/scripts/documentation-health.js`
- Documentation sync: `tools/scripts/documentation-sync.js`

### GitHub Actions

Workflow triggers updated to include:

- `SPECIFICATION/**`
- `tools/scripts/**`
- `src/**`
- `docs/**`
- `tests/**`

---

## 🎯 Benefits Achieved

### 1. **Clean Root Directory**

- Only 10 essential files in root
- Clear project entry points
- Reduced cognitive load

### 2. **Logical Organization**

- Files grouped by purpose and function
- Intuitive navigation
- Scalable structure

### 3. **Specification First**

- `SPECIFICATION.md` prominently featured
- Easy access to specification system
- Clear authority hierarchy

### 4. **Developer Experience**

- Predictable file locations
- Clear separation of concerns
- Easy onboarding

### 5. **Maintainability**

- Modular structure
- Clear dependencies
- Simplified updates

---

## 🚀 Usage Examples

### Development Commands

```bash
# Validate specification
npm run docs:validate-spec

# Sync documentation
npm run docs:sync

# Run health check
npm run docs:health

# Run tests
npm test

# Lint code
npm run lint
```

### File Locations

```bash
# Specification templates
ls SPECIFICATION/templates/

# Development tools
ls tools/scripts/

# Source code
ls src/

# Configuration
ls config/

# Documentation
ls docs/
```

---

## 📋 Migration Checklist

### ✅ Completed

- [x] All scripts moved to `tools/scripts/`
- [x] Test files moved to `tests/`
- [x] Vendor dependencies moved to `vendor/`
- [x] Configuration files moved to `config/`
- [x] Data and knowledge moved to `data/`
- [x] Documentation organized in `docs/`
- [x] Source code organized in `src/`
- [x] All configuration references updated
- [x] Git hooks updated with new paths
- [x] GitHub Actions workflows updated
- [x] Package.json scripts updated
- [x] Root directory cleaned and organized

### 🔍 Verification

- [x] All npm scripts work with new paths
- [x] Git hooks function correctly
- [x] Specification validation passes
- [x] Documentation sync works
- [x] No broken references
- [x] Security scans pass
- [x] All functionality preserved

---

**Last Updated**: 2025-10-29  
**Migration Completed**: ✅ Yes  
**Status**: 🟢 Production Ready

> **🎯 The MCP ecosystem now has a clean, organized, and scalable project structure that supports specification-driven development and maintains full functionality.**
