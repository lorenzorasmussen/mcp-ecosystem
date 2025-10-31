#!/bin/bash

# Copilot Session Manager and Logging System
# Advanced session management with comprehensive logging

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
readonly SESSION_DIR="${HOME}/.config/zsh/sessions"
readonly LOG_DIR="${HOME}/.config/zsh/logs"
readonly SESSION_INDEX="${SESSION_DIR}/index.json"
readonly MAIN_LOG="${LOG_DIR}/copilot-workflow.log"
readonly ACTIVITY_LOG="${LOG_DIR}/activity.log"

# Ensure directories exist
mkdir -p "$SESSION_DIR" "$LOG_DIR"

# Initialize session index
init_session_index() {
    if [[ ! -f "$SESSION_INDEX" ]]; then
        cat > "$SESSION_INDEX" << EOF
{
    "version": "1.0.0",
    "created": "$(date -Iseconds)",
    "sessions": [],
    "active_sessions": [],
    "last_cleanup": "$(date -Iseconds)"
}
EOF
    fi
}

# Logging functions
log_to_file() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local log_entry="${timestamp} [${level}] ${message}"
    
    # Log to main log
    echo "$log_entry" >> "$MAIN_LOG"
    
    # Log to activity log
    echo "$log_entry" >> "$ACTIVITY_LOG"
    
    # Output to console with color
    case "$level" in
        "INFO") echo -e "${BLUE}$log_entry${NC}" ;;
        "SUCCESS") echo -e "${GREEN}$log_entry${NC}" ;;
        "WARNING") echo -e "${YELLOW}$log_entry${NC}" ;;
        "ERROR") echo -e "${RED}$log_entry${NC}" ;;
        "DEBUG") echo -e "${PURPLE}$log_entry${NC}" ;;
        *) echo "$log_entry" ;;
    esac
}

info() { log_to_file "INFO" "$*"; }
success() { log_to_file "SUCCESS" "$*"; }
warning() { log_to_file "WARNING" "$*"; }
error() { log_to_file "ERROR" "$*"; }
debug() { log_to_file "DEBUG" "$*"; }

# Session management functions
create_session() {
    local session_name="$1"
    local description="${2:-}"
    local tags="${3:-}"
    
    if [[ -z "$session_name" ]]; then
        error "Session name is required"
        return 1
    fi
    
    # Check if session already exists
    local session_file="${SESSION_DIR}/${session_name}.json"
    if [[ -f "$session_file" ]]; then
        error "Session '$session_name' already exists"
        return 1
    fi
    
    # Create session data
    local session_id=$(uuidgen 2>/dev/null || date +%s%N)
    local timestamp=$(date -Iseconds)
    local working_dir=$(pwd)
    local git_branch=$(git branch --show-current 2>/dev/null || echo "not-a-git-repo")
    local git_status=$(git status --porcelain 2>/dev/null || echo "")
    
    local session_data=$(cat << EOF
{
    "id": "$session_id",
    "name": "$session_name",
    "description": "$description",
    "tags": [$(echo "$tags" | tr ' ' '\n' | sed 's/^/"/' | sed 's/$/"/' | tr '\n' ',' | sed 's/,$//')],
    "created": "$timestamp",
    "last_accessed": "$timestamp",
    "status": "active",
    "working_directory": "$working_dir",
    "git": {
        "branch": "$git_branch",
        "status": "$git_status",
        "remote": "$(git remote get-url origin 2>/dev/null || echo "")"
    },
    "environment": {
        "shell": "$SHELL",
        "user": "$USER",
        "hostname": "$(hostname)",
        "zsh_version": "$ZSH_VERSION",
        "path": "$PATH"
    },
    "activities": [],
    "snapshots": []
}
EOF
)
    
    # Save session
    echo "$session_data" > "$session_file"
    
    # Update index
    update_session_index "$session_name" "create"
    
    success "Session '$session_name' created successfully"
    info "Session file: $session_file"
    
    return 0
}

update_session_index() {
    local session_name="$1"
    local action="$2"
    
    init_session_index
    
    local temp_file=$(mktemp)
    
    case "$action" in
        "create")
            jq --arg name "$session_name" --arg timestamp "$(date -Iseconds)" \
                '.sessions += [{name: $name, created: $timestamp}] | .active_sessions += [$name]' \
                "$SESSION_INDEX" > "$temp_file"
            ;;
        "access")
            jq --arg name "$session_name" --arg timestamp "$(date -Iseconds)" \
                '(.sessions[] | select(.name == $name)).last_accessed = $timestamp' \
                "$SESSION_INDEX" > "$temp_file"
            ;;
        "close")
            jq --arg name "$session_name" \
                '.active_sessions -= [$name]' \
                "$SESSION_INDEX" > "$temp_file"
            ;;
        "delete")
            jq --arg name "$session_name" \
                '.sessions -= [.sessions[] | select(.name == $name)] | .active_sessions -= [$name]' \
                "$SESSION_INDEX" > "$temp_file"
            ;;
    esac
    
    mv "$temp_file" "$SESSION_INDEX"
}

