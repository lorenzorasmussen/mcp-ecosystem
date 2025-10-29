#!/bin/bash

# Enable Todo Enforcement for Current Shell Session
# This script sets up automatic todo enforcement for all commands
#
# Usage: source tools/scripts/enable-todo-enforcement.sh [agent-id]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables
ENV_FILE="$PROJECT_ROOT/config/.env.todo"
if [ -f "$ENV_FILE" ]; then
    # Extract only the variable assignments (skip comments)
    grep -v '^#' "$ENV_FILE" | grep '=' | while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ $key =~ ^[[:space:]]*# ]] && continue
        [[ -z "$key" ]] && continue

        # Remove any trailing comments
        value="${value%%#*}"

        # Export the variable
        export "$key=$value"
    done
fi

# Set default agent ID if not provided
AGENT_ID="${1:-${AGENT_ID:-unknown-agent}}"
export AGENT_ID

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}✅ Todo Enforcement Enabled${NC}"
echo -e "${BLUE}Agent ID:${NC} $AGENT_ID"
echo -e "${BLUE}Strict Mode:${NC} ${TODO_ENFORCEMENT_STRICT:-false}"
echo ""

# Function to check todo before command execution
check_todo() {
    local operation="$1"
    local agent_id="$AGENT_ID"

    if ! node "$SCRIPT_DIR/todo-enforcement-hook.js" "$operation" "$agent_id" >/dev/null 2>&1; then
        echo -e "${RED}❌ Todo enforcement failed for: $operation${NC}" >&2
        echo -e "${YELLOW}Create a todo first:${NC}" >&2
        echo -e "  node $SCRIPT_DIR/shared-todo-cli.js create $agent_id \"$operation\"" >&2
        return 1
    fi
    return 0
}

# Override common commands
git() {
    check_todo "git $*" || return 1
    command git "$@"
}

npm() {
    check_todo "npm $*" || return 1
    command npm "$@"
}

node() {
    check_todo "node $*" || return 1
    command node "$@"
}

yarn() {
    check_todo "yarn $*" || return 1
    command yarn "$@"
}

python() {
    check_todo "python $*" || return 1
    command python "$@"
}

pip() {
    check_todo "pip $*" || return 1
    command pip "$@"
}

# Export functions
export -f git npm node yarn python pip check_todo
export AGENT_ID TODO_ENFORCEMENT_STRICT

echo -e "${YELLOW}⚠️  All commands now require active todos${NC}"
echo -e "${BLUE}To create a todo:${NC} node tools/scripts/shared-todo-cli.js create $AGENT_ID \"your task\""
echo -e "${BLUE}To check status:${NC} node tools/scripts/shared-todo-cli.js status"
echo ""