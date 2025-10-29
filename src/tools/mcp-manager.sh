#!/bin/bash

# MCP Lazy Loading System Manager
# Utility script to manage the entire lazy loading system

set -euo pipefail

LAZY_LOADER_SCRIPT="/Users/lorenzorasmussen/.local/share/mcp/lazy_loader.sh"
REST_API_SCRIPT="/Users/lorenzorasmussen/.local/share/mcp/mcp-rest-api.js"
FAST_API_SCRIPT="/Users/lorenzorasmussen/.local/share/mcp/mcp-fast-api.js"
RESTING_API_SCRIPT="/Users/lorenzorasmussen/.local/share/mcp/mcp-resting-api.js"
MONITOR_SCRIPT="/Users/lorenzorasmussen/.local/share/mcp/mcp-monitor.js"
CONFIG_FILE="/Users/lorenzorasmussen/.qwen/mcp_config.json"
LAZY_LOADER_PID_FILE="/tmp/mcp_lazy_loader.pid"

# Function to check if a service is running
is_service_running() {
    local pid_file=$1
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        else
            # Remove stale PID file
            rm -f "$pid_file"
            return 1
        fi
    fi
    return 1
}

# Function to start the lazy loader daemon
start_lazy_loader() {
    if is_service_running "$LAZY_LOADER_PID_FILE"; then
        echo "Lazy loader is already running"
        return 0
    fi
    
    echo "Starting MCP Lazy Loader daemon..."
    "$LAZY_LOADER_SCRIPT" start &
    sleep 3
    
    if is_service_running "$LAZY_LOADER_PID_FILE"; then
        echo "Lazy loader started successfully"
        return 0
    else
        echo "Failed to start lazy loader"
        return 1
    fi
}

# Function to stop the lazy loader daemon
stop_lazy_loader() {
    if [[ -f "$LAZY_LOADER_PID_FILE" ]]; then
        local pid=$(cat "$LAZY_LOADER_PID_FILE")
        echo "Stopping MCP Lazy Loader daemon (PID: $pid)..."
        
        kill -TERM "$pid" 2>/dev/null || true
        
        # Wait for graceful shutdown
        local count=0
        while kill -0 "$pid" 2>/dev/null && [[ $count -lt 10 ]]; do
            sleep 1
            ((count++))
        done
        
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            echo "Force killing lazy loader daemon"
            kill -KILL "$pid" 2>/dev/null || true
        fi
        
        rm -f "$LAZY_LOADER_PID_FILE"
        echo "Lazy loader stopped"
    else
        echo "Lazy loader is not running"
    fi
}

# Function to start API services
start_api_services() {
    echo "Starting API services..."
    
    # Read port configuration from config file
    local rest_port=$(jq -r '.api.rest_port // 8080' "$CONFIG_FILE" 2>/dev/null || echo "8080")
    local fast_port=$(jq -r '.api.fast_port // 8081' "$CONFIG_FILE" 2>/dev/null || echo "8081")
    local resting_port=$(jq -r '.api.resting_port // 8082' "$CONFIG_FILE" 2>/dev/null || echo "8082")
    
    # Start REST API
    echo "Starting REST API on port $rest_port..."
    MCP_API_PORT=$rest_port node "$REST_API_SCRIPT" > /tmp/mcp-rest-api.log 2>&1 &
    sleep 2
    
    # Start Fast API
    echo "Starting Fast API on port $fast_port..."
    FAST_API_PORT=$fast_port node "$FAST_API_SCRIPT" > /tmp/mcp-fast-api.log 2>&1 &
    sleep 2
    
    # Start Resting API
    echo "Starting Resting API on port $resting_port..."
    RESTING_API_PORT=$resting_port node "$RESTING_API_SCRIPT" > /tmp/mcp-resting-api.log 2>&1 &
    sleep 2
    
    # Start Monitor Dashboard
    MONITOR_PORT=8083 node "$MONITOR_SCRIPT" > /tmp/mcp-monitor.log 2>&1 &
    sleep 2
    
    echo "API services started"
}

# Function to stop API services
stop_api_services() {
    echo "Stopping API services..."
    
    # Kill all node processes related to MCP APIs
    pkill -f "mcp-rest-api.js" || true
    pkill -f "mcp-fast-api.js" || true
    pkill -f "mcp-resting-api.js" || true
    pkill -f "mcp-monitor.js" || true
    
    sleep 2
    echo "API services stopped"
}