load_session() {
    local session_name="$1"
    local session_file="${SESSION_DIR}/${session_name}.json"
    
    if [[ ! -f "$session_file" ]]; then
        error "Session '$session_name' not found"
        return 1
    fi
    
    # Update last accessed
    update_session_index "$session_name" "access"
    
    # Load session data
    local working_dir=$(jq -r '.working_directory' "$session_file")
    local git_branch=$(jq -r '.git.branch' "$session_file")
    
    info "Loading session: $session_name"
    info "Working directory: $working_dir"
    info "Git branch: $git_branch"
    
    # Change to working directory
    if [[ -d "$working_dir" ]]; then
        cd "$working_dir"
        success "Changed to directory: $working_dir"
    else
        warning "Working directory not found: $working_dir"
    fi
    
    # Check git status
    if [[ -d ".git" ]]; then
        local current_branch=$(git branch --show-current)
        if [[ "$current_branch" != "$git_branch" ]]; then
            info "Switching to branch: $git_branch"
            git checkout "$git_branch" 2>/dev/null || warning "Failed to switch to branch $git_branch"
        fi
    fi
    
    # Log activity
    add_session_activity "$session_name" "session_loaded" "Session loaded and restored"
    
    return 0
}

add_session_activity() {
    local session_name="$1"
    local activity_type="$2"
    local description="$3"
    local session_file="${SESSION_DIR}/${session_name}.json"
    
    if [[ ! -f "$session_file" ]]; then
        return 1
    fi
    
    local activity=$(cat << EOF
{
    "timestamp": "$(date -Iseconds)",
    "type": "$activity_type",
    "description": "$description",
    "working_directory": "$(pwd)",
    "git_branch": "$(git branch --show-current 2>/dev/null || echo 'not-a-git-repo')"
}
EOF
)
    
    local temp_file=$(mktemp)
    jq --argjson activity "$activity" '.activities += [$activity]' "$session_file" > "$temp_file"
    mv "$temp_file" "$session_file"
}

create_session_snapshot() {
    local session_name="$1"
    local description="${2:-Automatic snapshot}"
    local session_file="${SESSION_DIR}/${session_name}.json"
    
    if [[ ! -f "$session_file" ]]; then
        error "Session '$session_name' not found"
        return 1
    fi
    
    local snapshot=$(cat << EOF
{
    "timestamp": "$(date -Iseconds)",
    "description": "$description",
    "working_directory": "$(pwd)",
    "git_status": "$(git status --porcelain 2>/dev/null || echo '')",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'not-a-git-repo')",
    "files_changed": $(git diff --name-only 2>/dev/null | jq -R . | jq -s . || echo '[]'),
    "environment": {
        "pwd": "$(pwd)",
        "user": "$USER",
        "hostname": "$(hostname)"
    }
}
EOF
)
    
    local temp_file=$(mktemp)
    jq --argjson snapshot "$snapshot" '.snapshots += [$snapshot]' "$session_file" > "$temp_file"
    mv "$temp_file" "$session_file"
    
    success "Snapshot created for session '$session_name'"
    add_session_activity "$session_name" "snapshot_created" "$description"
    
    return 0
}

close_session() {
    local session_name="$1"
    local session_file="${SESSION_DIR}/${session_name}.json"
    
    if [[ ! -f "$session_file" ]]; then
        error "Session '$session_name' not found"
        return 1
    fi
    
    # Create final snapshot
    create_session_snapshot "$session_name" "Session closed"
    
    # Update session status
    local temp_file=$(mktemp)
    jq --arg timestamp "$(date -Iseconds)" \
        '.status = "closed" | .closed = $timestamp' \
        "$session_file" > "$temp_file"
    mv "$temp_file" "$session_file"
    
    # Update index
    update_session_index "$session_name" "close"
    
    success "Session '$session_name' closed"
    
    return 0
}

