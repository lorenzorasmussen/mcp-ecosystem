#!/bin/bash

# Test Todo Enforcement Hooks
# Quick test to verify the hooks are working

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment
export $(grep -v '^#' "$PROJECT_ROOT/config/.env.todo" | grep '=' | xargs 2>/dev/null)

echo "Testing Todo Enforcement Hooks..."
echo "TODO_ENFORCEMENT_STRICT=$TODO_ENFORCEMENT_STRICT"
echo ""

# Test 1: Direct hook call
echo "Test 1: Direct hook call"
node "$SCRIPT_DIR/todo-enforcement-hook.js" "test operation" "test-agent"
echo "Exit code: $?"
echo ""

# Test 2: Wrapper script
echo "Test 2: Wrapper script"
timeout 5 node "$SCRIPT_DIR/todo-enforce-wrapper.js" "test-agent" "echo test" -- echo "Wrapper test successful" 2>/dev/null || echo "Wrapper test (may have failed as expected)"
echo ""

# Test 3: CLI status
echo "Test 3: CLI status"
node "$SCRIPT_DIR/shared-todo-cli.js" status | head -10
echo ""

echo "Todo enforcement hook tests completed."