# Function to show system status
show_status() {
    echo "=== MCP Lazy Loading System Status ==="
    
    if is_service_running "$LAZY_LOADER_PID_FILE"; then
        local pid=$(cat "$LAZY_LOADER_PID_FILE")
        echo "Lazy Loader: RUNNING (PID: $pid)"
    else
        echo "Lazy Loader: STOPPED"
    fi
    
    # Check if API services are running
    local rest_processes=$(pgrep -f "mcp-rest-api.js" | wc -l)
    local fast_processes=$(pgrep -f "mcp-fast-api.js" | wc -l)
    local resting_processes=$(pgrep -f "mcp-resting-api.js" | wc -l)
    local monitor_processes=$(pgrep -f "mcp-monitor.js" | wc -l)
    
    echo "REST API: $(if [[ $rest_processes -gt 0 ]]; then echo "RUNNING"; else echo "STOPPED"; fi)"
    echo "Fast API: $(if [[ $fast_processes -gt 0 ]]; then echo "RUNNING"; else echo "STOPPED"; fi)"
    echo "Resting API: $(if [[ $resting_processes -gt 0 ]]; then echo "RUNNING"; else echo "STOPPED"; fi)"
    echo "Monitor: $(if [[ $monitor_processes -gt 0 ]]; then echo "RUNNING"; else echo "STOPPED"; fi)"
    
    # Show server status if lazy loader is running
    if is_service_running "$LAZY_LOADER_PID_FILE"; then
        echo ""
        echo "=== Server Status ==="
        "$LAZY_LOADER_SCRIPT" list 2>/dev/null || echo "Could not retrieve server status"
    fi
}

# Function to restart the entire system
restart_system() {
    echo "Restarting MCP Lazy Loading System..."
    stop_system
    sleep 3
    start_system
}

# Function to start the entire system
start_system() {
    echo "Starting MCP Lazy Loading System..."
    
    # Start lazy loader first
    start_lazy_loader || exit 1
    
    # Then start API services
    start_api_services
    
    echo "MCP Lazy Loading System started successfully"
    show_status
}

# Function to stop the entire system
stop_system() {
    echo "Stopping MCP Lazy Loading System..."
    
    # Stop API services first
    stop_api_services
    
    # Then stop lazy loader
    stop_lazy_loader
    
    echo "MCP Lazy Loading System stopped"
}

# Function to show system logs
show_logs() {
    local service=${1:-"all"}
    
    case "$service" in
        "lazy_loader")
            echo "=== Lazy Loader Logs ==="
            tail -n 20 /Users/lorenzorasmussen/.local/share/mcp/lazy_loader.log 2>/dev/null || echo "No lazy loader logs found"
            ;;
        "rest_api")
            echo "=== REST API Logs ==="
            tail -n 20 /tmp/mcp-rest-api.log 2>/dev/null || echo "No REST API logs found"
            ;;
        "fast_api")
            echo "=== Fast API Logs ==="
            tail -n 20 /tmp/mcp-fast-api.log 2>/dev/null || echo "No Fast API logs found"
            ;;
        "resting_api")
            echo "=== Resting API Logs ==="
            tail -n 20 /tmp/mcp-resting-api.log 2>/dev/null || echo "No Resting API logs found"
            ;;
        "monitor")
            echo "=== Monitor Logs ==="
            tail -n 20 /tmp/mcp-monitor.log 2>/dev/null || echo "No Monitor logs found"
            ;;
        "all")
            show_logs "lazy_loader"
            echo ""
            show_logs "rest_api"
            echo ""
            show_logs "fast_api"
            echo ""
            show_logs "resting_api"
            echo ""
            show_logs "monitor"
            ;;
        *)
            echo "Usage: $0 logs {lazy_loader|rest_api|fast_api|resting_api|monitor|all}"
            ;;
    esac
}

# Main command handler
case "${1:-}" in
    "start")
        start_system
        ;;
    "stop")
        stop_system
        ;;
    "restart")
        restart_system
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "${2:-all}"
        ;;
    "start-lazy-loader")
        start_lazy_loader
        ;;
    "stop-lazy-loader")
        stop_lazy_loader
        ;;
    "start-apis")
        start_api_services
        ;;
    "stop-apis")
        stop_api_services
        ;;
    *)
        echo "MCP Lazy Loading System Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|start-lazy-loader|stop-lazy-loader|start-apis|stop-apis}"
        echo ""
        echo "Commands:"
        echo "  start              - Start the entire lazy loading system"
        echo "  stop               - Stop the entire lazy loading system"
        echo "  restart            - Restart the entire lazy loading system"
        echo "  status             - Show system status"
        echo "  logs [service]     - Show logs (lazy_loader, rest_api, fast_api, resting_api, monitor, all)"
        echo "  start-lazy-loader  - Start only the lazy loader daemon"
        echo "  stop-lazy-loader   - Stop only the lazy loader daemon"
        echo "  start-apis         - Start only the API services"
        echo "  stop-apis          - Stop only the API services"
        echo ""
        echo "API Endpoints:"
        echo "  REST API:         http://localhost:8080/api/"
        echo "  Fast API:         http://localhost:8081/fast/"
        echo "  Resting API:      http://localhost:8082/resting/"
        echo "  Monitor Dashboard: http://localhost:8083/"
        ;;
esac