delete_session() {
    local session_name="$1"
    local session_file="${SESSION_DIR}/${session_name}.json"
    
    if [[ ! -f "$session_file" ]]; then
        error "Session '$session_name' not found"
        return 1
    fi
    
    # Remove session file
    rm "$session_file"
    
    # Update index
    update_session_index "$session_name" "delete"
    
    success "Session '$session_name' deleted"
    
    return 0
}

list_sessions() {
    local show_details="${1:-false}"
    
    init_session_index
    
    info "Available sessions:"
    
    if [[ "$show_details" == "true" ]]; then
        # Detailed view
        jq -r '.sessions[] | "Name: \(.name)\nCreated: \(.created)\nLast Accessed: \(.last_accessed)\nStatus: \(.status)\n---"' "$SESSION_INDEX"
    else
        # Simple list
        local sessions=($(jq -r '.sessions[].name' "$SESSION_INDEX"))
        local active_sessions=($(jq -r '.active_sessions[]' "$SESSION_INDEX"))
        
        for session in "${sessions[@]}"; do
            if [[ " ${active_sessions[*]} " =~ " ${session} " ]]; then
                echo -e "${GREEN}$session (active)${NC}"
            else
                echo "$session"
            fi
        done
    fi
}

show_session_info() {
    local session_name="$1"
    local session_file="${SESSION_DIR}/${session_name}.json"
    
    if [[ ! -f "$session_file" ]]; then
        error "Session '$session_name' not found"
        return 1
    fi
    
    echo "${CYAN}Session Information:${NC}"
    jq -r '
        "Name: \(.name)",
        "Description: \(.description)",
        "Tags: \(.tags | join(", "))",
        "Created: \(.created)",
        "Last Accessed: \(.last_accessed)",
        "Status: \(.status)",
        "Working Directory: \(.working_directory)",
        "Git Branch: \(.git.branch)",
        "Activities: \(.activities | length)",
        "Snapshots: \(.snapshots | length)"
    ' "$session_file"
}

show_session_activities() {
    local session_name="$1"
    local limit="${2:-10}"
    local session_file="${SESSION_DIR}/${session_name}.json"
    
    if [[ ! -f "$session_file" ]]; then
        error "Session '$session_name' not found"
        return 1
    fi
    
    echo "${CYAN}Recent Activities (last $limit):${NC}"
    jq -r --argjson limit "$limit" \
        '.activities[-$limit:] | reverse | .[] | "\(.timestamp) [\(.type)] \(.description)"' \
        "$session_file"
}

