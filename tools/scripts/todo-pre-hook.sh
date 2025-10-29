#!/bin/bash

# Todo Pre-Command Hook
# Automatically enforces todo requirements before executing any command
#
# Usage:
#   source tools/scripts/todo-pre-hook.sh
#   # Then run any command - it will be automatically checked for todos
#
# Or for one-time use:
#   ./tools/scripts/todo-pre-hook.sh <agent-id> <command> [args...]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/config/.env.todo"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    # Extract only the variable assignments (skip comments)
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ $key =~ ^[[:space:]]*# ]] && continue
        [[ -z "$key" ]] && continue

        # Remove any trailing comments
        value="${value%%#*}"

        # Export the variable
        export "$key=$value"
    done < <(grep -v '^#' "$ENV_FILE" | grep '=')
fi

# Default values
TODO_ENFORCEMENT_STRICT="${TODO_ENFORCEMENT_STRICT:-true}"
AGENT_ID="${AGENT_ID:-unknown-agent}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to enforce todo before command execution
enforce_todo() {
    local operation="$1"
    local agent_id="$2"

    log_info "Checking todo requirements for: $operation"

    # Run the todo enforcement hook
    if ! node "$SCRIPT_DIR/todo-enforcement-hook.js" "$operation" "$agent_id" 2>/dev/null; then
        log_error "Todo enforcement failed for operation: $operation"
        log_info "Create a todo first:"
        log_info "  node $SCRIPT_DIR/shared-todo-cli.js create $agent_id \"$operation\""
        return 1
    fi

    log_success "Todo requirements satisfied"
    return 0
}

# Function to execute command with todo enforcement
execute_with_todo_check() {
    local agent_id="$1"
    local operation="$2"
    shift 2

    # Enforce todo requirements
    if ! enforce_todo "$operation" "$agent_id"; then
        return 1
    fi

    # Execute the command
    log_info "Executing: $@"
    exec "$@"
}

# Main logic
if [ $# -eq 0 ]; then
    # No arguments - set up the hook for interactive use
    log_info "Todo pre-hook loaded. Commands will be checked for todo requirements."
    log_info "Set AGENT_ID environment variable to specify your agent ID."
    log_info "Example: export AGENT_ID=your-agent-name"

    # Override common commands to add todo checking
    git() {
        local operation="git ${1:-operation}"
        enforce_todo "$operation" "$AGENT_ID" || return 1
        command git "$@"
    }

    npm() {
        local operation="npm ${1:-operation}"
        enforce_todo "$operation" "$AGENT_ID" || return 1
        command npm "$@"
    }

    node() {
        local operation="node ${1:-operation}"
        enforce_todo "$operation" "$AGENT_ID" || return 1
        command node "$@"
    }

    # Export the functions so they're available in the shell
    export -f git npm node enforce_todo
    export AGENT_ID TODO_ENFORCEMENT_STRICT

else
    # Arguments provided - execute specific command
    if [ $# -lt 2 ]; then
        log_error "Usage: $0 <agent-id> <command> [args...]"
        log_error "Example: $0 dev-agent 'npm test'"
        exit 1
    fi

    AGENT_ID="$1"
    OPERATION="$2"
    shift 2

    execute_with_todo_check "$AGENT_ID" "$OPERATION" "$@"
fi