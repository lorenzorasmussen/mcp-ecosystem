# Copilot CLI Workflow for Zsh Configuration Management

## Overview

This comprehensive guide outlines the workflow for using GitHub Copilot CLI to manage zsh configuration tasks, including repository creation, git operations, and development assistance. The system consists of several integrated scripts that provide a complete solution for zsh configuration management.

## System Components

### Core Scripts

1. **`copilot-zsh-workflow.sh`** - Main workflow script with core functionality
2. **`copilot-zsh-templates.sh`** - Pre-defined templates for common tasks
3. **`copilot-zsh-diagnostic.sh`** - Comprehensive diagnostic and troubleshooting tools
4. **`copilot-permission-manager.sh`** - Advanced permission management system

### Installation

All scripts are located in `/Users/lorenzorasmussen/.local/share/mcp/tools/scripts/` and are executable.

## Quick Start

### 1. Check Prerequisites

```bash
./copilot-zsh-workflow.sh check
```

### 2. Create a Repository

```bash
./copilot-zsh-workflow.sh repo-create my-zsh-config "Personal zsh configuration"
```

### 3. Analyze Configuration

```bash
./copilot-zsh-workflow.sh analyze ~/.config/zsh
```

### 4. Execute Copilot Task

```bash
./copilot-zsh-workflow.sh copilot "Optimize my zsh startup time"
```

## Detailed Usage

### Main Workflow Script (`copilot-zsh-workflow.sh`)

#### Repository Management

**Create Remote Repository:**

```bash
./copilot-zsh-workflow.sh repo-create [name] [description] [private] [source-dir]
```

Examples:

```bash
# Basic repository creation
./copilot-zsh-workflow.sh repo-create zsh-config "My zsh setup"

# Public repository
./copilot-zsh-workflow.sh repo-create zsh-config "My zsh setup" false

# With custom source directory
./copilot-zsh-workflow.sh repo-create zsh-config "My zsh setup" true /path/to/config
```

**Git Operations:**

```bash
# Add files and commit
./copilot-zsh-workflow.sh git-commit "Update aliases" ~/.config/zsh/aliases.zsh

# Push to remote
./copilot-zsh-workflow.sh git-push main true
```

#### Configuration Analysis

**Analyze Zsh Configuration:**

```bash
./copilot-zsh-workflow.sh analyze [config-dir]
```

This command:

- Checks directory structure
- Validates syntax of all .zsh files
- Analyzes file sizes
- Identifies common configuration issues

#### Copilot Task Execution

**Execute Copilot Task:**

```bash
./copilot-zsh-workflow.sh copilot "task description" [model] [config-dir]
```

Examples:

```bash
# Basic task execution
./copilot-zsh-workflow.sh copilot "Optimize my zsh startup time"

# With specific model
./copilot-zsh-workflow.sh copilot "Add useful aliases" gpt-4

# With custom config directory
./copilot-zsh-workflow.sh copilot "Fix syntax errors" claude-sonnet-4.5 /custom/zsh/path
```

#### Session Management

**Save Session:**

```bash
./copilot-zsh-workflow.sh session-save [session-name]
```

**Resume Session:**

```bash
./copilot-zsh-workflow.sh session-resume [session-name]
```

### Templates Script (`copilot-zsh-templates.sh`)

#### Available Templates

1. **Repository Setup**

   ```bash
   ./copilot-zsh-templates.sh repo-setup [name] [description]
   ```

2. **Configuration Optimization**

   ```bash
   ./copilot-zsh-templates.sh config-optimization
   ```

3. **Backup and Recovery**

   ```bash
   ./copilot-zsh-templates.sh backup-recovery [backup-dir]
   ```

4. **Debugging**

   ```bash
   ./copilot-zsh-templates.sh debugging
   ```

5. **Documentation**

   ```bash
   ./copilot-zsh-templates.sh documentation
   ```

6. **Migration**
   ```bash
   ./copilot-zsh-templates.sh migration [from-shell]
   ```

#### Using Templates

Templates generate Copilot commands that you can execute directly:

```bash
# Show repository setup template
./copilot-zsh-templates.sh repo-setup my-zsh-config "Personal setup"

# Execute the generated commands
copilot -p "Help me organize my zsh configuration files into a proper repository structure" --add-dir ~/.config/zsh/ --allow-all-tools
```

### Diagnostic Script (`copilot-zsh-diagnostic.sh`)

