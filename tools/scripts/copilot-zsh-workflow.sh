#!/bin/bash

# Copilot CLI Workflow for Zsh Configuration Management
# Author: OpenCode Assistant
# Version: 1.0.0

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Default configuration
readonly DEFAULT_ZSH_CONFIG_DIR="${HOME}/.config/zsh"
readonly DEFAULT_REPO_NAME="zsh-config"
readonly DEFAULT_BRANCH="main"
readonly SCRIPT_NAME="$(basename "$0")"

# Logging
LOG_FILE="${HOME}/.config/zsh/logs/copilot-workflow.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Utility functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

info() {
    log "INFO" "${BLUE}$*${NC}"
}

success() {
    log "SUCCESS" "${GREEN}$*${NC}"
}

warning() {
    log "WARNING" "${YELLOW}$*${NC}"
}

error() {
    log "ERROR" "${RED}$*${NC}"
}

debug() {
    if [[ "${DEBUG:-0}" == "1" ]]; then
        log "DEBUG" "${PURPLE}$*${NC}"
    fi
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    # Check for GitHub CLI
    if ! command -v gh &> /dev/null; then
        error "GitHub CLI (gh) is not installed. Please install it first."
        info "Visit: https://cli.github.com/manual/installation"
        return 1
    fi
    
    # Check for Copilot CLI
    if ! command -v copilot &> /dev/null; then
        error "Copilot CLI is not installed. Please install it first."
        info "Visit: https://github.com/github/copilot-cli"
        return 1
    fi
    
    # Check GitHub CLI authentication
    if ! gh auth status &> /dev/null; then
        error "GitHub CLI is not authenticated. Please run: gh auth login"
        return 1
    fi
    
    success "All prerequisites are met"
    return 0
}

# Repository creation and management
create_remote_repository() {
    local repo_name="${1:-$DEFAULT_REPO_NAME}"
    local description="${2:-Personal zsh configuration and dotfiles}"
    local private="${3:-true}"
    local source_dir="${4:-.}"
    
    info "Creating remote repository: $repo_name"
    
    local privacy_flag="--public"
    if [[ "$private" == "true" ]]; then
        privacy_flag="--private"
    fi
    
    # Create repository
    if gh repo create "$repo_name" \
        "$privacy_flag" \
        --description "$description" \
        --source="$source_dir" \
        --push; then
        success "Repository '$repo_name' created successfully"
        
        # Verify remote configuration
        info "Verifying remote configuration..."
        git remote -v
        
        return 0
    else
        error "Failed to create repository '$repo_name'"
        return 1
    fi
}

# Git operations automation
git_add_and_commit() {
    local commit_message="${1:-Update zsh configuration}"
    local files_pattern="${2:-.}"
    
    info "Adding files and creating commit..."
    
    # Check git status
    if ! git status --porcelain &> /dev/null; then
        warning "No changes to commit"
        return 0
    fi
    
    # Add files
    info "Adding files: $files_pattern"
    git add $files_pattern
    
    # Create commit
    info "Creating commit with message: $commit_message"
    if git commit -m "$commit_message"; then
        success "Commit created successfully"
        return 0
    else
        error "Failed to create commit"
        return 1
    fi
}

push_to_remote() {
    local branch="${1:-$(git branch --show-current)}"
    local set_upstream="${2:-true}"
    
    info "Pushing branch '$branch' to remote..."
    
    local push_args=()
    if [[ "$set_upstream" == "true" ]]; then
        push_args+=("--set-upstream" "origin" "$branch")
    else
        push_args+=("origin" "$branch")
    fi
    
    if git push "${push_args[@]}"; then
        success "Pushed successfully to remote"
        return 0
    else
        error "Failed to push to remote"
        return 1
    fi
}

# Configuration analysis
analyze_zsh_config() {
    local config_dir="${1:-$DEFAULT_ZSH_CONFIG_DIR}"
    
    info "Analyzing zsh configuration in: $config_dir"
    
    if [[ ! -d "$config_dir" ]]; then
        error "Zsh configuration directory not found: $config_dir"
        return 1
    fi
    
    # Directory structure analysis
    info "Directory structure:"
    find "$config_dir" -type f -name "*.zsh" -o -name "*.sh" | head -20
    
    # Configuration file sizes
    info "Configuration file sizes:"
    find "$config_dir" -name "*.zsh" -exec ls -lh {} \; | awk '{print $5, $9}'
    
    # Check for common issues
    info "Checking for common configuration issues..."
    
    # Check for syntax errors
    local zsh_files=($(find "$config_dir" -name "*.zsh"))
    for file in "${zsh_files[@]}"; do
        if zsh -n "$file" 2>/dev/null; then
            success "Syntax OK: $file"
        else
            warning "Syntax error in: $file"
        fi
    done
    
    return 0
}

# Permission management
build_copilot_command() {
    local task="$1"
    local model="${2:-claude-sonnet-4.5}"
    local allow_all="${3:-false}"
    local add_dirs="${4:-}"
    local allow_tools="${5:-}"
    local deny_tools="${6:-}"
    
    local cmd="copilot"
    
    # Add model selection
    if [[ -n "$model" ]]; then
        cmd+=" --model $model"
    fi
    
    # Add directory access
    if [[ -n "$add_dirs" ]]; then
        for dir in $add_dirs; do
            cmd+=" --add-dir $dir"
        done
    fi
    
    # Add tool permissions
    if [[ "$allow_all" == "true" ]]; then
        cmd+=" --allow-all-tools"
    else
        if [[ -n "$allow_tools" ]]; then
            cmd+=" --allow-tool $allow_tools"
        fi
        if [[ -n "$deny_tools" ]]; then
            cmd+=" --deny-tool $deny_tools"
        fi
    fi
    
    # Add task prompt
    cmd+=" -p \"$task\""
    
    echo "$cmd"
}

