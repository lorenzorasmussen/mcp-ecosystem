#!/bin/bash
# OpenCode MCP Connection Utility
# Allows connecting to MCP servers from any directory

set -e

# Configuration
MCP_BASE_DIR="$HOME/.local/share/mcp"
MCP_PROXY_URL="http://localhost:3007"
MCP_CONFIG="$MCP_BASE_DIR/mcp.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if MCP ecosystem is running
check_mcp_status() {
    if curl -s "$MCP_PROXY_URL/status" > /dev/null 2>&1; then
        log_success "MCP ecosystem is running"
        return 0
    else
        log_warning "MCP ecosystem is not running"
        log_info "Start with: pm2 start $MCP_BASE_DIR/ecosystem.config.cjs"
        return 1
    fi
}

# Detect project type and suggest servers
detect_project_type() {
    local dir="${1:-.}"
    local project_type="unknown"

    if [[ -f "$dir/package.json" ]]; then
        project_type="javascript"
    elif [[ -f "$dir/pyproject.toml" ]] || [[ -f "$dir/requirements.txt" ]]; then
        project_type="python"
    elif [[ -f "$dir/Cargo.toml" ]]; then
        project_type="rust"
    elif [[ -f "$dir/go.mod" ]]; then
        project_type="go"
    elif [[ -f "$dir/Dockerfile" ]]; then
        project_type="docker"
    fi

    echo "$project_type"
}

# Start servers based on project type
start_project_servers() {
    local project_type=$(detect_project_type "$1")

    log_info "Detected project type: $project_type"

    case "$project_type" in
        javascript)
            log_info "Starting JavaScript/TypeScript development servers..."
            start_server "typescript-language-server"
            start_server "eslint"
            start_server "prettier"
            ;;
        python)
            log_info "Starting Python development servers..."
            start_server "pyright-langserver"
            start_server "ruff-lsp"
            ;;
        rust)
            log_info "Starting Rust development servers..."
            start_server "rust-analyzer"
            ;;
        go)
            log_info "Starting Go development servers..."
            start_server "gopls"
            ;;
        docker)
            log_info "Starting Docker-related servers..."
            start_server "docker-langserver"
            ;;
        *)
            log_info "Starting general development servers..."
            start_server "filesystem"
            ;;
    esac
}

# Start a specific MCP server
start_server() {
    local server_name="$1"
    local config="${2:-}"

    log_info "Starting server: $server_name"

    if [[ -n "$config" ]]; then
        curl -s -X POST "$MCP_PROXY_URL/start/$server_name" \
             -H "Content-Type: application/json" \
             -d "$config" > /dev/null
    else
        curl -s -X POST "$MCP_PROXY_URL/start/$server_name" > /dev/null
    fi

    if [[ $? -eq 0 ]]; then
        log_success "Started $server_name"
    else
        log_error "Failed to start $server_name"
    fi
}

# Stop a specific MCP server
stop_server() {
    local server_name="$1"

    log_info "Stopping server: $server_name"

    curl -s -X POST "$MCP_PROXY_URL/stop/$server_name" > /dev/null

    if [[ $? -eq 0 ]]; then
        log_success "Stopped $server_name"
    else
        log_error "Failed to stop $server_name"
    fi
}

# Get server status
server_status() {
    local server_name="${1:-}"

    if [[ -n "$server_name" ]]; then
        log_info "Status of $server_name:"
        curl -s "$MCP_PROXY_URL/status/$server_name" | jq . 2>/dev/null || curl -s "$MCP_PROXY_URL/status/$server_name"
    else
        log_info "All server statuses:"
        curl -s "$MCP_PROXY_URL/servers/status" | jq . 2>/dev/null || curl -s "$MCP_PROXY_URL/servers/status"
    fi
}

# List available servers
list_servers() {
    log_info "Available MCP servers:"
    curl -s "$MCP_PROXY_URL/servers/list" | jq . 2>/dev/null || curl -s "$MCP_PROXY_URL/servers/list"
}

# Create project-specific MCP config
create_project_config() {
    local project_type=$(detect_project_type ".")
    local config_file=".mcp.json"

    if [[ -f "$config_file" ]]; then
        log_warning "MCP config already exists: $config_file"
        return 1
    fi

    log_info "Creating project-specific MCP config for $project_type"

    case "$project_type" in
        javascript)
            cat > "$config_file" << EOF
{
  "mcpServers": {
    "filesystem": {
      "command": ["npx", "@modelcontextprotocol/server-filesystem", "."],
      "env": {
        "NODE_ENV": "development"
      }
    },
    "git": {
      "command": ["npx", "@modelcontextprotocol/server-git", "--repository", "."]
    }
  }
}
EOF
            ;;
        python)
            cat > "$config_file" << EOF
{
  "mcpServers": {
    "filesystem": {
      "command": ["npx", "@modelcontextprotocol/server-filesystem", "."],
      "env": {
        "PYTHONPATH": "."
      }
    },
    "git": {
      "command": ["npx", "@modelcontextprotocol/server-git", "--repository", "."]
    }
  }
}
EOF
            ;;
        *)
            cat > "$config_file" << EOF
{
  "mcpServers": {
    "filesystem": {
      "command": ["npx", "@modelcontextprotocol/server-filesystem", "."]
    },
    "git": {
      "command": ["npx", "@modelcontextprotocol/server-git", "--repository", "."]
    }
  }
}
EOF
            ;;
    esac

    log_success "Created $config_file"
}

# Main command handling
main() {
    local command="$1"
    shift

    case "$command" in
        status)
            check_mcp_status
            ;;
        start)
            if [[ $# -eq 0 ]]; then
                start_project_servers "."
            else
                start_server "$1" "$2"
            fi
            ;;
        stop)
            if [[ $# -gt 0 ]]; then
                stop_server "$1"
            else
                log_error "Please specify a server to stop"
            fi
            ;;
        list)
            list_servers
            ;;
        info)
            server_status "$1"
            ;;
        init)
            create_project_config
            ;;
        auto)
            start_project_servers "${1:-.}"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Show help
show_help() {
    cat << EOF
OpenCode MCP Connection Utility

USAGE:
    mcp-connect.sh <command> [options]

COMMANDS:
    status              Check MCP ecosystem status
    start [server]      Start project servers or specific server
    stop <server>       Stop a specific server
    list                List available servers
    info [server]       Get server status information
    init                Create project-specific MCP config
    auto [dir]          Auto-detect and start servers for project
    help                Show this help message

EXAMPLES:
    mcp-connect.sh status                    # Check if MCP is running
    mcp-connect.sh start                     # Start servers for current project
    mcp-connect.sh start typescript-language-server  # Start specific server
    mcp-connect.sh stop eslint               # Stop ESLint server
    mcp-connect.sh list                      # List all available servers
    mcp-connect.sh info                      # Show all server statuses
    mcp-connect.sh init                      # Create .mcp.json for project

PROJECT DETECTION:
    Automatically detects: JavaScript, Python, Rust, Go, Docker projects
    Starts appropriate language servers and development tools

CONFIGURATION:
    Global config: $MCP_CONFIG
    Project config: ./.mcp.json (created with 'init')
    MCP Proxy: $MCP_PROXY_URL
EOF
}

# Run main function with all arguments
main "$@"