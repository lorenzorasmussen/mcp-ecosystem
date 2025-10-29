#!/bin/bash
# OpenCode MCP Shell Integration
# Source this file to add MCP functions to your shell

# Configuration
MCP_BASE_DIR="$HOME/.local/share/mcp"
MCP_PROXY_URL="http://localhost:3007"

# MCP Functions for shell integration

# Quick status check
mcp-status() {
    echo "🔍 Checking MCP ecosystem status..."
    if curl -s "$MCP_PROXY_URL/status" > /dev/null 2>&1; then
        echo "✅ MCP ecosystem is running"
        return 0
    else
        echo "❌ MCP ecosystem is not running"
        echo "   Start with: pm2 start $MCP_BASE_DIR/ecosystem.config.cjs"
        return 1
    fi
}

# Start project servers automatically
mcp-auto() {
    local dir="${1:-.}"
    echo "🚀 Starting MCP servers for project in: $dir"

    # Detect project type
    local project_type="unknown"
    if [[ -f "$dir/package.json" ]]; then
        project_type="javascript"
    elif [[ -f "$dir/pyproject.toml" ]] || [[ -f "$dir/requirements.txt" ]]; then
        project_type="python"
    elif [[ -f "$dir/Cargo.toml" ]]; then
        project_type="rust"
    elif [[ -f "$dir/go.mod" ]]; then
        project_type="go"
    fi

    echo "📦 Detected project type: $project_type"

    case "$project_type" in
        javascript)
            mcp-start typescript-language-server
            mcp-start eslint
            mcp-start prettier
            ;;
        python)
            mcp-start pyright-langserver
            mcp-start ruff-lsp
            ;;
        rust)
            mcp-start rust-analyzer
            ;;
        go)
            mcp-start gopls
            ;;
        *)
            mcp-start filesystem
            ;;
    esac
}

# Start a specific server
mcp-start() {
    local server="$1"
    local config="${2:-}"

    echo "▶️  Starting $server..."
    if [[ -n "$config" ]]; then
        curl -s -X POST "$MCP_PROXY_URL/start/$server" \
             -H "Content-Type: application/json" \
             -d "$config" > /dev/null
    else
        curl -s -X POST "$MCP_PROXY_URL/start/$server" > /dev/null
    fi

    if [[ $? -eq 0 ]]; then
        echo "✅ Started $server"
    else
        echo "❌ Failed to start $server"
    fi
}

# Stop a specific server
mcp-stop() {
    local server="$1"
    echo "⏹️  Stopping $server..."
    curl -s -X POST "$MCP_PROXY_URL/stop/$server" > /dev/null

    if [[ $? -eq 0 ]]; then
        echo "✅ Stopped $server"
    else
        echo "❌ Failed to stop $server"
    fi
}

# Get server information
mcp-info() {
    local server="${1:-}"
    echo "📊 MCP Server Information:"
    if [[ -n "$server" ]]; then
        curl -s "$MCP_PROXY_URL/status/$server" | jq . 2>/dev/null || curl -s "$MCP_PROXY_URL/status/$server"
    else
        curl -s "$MCP_PROXY_URL/servers/status" | jq . 2>/dev/null || curl -s "$MCP_PROXY_URL/servers/status"
    fi
}

# List available servers
mcp-list() {
    echo "📋 Available MCP Servers:"
    curl -s "$MCP_PROXY_URL/servers/list" | jq . 2>/dev/null || curl -s "$MCP_PROXY_URL/servers/list"
}

# OpenCode integration - start MCP servers when entering a directory
mcp-enter-directory() {
    # This function can be added to your shell's cd hook
    # For bash, add to PROMPT_COMMAND
    # For zsh, add to chpwd_functions

    if [[ -f ".mcp.json" ]]; then
        echo "🔗 Found project MCP config, starting servers..."
        mcp-auto "."
    fi
}

# Initialize MCP environment
mcp-init() {
    echo "🔧 Initializing MCP environment..."

    # Check if MCP is running
    if ! mcp-status > /dev/null 2>&1; then
        echo "⚠️  MCP ecosystem not running. Start with:"
        echo "   pm2 start $MCP_BASE_DIR/ecosystem.config.cjs"
        return 1
    fi

    # Add to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        export PATH="$HOME/.local/bin:$PATH"
        echo "✅ Added ~/.local/bin to PATH"
    fi

    echo "✅ MCP environment ready!"
    echo "   Available commands: mcp-status, mcp-start, mcp-stop, mcp-info, mcp-list, mcp-auto"
}

# Display help
mcp-help() {
    cat << 'EOF'
OpenCode MCP Shell Integration

FUNCTIONS:
    mcp-status          Check MCP ecosystem status
    mcp-auto [dir]      Auto-detect and start servers for project
    mcp-start <server>  Start a specific MCP server
    mcp-stop <server>   Stop a specific MCP server
    mcp-info [server]   Get server status information
    mcp-list            List available MCP servers
    mcp-init            Initialize MCP environment

USAGE EXAMPLES:
    mcp-status                    # Check if MCP is running
    mcp-auto                      # Start servers for current directory
    mcp-start typescript-language-server  # Start TypeScript server
    mcp-stop eslint               # Stop ESLint server
    mcp-info                      # Show all server statuses
    mcp-list                      # List available servers

INTEGRATION:
    Add to your shell profile (~/.bashrc or ~/.zshrc):
    source ~/.local/share/mcp/mcp-shell-integration.sh

    For automatic project detection on directory change:
    # Bash: Add to ~/.bashrc
    PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND$'\n'} mcp-enter-directory"

    # Zsh: Add to ~/.zshrc
    autoload -U add-zsh-hook
    add-zsh-hook chpwd mcp-enter-directory
EOF
}

# Auto-initialize if script is sourced
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    echo "🔗 MCP shell integration loaded!"
    echo "   Run 'mcp-help' for usage information"
    echo "   Run 'mcp-init' to set up the environment"
fi