cleanup_old_sessions() {
    local days="${1:-30}"
    local cutoff_date=$(date -d "$days days ago" -Iseconds 2>/dev/null || date -v-${days}d -Iseconds)
    
    init_session_index
    
    info "Cleaning up sessions older than $days days..."
    
    local sessions_to_delete=($(jq -r --arg cutoff "$cutoff_date" \
        '.sessions[] | select(.last_accessed < $cutoff) | .name' \
        "$SESSION_INDEX"))
    
    if [[ ${#sessions_to_delete[@]} -eq 0 ]]; then
        info "No sessions to clean up"
        return 0
    fi
    
    for session in "${sessions_to_delete[@]}"; do
        warning "Deleting old session: $session"
        delete_session "$session"
    done
    
    # Update cleanup timestamp
    local temp_file=$(mktemp)
    jq --arg timestamp "$(date -Iseconds)" \
        '.last_cleanup = $timestamp' \
        "$SESSION_INDEX" > "$temp_file"
    mv "$temp_file" "$SESSION_INDEX"
    
    success "Cleanup completed"
}

export_session() {
    local session_name="$1"
    local output_file="${2:-${session_name}_export.json}"
    local session_file="${SESSION_DIR}/${session_name}.json"
    
    if [[ ! -f "$session_file" ]]; then
        error "Session '$session_name' not found"
        return 1
    fi
    
    cp "$session_file" "$output_file"
    success "Session exported to: $output_file"
}

import_session() {
    local import_file="$1"
    local new_name="${2:-}"
    
    if [[ ! -f "$import_file" ]]; then
        error "Import file not found: $import_file"
        return 1
    fi
    
    # Extract session name or use provided name
    local session_name
    if [[ -n "$new_name" ]]; then
        session_name="$new_name"
    else
        session_name=$(jq -r '.name' "$import_file")
    fi
    
    local session_file="${SESSION_DIR}/${session_name}.json"
    
    if [[ -f "$session_file" ]]; then
        error "Session '$session_name' already exists"
        return 1
    fi
    
    # Update timestamps and import
    local temp_file=$(mktemp)
    jq --arg timestamp "$(date -Iseconds)" \
        '.created = $timestamp | .last_accessed = $timestamp | .status = "active"' \
        "$import_file" > "$temp_file"
    
    mv "$temp_file" "$session_file"
    
    # Update index
    update_session_index "$session_name" "create"
    
    success "Session imported: $session_name"
}

# Log analysis functions
analyze_logs() {
    local days="${1:-7}"
    local since_date=$(date -d "$days days ago" '+%Y-%m-%d' 2>/dev/null || date -v-${days}d '+%Y-%m-%d')
    
    info "Analyzing logs since $since_date..."
    
    echo "${CYAN}Activity Summary (last $days days):${NC}"
    
    # Count by level
    echo "By Level:"
    grep "^\[$since_date" "$ACTIVITY_LOG" 2>/dev/null | \
        awk -F'\\[|\\]' '{print $3}' | sort | uniq -c | sort -nr
    
    echo
    echo "Recent Errors:"
    grep "^\[$since_date.*ERROR" "$ACTIVITY_LOG" 2>/dev/null | tail -5
    
    echo
    echo "Recent Successes:"
    grep "^\[$since_date.*SUCCESS" "$ACTIVITY_LOG" 2>/dev/null | tail -5
}

search_logs() {
    local pattern="$1"
    local days="${2:-7}"
    local since_date=$(date -d "$days days ago" '+%Y-%m-%d' 2>/dev/null || date -v-${days}d '+%Y-%m-%d')
    
    info "Searching logs for: $pattern (since $since_date)"
    
    grep -i "^\[$since_date.*$pattern" "$ACTIVITY_LOG" 2>/dev/null || \
        grep -i "$pattern" "$MAIN_LOG" 2>/dev/null
}

# Help system
show_help() {
    cat << EOF
${CYAN}Copilot Session Manager and Logging System${NC}

${YELLOW}USAGE:${NC}
    $0 <command> [options]

${YELLOW}SESSION MANAGEMENT:${NC}
    ${GREEN}create${NC} <name> [description] [tags]     Create new session
    ${GREEN}load${NC} <name>                             Load and restore session
    ${GREEN}close${NC} <name>                            Close session
    ${GREEN}delete${NC} <name>                           Delete session
    ${GREEN}list${NC} [detailed]                         List sessions
    ${GREEN}info${NC} <name>                             Show session information
    ${GREEN}activities${NC} <name> [limit]               Show session activities

${YELLOW}SNAPSHOT MANAGEMENT:${NC}
    ${GREEN}snapshot${NC} <name> [description]          Create session snapshot

${YELLOW}IMPORT/EXPORT:${NC}
    ${GREEN}export${NC} <name> [output-file]            Export session
    ${GREEN}import${NC} <file> [new-name]                Import session

${YELLOW}MAINTENANCE:${NC}
    ${GREEN}cleanup${NC} [days]                          Clean up old sessions (default: 30)

${YELLOW}LOG ANALYSIS:${NC}
    ${GREEN}analyze${NC} [days]                          Analyze recent logs (default: 7)
    ${GREEN}search${NC} <pattern> [days]                  Search logs (default: 7)

${YELLOW}EXAMPLES:${NC}
    # Create and use session
    $0 create my-work "Working on zsh optimization" "zsh,optimization"
    $0 load my-work
    
    # Session management
    $0 list detailed
    $0 info my-work
    $0 activities my-work 5
    
    # Snapshots
    $0 snapshot my-work "Before major changes"
    
    # Log analysis
    $0 analyze 3
    $0 search "error" 1

${YELLOW}FILES:${NC}
    Sessions: $SESSION_DIR
    Logs: $LOG_DIR
    Index: $SESSION_INDEX

EOF
}

# Main execution
main() {
    local command="${1:-}"
    
    case "$command" in
        "create")
            shift
            create_session "$@"
            ;;
        "load")
            shift
            load_session "$@"
            ;;
        "close")
            shift
            close_session "$@"
            ;;
        "delete")
            shift
            delete_session "$@"
            ;;
        "list")
            shift
            list_sessions "$@"
            ;;
        "info")
            shift
            show_session_info "$@"
            ;;
        "activities")
            shift
            show_session_activities "$@"
            ;;
        "snapshot")
            shift
            create_session_snapshot "$@"
            ;;
        "export")
            shift
            export_session "$@"
            ;;
        "import")
            shift
            import_session "$@"
            ;;
        "cleanup")
            shift
            cleanup_old_sessions "$@"
            ;;
        "analyze")
            shift
            analyze_logs "$@"
            ;;
        "search")
            shift
            search_logs "$@"
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