#### Running Diagnostics

**Full Diagnostic:**

```bash
./copilot-zsh-diagnostic.sh full [config-dir]
```

**Specific Checks:**

```bash
# Check installation
./copilot-zsh-diagnostic.sh installation

# Check configuration files
./copilot-zsh-diagnostic.sh config ~/.config/zsh

# Measure startup time
./copilot-zsh-diagnostic.sh startup

# Analyze plugins
./copilot-zsh-diagnostic.sh plugins ~/.config/zsh

# Check environment variables
./copilot-zsh-diagnostic.sh environment

# Check file permissions
./copilot-zsh-diagnostic.sh permissions ~/.config/zsh
```

#### Interactive Mode

```bash
./copilot-zsh-diagnostic.sh interactive
```

This provides a menu-driven interface for running specific diagnostics.

#### Generate Copilot Fixes

```bash
./copilot-zsh-diagnostic.sh fixes ~/.config/zsh
```

This generates specific Copilot commands to fix identified issues.

### Permission Manager (`copilot-permission-manager.sh`)

#### Permission Presets

Available presets:

- `full` - Allow all tools (use with caution)
- `read-only` - Read access only
- `git-only` - Git operations only
- `config-analysis` - Configuration analysis
- `safe-edit` - Safe editing (default)
- `debug` - Debug mode with logging

#### Using Permission Manager

**Execute with Preset:**

```bash
./copilot-permission-manager.sh execute "task description" [preset] [model]
```

Examples:

```bash
# Safe editing
./copilot-permission-manager.sh execute "Add new aliases" safe-edit

# Full access for complex tasks
./copilot-permission-manager.sh execute "Complete configuration overhaul" full

# Read-only analysis
./copilot-permission-manager.sh execute "Analyze configuration" read-only
```

**Interactive Permission Builder:**

```bash
./copilot-permission-manager.sh interactive
```

**Show Available Options:**

```bash
# Show presets
./copilot-permission-manager.sh presets

# Show task-specific permissions
./copilot-permission-manager.sh tasks

# Show permission history
./copilot-permission-manager.sh history
```

## Best Practices

### 1. Permission Management

- Use the most restrictive permissions that still allow the task to complete
- Start with `safe-edit` preset and only escalate if necessary
- Use `read-only` for analysis tasks
- Reserve `full` access for complex restructuring tasks

### 2. Repository Organization

- Use descriptive commit messages that explain WHY changes were made
- Create branches for different types of work (features, fixes, experiments)
- Use tags for important configuration versions

### 3. Configuration Management

- Keep configuration files modular (separate aliases, functions, plugins)
- Regularly run diagnostics to catch issues early
- Maintain backups before major changes

### 4. Session Management

- Save sessions before complex multi-step tasks
- Use descriptive session names
- Resume sessions to maintain context

## Common Workflows

### Workflow 1: Setting Up a New Configuration Repository

```bash
# 1. Check prerequisites
./copilot-zsh-workflow.sh check

# 2. Create repository
./copilot-zsh-workflow.sh repo-create my-zsh-config "Personal zsh setup"

# 3. Analyze current configuration
./copilot-zsh-workflow.sh analyze ~/.config/zsh

# 4. Generate organization plan
./copilot-zsh-templates.sh repo-setup

# 5. Execute organization
./copilot-permission-manager.sh execute "Organize configuration files" safe-edit

# 6. Commit changes
./copilot-zsh-workflow.sh git-commit "Initial organized configuration"

# 7. Push to remote
./copilot-zsh-workflow.sh git-push main true
```

### Workflow 2: Optimizing Startup Performance

```bash
# 1. Measure current startup time
./copilot-zsh-diagnostic.sh startup

# 2. Run full diagnostic
./copilot-zsh-diagnostic.sh full

# 3. Generate optimization plan
./copilot-zsh-templates.sh config-optimization

# 4. Execute optimizations
./copilot-permission-manager.sh execute "Optimize startup performance" safe-edit

# 5. Validate improvements
./copilot-zsh-diagnostic.sh startup

# 6. Commit improvements
./copilot-zsh-workflow.sh git-commit "Optimize startup performance"
```

### Workflow 3: Debugging Configuration Issues

