#!/bin/bash

# Copilot CLI Permission Manager
# Advanced permission management for Copilot CLI zsh workflows

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Configuration
readonly PERMISSIONS_FILE="${HOME}/.config/zsh/copilot-permissions.json"
readonly DEFAULT_ZSH_DIR="${HOME}/.config/zsh"

# Permission presets
declare -A PERMISSION_PRESETS=(
    ["full"]="--allow-all-tools"
    ["read-only"]="--allow-tool 'read,list' --deny-tool 'write,edit,bash'"
    ["git-only"]="--allow-tool 'shell(git:*)'"
    ["config-analysis"]="--add-dir $DEFAULT_ZSH_DIR --allow-tool 'read,list,write' --deny-tool 'bash'"
    ["safe-edit"]="--add-dir $DEFAULT_ZSH_DIR --allow-tool 'read,list,edit' --deny-tool 'bash'"
    ["debug"]="--log-level debug --add-dir $DEFAULT_ZSH_DIR --allow-all-tools"
)

# Task-specific permission sets
declare -A TASK_PERMISSIONS=(
    ["repo-create"]="--allow-tool 'shell(git:*),shell(gh:*)' --add-dir ."
    ["config-edit"]="--add-dir $DEFAULT_ZSH_DIR --allow-tool 'read,list,edit' --deny-tool 'bash'"
    ["config-analyze"]="--add-dir $DEFAULT_ZSH_DIR --allow-tool 'read,list'"
    ["startup-optimize"]="--add-dir $DEFAULT_ZSH_DIR --allow-tool 'read,list,edit' --deny-tool 'bash'"
    ["plugin-debug"]="--add-dir $DEFAULT_ZSH_DIR --allow-all-tools"
    ["backup-create"]="--add-dir $DEFAULT_ZSH_DIR --allow-tool 'read,list,write,shell(git:*)'"
    ["documentation"]="--add-dir $DEFAULT_ZSH_DIR --allow-tool 'read,list,write'"
    ["migration"]="--add-dir $DEFAULT_ZSH_DIR --allow-all-tools"
)

# Initialize permissions file
init_permissions() {
    mkdir -p "$(dirname "$PERMISSIONS_FILE")"
    
    if [[ ! -f "$PERMISSIONS_FILE" ]]; then
        cat > "$PERMISSIONS_FILE" << EOF
{
    "version": "1.0.0",
    "created": "$(date -Iseconds)",
    "presets": {},
    "custom_tasks": {},
    "history": []
}
EOF
        success "Initialized permissions file: $PERMISSIONS_FILE"
    fi
}

# Save permission usage to history
save_permission_history() {
    local task="$1"
    local permissions="$2"
    local model="${3:-claude-sonnet-4.5}"
    
    init_permissions
    
    local entry=$(cat << EOF
{
    "timestamp": "$(date -Iseconds)",
    "task": "$task",
    "permissions": "$permissions",
    "model": "$model"
}
EOF
)
    
    # Add to history (keep last 50 entries)
    local temp_file=$(mktemp)
    jq --argjson entry "$entry" '.history = (.history + [$entry])[-50:]' "$PERMISSIONS_FILE" > "$temp_file"
    mv "$temp_file" "$PERMISSIONS_FILE"
}

# Build copilot command with permissions
build_command() {
    local task="$1"
    local preset="${2:-}"
    local model="${3:-claude-sonnet-4.5}"
    local custom_dirs="${4:-}"
    local custom_tools="${5:-}"
    
    local cmd="copilot"
    local permissions=""
    
    # Use preset if specified
    if [[ -n "$preset" ]] && [[ -n "${PERMISSION_PRESETS[$preset]:-}" ]]; then
        permissions="${PERMISSION_PRESETS[$preset]}"
    # Use task-specific permissions
    elif [[ -n "${TASK_PERMISSIONS[$task]:-}" ]]; then
        permissions="${TASK_PERMISSIONS[$task]}"
    # Use custom permissions
    elif [[ -n "$custom_tools" ]]; then
        permissions="$custom_tools"
    else
        # Default safe permissions
        permissions="--add-dir $DEFAULT_ZSH_DIR --allow-tool 'read,list,edit' --deny-tool 'bash'"
    fi
    
    # Add custom directories
    if [[ -n "$custom_dirs" ]]; then
        for dir in $custom_dirs; do
            permissions+=" --add-dir $dir"
        done
    fi
    
    # Add model
    if [[ -n "$model" ]]; then
        cmd+=" --model $model"
    fi
    
    # Add permissions
    cmd+=" $permissions"
    
    # Add task
    cmd+=" -p \"$task\""
    
    echo "$cmd"
}

