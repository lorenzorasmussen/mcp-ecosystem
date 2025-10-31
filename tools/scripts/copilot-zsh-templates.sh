#!/bin/bash

# Copilot Zsh Workflow Templates
# Pre-defined templates for common zsh configuration tasks

set -euo pipefail

# Source the main workflow script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/copilot-zsh-workflow.sh"

# Template functions
template_repo_setup() {
    local repo_name="${1:-zsh-config}"
    local description="${2:-Personal zsh configuration and dotfiles}"
    
    cat << EOF
# Repository Setup Template
# This template helps you set up a complete zsh configuration repository

## Steps:
1. Create remote repository
2. Initialize local git repository
3. Add configuration files
4. Create initial commit
5. Push to remote

## Commands:
copilot-zsh-workflow.sh repo-create "$repo_name" "$description"
copilot-zsh-workflow.sh git-commit "Initial zsh configuration setup"
copilot-zsh-workflow.sh git-push main true

## Copilot Tasks:
copilot -p "Help me organize my zsh configuration files into a proper repository structure" --add-dir ~/.config/zsh/ --allow-all-tools
copilot -p "Create a comprehensive README.md for my zsh configuration repository" --allow-all-tools
EOF
}

template_config_optimization() {
    cat << EOF
# Configuration Optimization Template
# Optimize zsh startup time and performance

## Analysis Tasks:
copilot -p "Analyze my zsh configuration and identify performance bottlenecks" --add-dir ~/.config/zsh/ --allow-all-tools
copilot -p "Measure my zsh startup time and suggest optimizations" --allow-all-tools

## Optimization Tasks:
copilot -p "Optimize my zsh configuration for faster startup times" --add-dir ~/.config/zsh/ --allow-all-tools
copilot -p "Review and optimize my zsh plugins and their loading order" --add-dir ~/.config/zsh/ --allow-all-tools

## Validation:
copilot-zsh-workflow.sh analyze ~/.config/zsh
EOF
}

template_backup_recovery() {
    local backup_dir="${1:-${HOME}/.config/zsh-backups}"
    
    cat << EOF
# Backup and Recovery Template
# Create robust backup system for zsh configuration

## Backup Tasks:
copilot -p "Create a comprehensive backup system for my zsh configuration" --add-dir ~/.config/zsh/ --allow-all-tools
copilot -p "Set up automated backups for my zsh configuration to $backup_dir" --allow-all-tools

## Recovery Tasks:
copilot -p "Help me restore my zsh configuration from backup" --add-dir ~/.config/zsh/ --allow-all-tools
copilot -p "Create a disaster recovery plan for my zsh setup" --allow-all-tools

## Validation:
copilot -p "Test my backup and recovery system" --add-dir ~/.config/zsh/ --allow-all-tools
EOF
}

template_debugging() {
    cat << EOF
# Debugging Template
# Debug common zsh configuration issues

## Diagnostic Tasks:
copilot -p "Help me debug why my zsh configuration isn't loading properly" --add-dir ~/.config/zsh/ --allow-all-tools
copilot -p "Identify and fix syntax errors in my zsh configuration" --add-dir ~/.config/zsh/ --allow-all-tools

## Performance Debugging:
copilot -p "Debug slow zsh startup and identify the cause" --add-dir ~/.config/zsh/ --allow-all-tools
copilot -p "Find and fix memory leaks in my zsh configuration" --add-dir ~/.config/zsh/ --allow-all-tools

## Plugin Debugging:
copilot -p "Debug issues with my zsh plugins and their configuration" --add-dir ~/.config/zsh/ --allow-all-tools
EOF
}

template_documentation() {
    cat << EOF
# Documentation Template
# Generate comprehensive documentation for zsh configuration

## Documentation Tasks:
copilot -p "Generate comprehensive documentation for my zsh configuration" --add-dir ~/.config/zsh/ --allow-all-tools
copilot -p "Create a setup guide for my zsh configuration" --add-dir ~/.config/zsh/ --allow-all-tools
copilot -p "Document all custom functions and aliases in my zsh setup" --add-dir ~/.config/zsh/ --allow-all-tools

## API Documentation:
copilot -p "Create API documentation for my custom zsh functions" --add-dir ~/.config/zsh/ --allow-all-tools
copilot -p "Generate a changelog for my zsh configuration changes" --allow-all-tools
EOF
}

template_migration() {
    local from_shell="${1:-bash}"
    
    cat << EOF
# Migration Template
# Migrate from $from_shell to zsh

## Migration Tasks:
copilot -p "Help me migrate my configuration from $from_shell to zsh" --add-dir ~/.config/zsh/ --allow-all-tools
copilot -p "Convert my $from_shell aliases and functions to zsh syntax" --add-dir ~/.config/zsh/ --allow-all-tools

## Validation:
copilot -p "Test my migrated configuration and fix any issues" --add-dir ~/.config/zsh/ --allow-all-tools
copilot -p "Create a rollback plan in case migration fails" --add-dir ~/.config/zsh/ --allow-all-tools
EOF
}

# Show available templates
show_templates() {
    cat << EOF
${CYAN}Available Copilot Zsh Workflow Templates:${NC}

${GREEN}repo-setup${NC} [name] [description]     Set up complete zsh configuration repository
${GREEN}config-optimization${NC}                   Optimize zsh startup time and performance
${GREEN}backup-recovery${NC} [backup-dir]           Create backup and recovery system
${GREEN}debugging${NC}                              Debug common zsh configuration issues
${GREEN}documentation${NC}                         Generate comprehensive documentation
${GREEN}migration${NC} [from-shell]                 Migrate from other shells to zsh

${YELLOW}Usage:${NC}
$0 <template-name> [options]

${YELLOW}Examples:${NC}
$0 repo-setup my-zsh-config "My personal zsh setup"
$0 backup-recovery /backup/zsh
$0 migration bash
EOF
}

# Execute template
main() {
    local template="${1:-}"
    
    case "$template" in
        "repo-setup")
            shift
            template_repo_setup "$@"
            ;;
        "config-optimization")
            template_config_optimization
            ;;
        "backup-recovery")
            shift
            template_backup_recovery "$@"
            ;;
        "debugging")
            template_debugging
            ;;
        "documentation")
            template_documentation
            ;;
        "migration")
            shift
            template_migration "$@"
            ;;
        "help"|"--help"|"-h"|"")
            show_templates
            ;;
        *)
            error "Unknown template: $template"
            show_templates
            exit 1
            ;;
    esac
}

main "$@"