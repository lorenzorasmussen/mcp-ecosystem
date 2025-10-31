#!/bin/bash

# OpenCode Multi-Server Manager
# Manages multiple OpenCode servers for different purposes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$HOME/.opencode/logs"

# Server configurations (POSIX-compatible format)
# Format: name:port:directory:purpose
SERVER_LIST="mcp-ecosystem:55717:/Users/lorenzorasmussen/.local/share/mcp:Main MCP Ecosystem opencode-dev:55467:/Users/lorenzorasmussen/Projects/opencode:OpenCode Development opencode-config:55471:/Users/lorenzorasmussen/.config/opencode:OpenCode Configuration zed-config:55748:/Users/lorenzorasmussen/.config/zed:Zed Configuration"

# Helper function to get server configuration
get_server_config() {
    local server_name=$1
    local field=$2  # 1=port, 2=directory, 3=purpose
    
    echo "$SERVER_LIST" | tr ' ' '\n' | grep "^$server_name:" | cut -d':' -f$field
}

# Helper function to get all server names
get_server_names() {
    echo "$SERVER_LIST" | tr ' ' '\n' | cut -d':' -f1
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

info() {
    echo -e "${PURPLE}ℹ️  $1${NC}"
}

header() {
    echo -e "${CYAN}=== $1 ===${NC}"
}

# List all servers
list_servers() {
    header "OpenCode Server Inventory"
    echo ""
    
    printf "${CYAN}%-15s${NC} | ${CYAN}%-5s${NC} | ${CYAN}%-7s${NC} | ${CYAN}%-20s${NC} | %s\n" "Server Name" "Port" "Status" "Purpose" "Directory"
    printf "%-15s-+-%-5s-+-%-7s-+-%-20s-+-%s\n" "---------------" "-----" "-------" "--------------------" "--------------------"
    
    for server_name in "${!SERVER_CONFIGS[@]}"; do
        IFS=':' read -r port directory purpose <<< "${SERVER_CONFIGS[$server_name]}"
        
        # Check if server is running
        if curl -s --max-time 2 "http://127.0.0.1:$port/doc" > /dev/null 2>&1; then
            status="Online"
            status_color="$GREEN"
            
            # Get additional info
            project_id=$(curl -s --max-time 2 "http://127.0.0.1:$port/project/current?directory=$directory" | jq -r '.id // "Unknown"' 2>/dev/null)
            sessions=$(curl -s --max-time 2 "http://127.0.0.1:$port/session?directory=$directory" | jq '. | length // 0' 2>/dev/null)
        else
            status="Offline"
            status_color="$RED"
            project_id="N/A"
            sessions="N/A"
        fi
        
        printf "${status_color}%-15s${NC} | %-5s | ${status_color}%-7s${NC} | %-20s | %s\n" "$server_name" "$port" "$status" "$purpose" "$directory"
        if [ "$status" = "Online" ]; then
            printf "                | Project ID: %s | Sessions: %s\n" "$project_id" "$sessions"
        fi
        echo ""
    done
}

# Start specific server
start_server() {
    local server_name=$1
    if [ -z "$server_name" ]; then
        error "Server name required"
        echo "Available servers: $(get_server_names)"
        return 1
    fi
    
    port=$(get_server_config "$server_name" 2)
    if [ -z "$port" ]; then
        error "Unknown server: $server_name"
        echo "Available servers: $(get_server_names)"
        return 1
    fi
    
    directory=$(get_server_config "$server_name" 3)
    purpose=$(get_server_config "$server_name" 4)
    
    header "Starting $server_name server"
    info "Port: $port"
    info "Directory: $directory"
    info "Purpose: $purpose"
    
    # Check if directory exists
    if [ ! -d "$directory" ]; then
        error "Directory does not exist: $directory"
        return 1
    fi
    
    # Check if port is already in use
    if lsof -i :$port > /dev/null 2>&1; then
        warning "Port $port is already in use"
        existing_pid=$(lsof -ti:$port 2>/dev/null)
        info "Existing process PID: $existing_pid"
        read -p "Do you want to kill the existing process? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if [ -n "$existing_pid" ]; then
                kill -TERM $existing_pid 2>/dev/null
                sleep 2
                # Force kill if still running
                if kill -0 $existing_pid 2>/dev/null; then
                    kill -KILL $existing_pid 2>/dev/null
                fi
                success "Killed existing process"
            fi
        else
            return 1
        fi
    fi
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Start server
    log "Starting OpenCode server..."
    cd "$directory"
    nohup opencode serve -p $port --print-logs --log-level INFO > "$LOG_DIR/$server_name.log" 2>&1 &
    local pid=$!
    
    sleep 3
    
    # Verify server started
    if curl -s --max-time 5 "http://127.0.0.1:$port/doc" > /dev/null 2>&1; then
        success "$server_name server started successfully"
        info "PID: $pid"
        info "Logs: $LOG_DIR/$server_name.log"
        info "API Documentation: http://127.0.0.1:$port/doc"
        
        # Get project info
        project_info=$(curl -s --max-time 2 "http://127.0.0.1:$port/project/current?directory=$directory" 2>/dev/null)
        if [ $? -eq 0 ]; then
            project_id=$(echo $project_info | jq -r '.id // "Unknown"')
            info "Project ID: $project_id"
        fi
    else
        error "Failed to start $server_name server"
        info "Check logs: $LOG_DIR/$server_name.log"
        return 1
    fi
}

# Stop specific server
stop_server() {
    local server_name=$1
    if [ -z "$server_name" ]; then
        error "Server name required"
        return 1
    fi
    
    if [ -z "${SERVER_CONFIGS[$server_name]}" ]; then
        error "Unknown server: $server_name"
        return 1
    fi
    
    IFS=':' read -r port directory purpose <<< "${SERVER_CONFIGS[$server_name]}"
    
    header "Stopping $server_name server"
    info "Port: $port"
    
    # Find and kill process
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        info "Found process PID: $pid"
        kill -TERM $pid 2>/dev/null
        sleep 2
        
        # Force kill if still running
        if kill -0 $pid 2>/dev/null; then
            warning "Process did not terminate gracefully, force killing..."
            kill -KILL $pid 2>/dev/null
        fi
        
        success "$server_name server stopped"
    else
        warning "$server_name server was not running"
    fi
}

# Restart server
restart_server() {
    local server_name=$1
    stop_server "$server_name"
    sleep 2
    start_server "$server_name"
}

# Test server API
test_server() {
    local server_name=$1
    if [ -z "$server_name" ]; then
        error "Server name required"
        return 1
    fi
    
    if [ -z "${SERVER_CONFIGS[$server_name]}" ]; then
        error "Unknown server: $server_name"
        return 1
    fi
    
    IFS=':' read -r port directory purpose <<< "${SERVER_CONFIGS[$server_name]}"
    
    header "Testing $server_name server API"
    info "Port: $port"
    info "Directory: $directory"
    
    # Test basic connectivity
    echo "Testing API connectivity..."
    if curl -s --max-time 5 "http://127.0.0.1:$port/doc" > /dev/null 2>&1; then
        success "API is accessible"
        
        # Get API info
        echo ""
        info "API Information:"
        api_info=$(curl -s --max-time 2 "http://127.0.0.1:$port/doc" 2>/dev/null)
        if [ $? -eq 0 ]; then
            title=$(echo $api_info | jq -r '.info.title // "Unknown"')
            version=$(echo $api_info | jq -r '.info.version // "Unknown"')
            printf "  Title: %s\n" "$title"
            printf "  Version: %s\n" "$version"
        fi
        
        # Get project info
        echo ""
        info "Project Information:"
        project_info=$(curl -s --max-time 2 "http://127.0.0.1:$port/project/current?directory=$directory" 2>/dev/null)
        if [ $? -eq 0 ]; then
            project_id=$(echo $project_info | jq -r '.id // "Unknown"')
            worktree=$(echo $project_info | jq -r '.worktree // "Unknown"')
            vcs=$(echo $project_info | jq -r '.vcs // "Unknown"')
            printf "  Project ID: %s\n" "$project_id"
            printf "  Worktree: %s\n" "$worktree"
            printf "  VCS: %s\n" "$vcs"
        fi
        
        # Get session count
        echo ""
        info "Session Information:"
        sessions=$(curl -s --max-time 2 "http://127.0.0.1:$port/session?directory=$directory" | jq '. | length // 0' 2>/dev/null)
        printf "  Active Sessions: %s\n" "$sessions"
        
        # Test MCP status
        echo ""
        info "MCP Status:"
        mcp_status=$(curl -s --max-time 2 "http://127.0.0.1:$port/mcp?directory=$directory" 2>/dev/null)
        if [ $? -eq 0 ]; then
            if [ "$mcp_status" = "{}" ] || [ "$mcp_status" = "" ]; then
                printf "  Status: No MCP servers configured\n"
            else
                printf "  Status: MCP servers available\n"
                echo "$mcp_status" | jq -r 'to_entries[] | "  \(.key): \(.value)"'
            fi
        else
            printf "  Status: MCP endpoint not accessible\n"
        fi
        
    else
        error "API is not accessible"
        info "Make sure the server is running on port $port"
        return 1
    fi
}

# Show logs
show_logs() {
    local server_name=$1
    if [ -z "$server_name" ]; then
        error "Server name required"
        return 1
    fi
    
    local log_file="$LOG_DIR/$server_name.log"
    if [ -f "$log_file" ]; then
        header "Showing logs for $server_name (Ctrl+C to exit)"
        tail -f "$log_file"
    else
        error "No log file found for $server_name"
        info "Expected location: $log_file"
    fi
}

# Show server status in detail
status_server() {
    local server_name=$1
    if [ -z "$server_name" ]; then
        list_servers
        return 0
    fi
    
    if [ -z "${SERVER_CONFIGS[$server_name]}" ]; then
        error "Unknown server: $server_name"
        return 1
    fi
    
    IFS=':' read -r port directory purpose <<< "${SERVER_CONFIGS[$server_name]}"
    
    header "Detailed Status for $server_name"
    info "Port: $port"
    info "Directory: $directory"
    info "Purpose: $purpose"
    
    # Check process
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        success "Server is running (PID: $pid)"
        
        # Get process details
        if command -v ps >/dev/null 2>&1; then
            echo ""
            info "Process Details:"
            ps -p $pid -o pid,ppid,cmd,etime,pcpu,pmem 2>/dev/null || echo "  Process details not available"
        fi
        
        # Test API
        echo ""
        test_server "$server_name"
        
    else
        error "Server is not running"
        
        # Check if log file exists
        local log_file="$LOG_DIR/$server_name.log"
        if [ -f "$log_file" ]; then
            info "Log file exists: $log_file"
            echo "Last 5 log entries:"
            tail -5 "$log_file" | sed 's/^/  /'
        fi
    fi
}

# Start all servers
start_all() {
    header "Starting all OpenCode servers"
    for server_name in "${!SERVER_CONFIGS[@]}"; do
        echo ""
        start_server "$server_name"
        sleep 1
    done
}

# Stop all servers
stop_all() {
    header "Stopping all OpenCode servers"
    for server_name in "${!SERVER_CONFIGS[@]}"; do
        echo ""
        stop_server "$server_name"
        sleep 1
    done
}

# Quick status check
quick_status() {
    header "Quick Server Status"
    
    for server_name in "${!SERVER_CONFIGS[@]}"; do
        IFS=':' read -r port directory purpose <<< "${SERVER_CONFIGS[$server_name]}"
        
        if curl -s --max-time 1 "http://127.0.0.1:$port/doc" > /dev/null 2>&1; then
            printf "${GREEN}✅${NC} %-15s (Port %5s) - %s\n" "$server_name" "$port" "$purpose"
        else
            printf "${RED}❌${NC} %-15s (Port %5s) - %s\n" "$server_name" "$port" "$purpose"
        fi
    done
}

# Main command handler
case "$1" in
    list|ls)
        list_servers
        ;;
    start)
        start_server "$2"
        ;;
    stop)
        stop_server "$2"
        ;;
    restart)
        restart_server "$2"
        ;;
    test)
        test_server "$2"
        ;;
    status)
        status_server "$2"
        ;;
    logs)
        show_logs "$2"
        ;;
    start-all)
        start_all
        ;;
    stop-all)
        stop_all
        ;;
    quick)
        quick_status
        ;;
    *)
        echo "OpenCode Multi-Server Manager"
        echo ""
        echo "Usage: $0 {list|start|stop|restart|test|status|logs|start-all|stop-all|quick} [server_name]"
        echo ""
        echo "Available servers:"
    for server_name in $(get_server_names); do
        port=$(get_server_config "$server_name" 2)
        directory=$(get_server_config "$server_name" 3)
        purpose=$(get_server_config "$server_name" 4)
            printf "  ${CYAN}%-15s${NC} - %s (Port: ${GREEN}%s${NC})\n" "$server_name" "$purpose" "$port"
        done
        echo ""
        echo "Commands:"
        echo "  list                    - List all servers with detailed status"
        echo "  start <server>          - Start specific server"
        echo "  stop <server>           - Stop specific server"
        echo "  restart <server>        - Restart specific server"
        echo "  test <server>           - Test server API connectivity"
        echo "  status [server]         - Show detailed status (all servers if no name)"
        echo "  logs <server>           - Show server logs (tail -f)"
        echo "  start-all               - Start all servers"
        echo "  stop-all                - Stop all servers"
        echo "  quick                   - Quick status check"
        echo ""
        echo "Examples:"
        echo "  $0 list                    # List all servers"
        echo "  $0 start mcp-ecosystem     # Start MCP ecosystem server"
        echo "  $0 test opencode-dev         # Test OpenCode development server"
        echo "  $0 logs mcp-ecosystem       # Show MCP ecosystem logs"
        echo "  $0 quick                    # Quick status of all servers"
        exit 1
        ;;
esac