# Execute with permissions
execute_with_permissions() {
    local task="$1"
    local preset="${2:-safe-edit}"
    local model="${3:-claude-sonnet-4.5}"
    local custom_dirs="${4:-}"
    local custom_tools="${5:-}"
    
    info "Building command with preset: $preset"
    
    local cmd
    cmd=$(build_command "$task" "$preset" "$model" "$custom_dirs" "$custom_tools")
    
    info "Executing: $cmd"
    
    # Save to history
    save_permission_history "$task" "$preset" "$model"
    
    # Execute command
    if eval "$cmd"; then
        success "Task completed successfully"
        return 0
    else
        error "Task failed"
        return 1
    fi
}

# Show available presets
show_presets() {
    echo "${CYAN}Available Permission Presets:${NC}"
    echo
    
    for preset in "${!PERMISSION_PRESETS[@]}"; do
        echo "${GREEN}$preset${NC}: ${PERMISSION_PRESETS[$preset]}"
    done
    echo
}

# Show task-specific permissions
show_task_permissions() {
    echo "${CYAN}Task-Specific Permissions:${NC}"
    echo
    
    for task in "${!TASK_PERMISSIONS[@]}"; do
        echo "${GREEN}$task${NC}: ${TASK_PERMISSIONS[$task]}"
    done
    echo
}

# Interactive permission builder
interactive_builder() {
    clear
    echo "${CYAN}Copilot Permission Builder${NC}"
    echo
    
    # Get task description
    read -p "Enter task description: " task
    
    # Choose model
    echo
    echo "${YELLOW}Available models:${NC}"
    echo "1) claude-sonnet-4.5 (default)"
    echo "2) gpt-4"
    echo "3) gpt-3.5-turbo"
    echo "4) custom"
    
    read -p "Select model (1-4): " model_choice
    case $model_choice in
        1) model="claude-sonnet-4.5" ;;
        2) model="gpt-4" ;;
        3) model="gpt-3.5-turbo" ;;
        4) read -p "Enter custom model: " model ;;
        *) model="claude-sonnet-4.5" ;;
    esac
    
    # Choose permission level
    echo
    echo "${YELLOW}Permission Level:${NC}"
    echo "1) Full access (allow-all-tools)"
    echo "2) Safe editing (read, list, edit)"
    echo "3) Read-only (read, list)"
    echo "4) Git operations only"
    echo "5) Custom"
    
    read -p "Select permission level (1-5): " perm_choice
    
    local permissions=""
    case $perm_choice in
        1) permissions="--allow-all-tools" ;;
        2) permissions="--allow-tool 'read,list,edit' --deny-tool 'bash'" ;;
        3) permissions="--allow-tool 'read,list' --deny-tool 'write,edit,bash'" ;;
        4) permissions="--allow-tool 'shell(git:*)'" ;;
        5) 
            echo
            read -p "Enter custom permissions: " permissions
            ;;
        *) permissions="--allow-tool 'read,list,edit' --deny-tool 'bash'" ;;
    esac
    
    # Add directories
    echo
    read -p "Add directories (space-separated, default: ~/.config/zsh): " dirs_input
    local dirs="${dirs_input:-$DEFAULT_ZSH_DIR}"
    
    for dir in $dirs; do
        permissions+=" --add-dir $dir"
    done
    
    # Build and show command
    local cmd="copilot --model $model $permissions -p \"$task\""
    
    echo
    echo "${CYAN}Generated Command:${NC}"
    echo "$cmd"
    echo
    
    read -p "Execute this command? (y/n): " execute_choice
    if [[ "$execute_choice" =~ ^[Yy]$ ]]; then
        info "Executing command..."
        save_permission_history "$task" "$permissions" "$model"
        
        if eval "$cmd"; then
            success "Command executed successfully"
        else
            error "Command failed"
        fi
    else
        info "Command not executed"
    fi
}

