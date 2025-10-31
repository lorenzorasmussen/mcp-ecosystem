# Copilot Zsh Workflow - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Prerequisites Check

```bash
./copilot-zsh-workflow.sh check
```

### 2. Create Your First Repository

```bash
./copilot-zsh-workflow.sh repo-create my-zsh-config "Personal zsh configuration"
```

### 3. Analyze Your Configuration

```bash
./copilot-zsh-workflow.sh analyze ~/.config/zsh
```

### 4. Execute Your First Copilot Task

```bash
./copilot-zsh-workflow.sh copilot "Help me organize my zsh configuration"
```

## 📋 Essential Commands

### Repository Management

```bash
# Create repository
./copilot-zsh-workflow.sh repo-create [name] [description]

# Commit changes
./copilot-zsh-workflow.sh git-commit "Update aliases"

# Push to remote
./copilot-zsh-workflow.sh git-push main true
```

### Configuration Tasks

```bash
# Analyze configuration
./copilot-zsh-workflow.sh analyze

# Run diagnostics
./copilot-zsh-diagnostic.sh full

# Execute Copilot task
./copilot-zsh-workflow.sh copilot "Optimize startup time"
```

### Session Management

```bash
# Save session
./copilot-zsh-workflow.sh session-save my-work

# Resume session
./copilot-zsh-workflow.sh session-resume my-work
```

## 🎯 Common Workflows

### Setting Up a New Configuration

```bash
# 1. Create repository
./copilot-zsh-workflow.sh repo-create my-zsh-config

# 2. Use template for setup
./copilot-zsh-templates.sh repo-setup

# 3. Execute organization
./copilot-permission-manager.sh execute "Organize config files" safe-edit

# 4. Commit and push
./copilot-zsh-workflow.sh git-commit "Initial setup"
./copilot-zsh-workflow.sh git-push
```

### Optimizing Performance

```bash
# 1. Measure startup time
./copilot-zsh-diagnostic.sh startup

# 2. Get optimization plan
./copilot-zsh-templates.sh config-optimization

# 3. Execute optimizations
./copilot-permission-manager.sh execute "Optimize startup" safe-edit

# 4. Validate improvements
./copilot-zsh-diagnostic.sh startup
```

### Debugging Issues

```bash
# 1. Run full diagnostic
./copilot-zsh-diagnostic.sh full

# 2. Generate fixes
./copilot-zsh-diagnostic.sh fixes

# 3. Execute fixes
./copilot-permission-manager.sh execute "Fix issues" safe-edit
```

## 🔧 Permission Management

### Safe Presets

- `safe-edit` - Read, list, edit (default)
- `read-only` - Read access only
- `config-analysis` - Configuration analysis
- `git-only` - Git operations only

### Usage Examples

```bash
# Safe editing
./copilot-permission-manager.sh execute "Add aliases" safe-edit

# Read-only analysis
./copilot-permission-manager.sh execute "Analyze config" read-only

# Full access (use carefully)
./copilot-permission-manager.sh execute "Major refactor" full
```

## 📊 Interactive Tools

### Interactive Diagnostic

```bash
./copilot-zsh-diagnostic.sh interactive
```

### Interactive Permission Builder

```bash
./copilot-permission-manager.sh interactive
```

### Session Management

```bash
# List sessions
./copilot-session-manager.sh list

# Create session
./copilot-session-manager.sh create my-work "Working on optimization"

# Load session
./copilot-session-manager.sh load my-work
```

## 🆘 Getting Help

### Script Help

```bash
./copilot-zsh-workflow.sh help
./copilot-zsh-diagnostic.sh help
./copilot-permission-manager.sh help
./copilot-session-manager.sh help
```

### Templates

```bash
./copilot-zsh-templates.sh help
```

### Full Documentation

See: `/Users/lorenzorasmussen/.local/share/mcp/docs/COPCLIOT_ZSH_WORKFLOW_GUIDE.md`

## 🔍 Troubleshooting

### Common Issues

1. **Permission denied** - Check file permissions
2. **Git errors** - Verify GitHub CLI auth: `gh auth status`
3. **Copilot not found** - Install Copilot CLI
4. **Syntax errors** - Run: `./copilot-zsh-diagnostic.sh config`

### Debug Mode

```bash
DEBUG=1 ./copilot-zsh-workflow.sh [command]
```

## 📁 File Locations

- **Scripts**: `/Users/lorenzorasmussen/.local/share/mcp/tools/scripts/`
- **Sessions**: `~/.config/zsh/sessions/`
- **Logs**: `~/.config/zsh/logs/`
- **Documentation**: `/Users/lorenzorasmussen/.local/share/mcp/docs/`

## 🎉 Success!

You're now ready to use Copilot CLI for zsh configuration management!

For advanced features and detailed documentation, see the complete workflow guide.
