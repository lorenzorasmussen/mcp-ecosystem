#!/bin/bash

# Add local bin to PATH
export PATH="/Users/lorenzorasmussen/.local/bin:$PATH"

# Check if bws is configured
if bws project list >/dev/null 2>&1; then
    echo "Using bws to inject environment variables into opencode"
    # If bws is configured, we could use it to run opencode with injected secrets
    # For now, we'll export directly since bws setup is needed
else
    echo "bws not configured, exporting environment variables directly"
fi

# Source the environment variables
source /Users/lorenzorasmussen/.local/share/mcp/export_env.sh

# Check if opencode exists globally or in ~/ directory
OPENCODE_PATH="/Users/lorenzorasmussen/.opencode/bin/opencode"

if [ -f "$OPENCODE_PATH" ]; then
    echo "Running opencode with injected environment variables"
    "$OPENCODE_PATH" "$@"
elif [ -f "/Users/lorenzorasmussen/opencode" ]; then
    echo "Running opencode with injected environment variables"
    cd /Users/lorenzorasmussen && ./opencode "$@"
else
    echo "opencode not found. Checking global PATH..."
    if command -v opencode >/dev/null 2>&1; then
        echo "Running global opencode with injected environment variables"
        opencode "$@"
    else
        echo "opencode not found in any location"
        echo "Checked: $OPENCODE_PATH, ~/opencode, and global PATH"
    fi
fi