# Show permission history
show_history() {
    init_permissions
    
    echo "${CYAN}Recent Permission History:${NC}"
    echo
    
    jq -r '.history[-10:] | reverse | .[] | "Task: \(.task)\nModel: \(.model)\nPermissions: \(.permissions)\nTimestamp: \(.timestamp)\n---"' "$PERMISSIONS_FILE"
}

# Validate permissions
validate_permissions() {
    local permissions="$1"
    
    # Basic validation
    if [[ -z "$permissions" ]]; then
        error "No permissions specified"
        return 1
    fi
    
    # Check for dangerous combinations
    if [[ "$permissions" == *"allow-all-tools"* ]] && [[ "$permissions" != *"add-dir"* ]]; then
        warning "allow-all-tools without directory restrictions may be unsafe"
    fi
    
    # Check for conflicting permissions
    if [[ "$permissions" == *"allow-tool"* ]] && [[ "$permissions" == *"deny-tool"* ]]; then
        warning "Both allow-tool and deny-tool specified - ensure they don't conflict"
    fi
    
    success "Permission validation completed"
    return 0
}

# Help system
show_help() {
    cat << EOF
${CYAN}Copilot Permission Manager${NC}

${YELLOW}USAGE:${NC}
    $0 <command> [options]

${YELLOW}COMMANDS:${NC}
    ${GREEN}execute${NC} "task" [preset] [model]     Execute task with permissions
    ${GREEN}build${NC} "task" [preset] [model]        Build command without executing
    ${GREEN}presets${NC}                              Show available presets
    ${GREEN}tasks${NC}                                Show task-specific permissions
    ${GREEN}interactive${NC}                          Interactive permission builder
    ${GREEN}history${NC}                              Show permission history
    ${GREEN}validate${NC} "permissions"               Validate permission string
    ${GREEN}init${NC}                                 Initialize permissions file
    ${GREEN}help${NC}                                 Show this help

${YELLOW}PRESETS:${NC}
    ${GREEN}full${NC}         Allow all tools (use with caution)
    ${GREEN}read-only${NC}    Read access only
    ${GREEN}git-only${NC}     Git operations only
    ${GREEN}config-analysis${NC}  Configuration analysis
    ${GREEN}safe-edit${NC}    Safe editing (default)
    ${GREEN}debug${NC}        Debug mode with logging

${YELLOW}EXAMPLES:${NC}
    # Execute with preset
    $0 execute "Optimize my zsh startup" safe-edit claude-sonnet-4.5
    
    # Build command for custom task
    $0 build "Add new aliases" config-analysis
    
    # Interactive mode
    $0 interactive
    
    # Show history
    $0 history

${YELLOW}TASK-SPECIFIC PERMISSIONS:${NC}
    Available tasks: repo-create, config-edit, config-analyze, startup-optimize,
    plugin-debug, backup-create, documentation, migration

EOF
}

# Main execution
main() {
    local command="${1:-}"
    
    case "$command" in
        "execute")
            shift
            execute_with_permissions "$@"
            ;;
        "build")
            shift
            build_command "$@"
            ;;
        "presets")
            show_presets
            ;;
        "tasks")
            show_task_permissions
            ;;
        "interactive")
            interactive_builder
            ;;
        "history")
            show_history
            ;;
        "validate")
            shift
            validate_permissions "$@"
            ;;
        "init")
            init_permissions
            ;;
        "help"|"--help"|"-h"|"")
            show_help
            ;;
        *)
            error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"