```bash
# 1. Run diagnostic
./copilot-zsh-diagnostic.sh full

# 2. Generate debugging commands
./copilot-zsh-diagnostic.sh fixes

# 3. Execute fixes with appropriate permissions
./copilot-permission-manager.sh execute "Fix configuration syntax errors" safe-edit

# 4. Validate fixes
./copilot-zsh-diagnostic.sh config

# 5. Test configuration
zsh -n ~/.zshrc
```

### Workflow 4: Migration from Another Shell

```bash
# 1. Generate migration plan
./copilot-zsh-templates.sh migration bash

# 2. Execute migration
./copilot-permission-manager.sh execute "Migrate bash configuration to zsh" full

# 3. Validate migration
./copilot-zsh-diagnostic.sh full

# 4. Test new configuration
./copilot-zsh-workflow.sh copilot "Test migrated configuration and fix any issues"

# 5. Commit migration
./copilot-zsh-workflow.sh git-commit "Migrate from bash to zsh"
```

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check file permissions with `./copilot-zsh-diagnostic.sh permissions`
   - Use appropriate permission preset
   - Ensure directories are accessible

2. **Git Operation Failures**
   - Check GitHub CLI authentication: `gh auth status`
   - Verify remote configuration: `git remote -v`
   - Check branch status: `git status`

3. **Copilot CLI Issues**
   - Verify Copilot CLI installation: `copilot --version`
   - Check authentication: `gh auth status`
   - Use debug mode: `./copilot-permission-manager.sh execute "task" debug`

4. **Configuration Syntax Errors**
   - Run syntax check: `zsh -n ~/.zshrc`
   - Use diagnostic tool: `./copilot-zsh-diagnostic.sh config`
   - Generate fixes: `./copilot-zsh-diagnostic.sh fixes`

### Getting Help

- Use `--help` flag with any script for detailed usage
- Run interactive diagnostic mode: `./copilot-zsh-diagnostic.sh interactive`
- Check permission history: `./copilot-permission-manager.sh history`
- Review logs in `~/.config/zsh/logs/copilot-workflow.log`

## Advanced Features

### Custom Permission Sets

Create custom permission combinations:

```bash
./copilot-permission-manager.sh execute "custom task" "" "claude-sonnet-4.5" "~/.config/zsh" "--allow-tool 'read,list,edit' --deny-tool 'bash'"
```

### Session Persistence

Save and restore complex work sessions:

```bash
# Save before complex task
./copilot-zsh-workflow.sh session-save complex-refactor

# Work on task...

# Resume if interrupted
./copilot-zsh-workflow.sh session-resume complex-refactor
```

### Automated Workflows

Combine multiple commands in scripts:

```bash
#!/bin/bash
# Example: Weekly maintenance script

./copilot-zsh-diagnostic.sh full
./copilot-zsh-workflow.sh copilot "Check for configuration updates and improvements"
./copilot-zsh-workflow.sh git-commit "Weekly maintenance update"
./copilot-zsh-workflow.sh git-push
```

## Integration with Other Tools

### MCP Integration

The workflow scripts integrate with the MCP ecosystem:

- Use with MCP servers for enhanced capabilities
- Leverage shared knowledge bases
- Coordinate with other OpenCode tools

### IDE Integration

- Use with VS Code Copilot extension
- Integrate with GitLens for better git visualization
- Use with terminal multiplexers (tmux, screen)

### CI/CD Integration

- Use in GitHub Actions for configuration validation
- Integrate with pre-commit hooks
- Automate configuration testing in pipelines

## Security Considerations

### Permission Safety

- Always use the most restrictive permissions necessary
- Review permission history regularly
- Avoid `full` access unless absolutely necessary

### Data Protection

- Regular backups before major changes
- Use git for version control and rollback
- Sensitive data should be in environment variables, not configuration files

### Access Control

- Use GitHub repository permissions appropriately
- Consider private repositories for sensitive configurations
- Review access logs regularly

## Contributing

### Extending the System

To add new features:

1. Add functions to appropriate script
2. Update help documentation
3. Add tests for new functionality
4. Update this guide

### Reporting Issues

Report issues through:

- GitHub repository issues
- Internal bug tracking system
- Direct communication with maintainers

## Version History

- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Added permission management system
- **v1.2.0** - Enhanced diagnostic capabilities
- **v1.3.0** - Added session management
- **v1.4.0** - Improved template system

## Support

For support:

- Check the troubleshooting section
- Review diagnostic output
- Use interactive diagnostic mode
- Contact the maintainers for complex issues