execute_copilot_task() {
    local task="$1"
    local model="${2:-claude-sonnet-4.5}"
    local config_dir="${3:-$DEFAULT_ZSH_CONFIG_DIR}"
    
    info "Executing Copilot task: $task"
    
    local cmd
    cmd=$(build_copilot_command "$task" "$model" "true" "$config_dir")
    
    debug "Executing: $cmd"
    
    if eval "$cmd"; then
        success "Copilot task completed successfully"
        return 0
    else
        error "Copilot task failed"
        return 1
    fi
}

# Session management
save_session() {
    local session_name="$1"
    local session_file="${HOME}/.config/zsh/sessions/${session_name}.json"
    
    mkdir -p "$(dirname "$session_file")"
    
    info "Saving session: $session_name"
    
    # Capture current state
    local session_data=$(cat <<EOF
{
    "timestamp": "$(date -Iseconds)",
    "working_directory": "$(pwd)",
    "git_branch": "$(git branch --show-current 2>/dev/null || echo 'not-a-git-repo')",
    "git_status": "$(git status --porcelain 2>/dev/null || echo '')",
    "environment": {
        "ZSH_VERSION": "$ZSH_VERSION",
        "SHELL": "$SHELL"
    }
}
EOF
)
    
    echo "$session_data" > "$session_file"
    success "Session saved to: $session_file"
}

resume_session() {
    local session_name="$1"
    local session_file="${HOME}/.config/zsh/sessions/${session_name}.json"
    
    if [[ ! -f "$session_file" ]]; then
        error "Session file not found: $session_file"
        return 1
    fi
    
    info "Resuming session: $session_name"
    
    # Display session information
    local timestamp=$(jq -r '.timestamp' "$session_file")
    local working_dir=$(jq -r '.working_directory' "$session_file")
    local git_branch=$(jq -r '.git_branch' "$session_file")
    
    info "Session timestamp: $timestamp"
    info "Working directory: $working_dir"
    info "Git branch: $git_branch"
    
    # Change to working directory
    if [[ -d "$working_dir" ]]; then
        cd "$working_dir"
        success "Changed to directory: $working_dir"
    else
        warning "Working directory not found: $working_dir"
    fi
    
    return 0
}

# Help system
show_help() {
    cat << EOF
${CYAN}Copilot CLI Workflow for Zsh Configuration Management${NC}

${YELLOW}USAGE:${NC}
    $SCRIPT_NAME <command> [options]

${YELLOW}COMMANDS:${NC}
    ${GREEN}repo-create${NC} [name] [description]     Create remote repository
    ${GREEN}git-commit${NC} [message] [files]         Add files and create commit
    ${GREEN}git-push${NC} [branch] [set-upstream]     Push to remote repository
    ${GREEN}analyze${NC} [config-dir]                 Analyze zsh configuration
    ${GREEN}copilot${NC} "task" [model]                Execute Copilot task
    ${GREEN}session-save${NC} [name]                   Save current session
    ${GREEN}session-resume${NC} [name]                 Resume saved session
    ${GREEN}check${NC}                                 Check prerequisites
    ${GREEN}help${NC}                                  Show this help

${YELLOW}EXAMPLES:${NC}
    # Create repository
    $SCRIPT_NAME repo-create my-zsh-config "My personal zsh setup"
    
    # Git operations
    $SCRIPT_NAME git-commit "Update aliases" ~/.config/zsh/aliases.zsh
    $SCRIPT_NAME git-push main true
    
    # Analyze configuration
    $SCRIPT_NAME analyze ~/.config/zsh
    
    # Execute Copilot task
    $SCRIPT_NAME copilot "Optimize my zsh startup time" claude-sonnet-4.5
    
    # Session management
    $SCRIPT_NAME session-save my-work
    $SCRIPT_NAME session-resume my-work

${YELLOW}ENVIRONMENT VARIABLES:${NC}
    DEBUG=1                              Enable debug logging
    ZSH_CONFIG_DIR=/path/to/config       Custom zsh config directory

EOF
}

# Main execution
main() {
    local command="${1:-}"
    
    case "$command" in
        "repo-create")
            shift
            create_remote_repository "$@"
            ;;
        "git-commit")
            shift
            git_add_and_commit "$@"
            ;;
        "git-push")
            shift
            push_to_remote "$@"
            ;;
        "analyze")
            shift
            analyze_zsh_config "$@"
            ;;
        "copilot")
            shift
            execute_copilot_task "$@"
            ;;
        "session-save")
            shift
            save_session "$@"
            ;;
        "session-resume")
            shift
            resume_session "$@"
            ;;
        "check")
            check_prerequisites
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        "")
            error "No command specified. Use '$SCRIPT_NAME help' for usage information."
            exit 1
            ;;
        *)
            error "Unknown command: $command. Use '$SCRIPT_NAME help' for usage information."
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"