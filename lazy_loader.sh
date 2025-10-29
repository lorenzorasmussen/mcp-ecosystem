#!/bin/bash

# Lazy Loading System for MCP Servers
# This script manages MCP server lifecycle by starting them on demand and putting them to sleep after inactivity

set -euo pipefail

# Configuration variables
CONFIG_FILE="${CONFIG_FILE:-/Users/lorenzorasmussen/.qwen/mcp_config.json}"
LAZY_LOADER_PID_FILE="${LAZY_LOADER_PID_FILE:-/tmp/mcp_lazy_loader.pid}"
SERVERS_DIR="${SERVERS_DIR:-/Users/lorenzorasmussen/.local/share/mcp/servers}"
LOG_FILE="${LOG_FILE:-/Users/lorenzorasmussen/.local/share/mcp/lazy_loader.log}"
METRICS_FILE="${METRICS_FILE:-/Users/lorenzorasmussen/.local/share/mcp/mcp-metrics.json}"

# Default timeout values (in seconds)
DEFAULT_INACTIVITY_TIMEOUT="${DEFAULT_INACTIVITY_TIMEOUT:-300}" # 5 minutes
DEFAULT_GRACE_PERIOD="${DEFAULT_GRACE_PERIOD:-30}" # 30 seconds

# Server state tracking
declare -A SERVER_PIDS
declare -A SERVER_START_TIMES
declare -A SERVER_LAST_ACCESS

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Load configuration from JSON file
load_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        # Extract timeout values from config
        INACTIVITY_TIMEOUT=$(jq -r '.lazy_loading.inactivity_timeout // empty' "$CONFIG_FILE" 2>/dev/null || echo "$DEFAULT_INACTIVITY_TIMEOUT")
        GRACE_PERIOD=$(jq -r '.lazy_loading.grace_period // empty' "$CONFIG_FILE" 2>/dev/null || echo "$DEFAULT_GRACE_PERIOD")
        
        # Extract server configurations
        MCP_SERVERS_JSON=$(jq -r '.servers // []' "$CONFIG_FILE" 2>/dev/null || echo "[]")
    else
        log "Config file not found: $CONFIG_FILE, using defaults"
        INACTIVITY_TIMEOUT=$DEFAULT_INACTIVITY_TIMEOUT
        GRACE_PERIOD=$DEFAULT_GRACE_PERIOD
        MCP_SERVERS_JSON="[]"
    fi
}

# Initialize metrics file
init_metrics() {
    if [[ ! -f "$METRICS_FILE" ]]; then
        echo '{"servers": {}, "lazy_loader": {"start_time": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "status": "running"}}' > "$METRICS_FILE"
    fi
}

# Update server metrics
update_server_metrics() {
    local server_name=$1
    local status=$2
    local start_time=${3:-"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
    
    if [[ -f "$METRICS_FILE" ]]; then
        jq --arg server_name "$server_name" \
           --arg status "$status" \
           --arg start_time "$start_time" \
           --arg access_time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
           '.servers[$server_name] //= {} | 
           .servers[$server_name].status = $status |
           .servers[$server_name].last_start = $start_time |
           .servers[$server_name].last_access = $access_time |
           .lazy_loader.last_activity = $access_time' "$METRICS_FILE" > "$METRICS_FILE.tmp" 2>/dev/null && mv "$METRICS_FILE.tmp" "$METRICS_FILE" || {
               echo '{"servers": {}, "lazy_loader": {"start_time": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "status": "running", "last_activity": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "active_count": 0}}' > "$METRICS_FILE"
           }
    fi
}

# Increment server access count
increment_access_count() {
    local server_name=$1
    
    if [[ -f "$METRICS_FILE" ]]; then
        jq --arg server_name "$server_name" \
           '.servers[$server_name] //= {} |
           .servers[$server_name].access_count = (.servers[$server_name].access_count // 0) + 1 |
           .servers[$server_name].last_access = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" |
           .lazy_loader.last_activity = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' "$METRICS_FILE" > "$METRICS_FILE.tmp" 2>/dev/null && mv "$METRICS_FILE.tmp" "$METRICS_FILE"
    fi
}

# Update active server count
update_active_count() {
    local active_count=${#SERVER_PIDS[@]}
    
    if [[ -f "$METRICS_FILE" ]]; then
        jq --argjson count $active_count \
           '.lazy_loader.active_count = $count' "$METRICS_FILE" > "$METRICS_FILE.tmp" 2>/dev/null && mv "$METRICS_FILE.tmp" "$METRICS_FILE"
    fi
}

# Start an MCP server
start_server() {
    local server_name=$1
    local server_path=$2
    local server_args=$3
    
    if [[ -n "${SERVER_PIDS[$server_name]:-}" ]]; then
        log "Server $server_name is already running with PID ${SERVER_PIDS[$server_name]}"
        return 0
    fi
    
    log "Starting server: $server_name"
    
    # Start the server in the background
    "$server_path" $server_args &
    local server_pid=$!
    
    # Store server info
    SERVER_PIDS[$server_name]=$server_pid
    SERVER_START_TIMES[$server_name]=$(date +%s)
    SERVER_LAST_ACCESS[$server_name]=$(date +%s)
    
    # Wait a moment to ensure the server started successfully
    sleep 1
    
    if kill -0 "$server_pid" 2>/dev/null; then
        log "Server $server_name started successfully with PID $server_pid"
        update_server_metrics "$server_name" "running"
        return 0
    else
        log "Failed to start server $server_name"
        unset SERVER_PIDS[$server_name]
        return 1
    fi
}

# Stop an MCP server with graceful shutdown
stop_server() {
    local server_name=$1
    
    if [[ -z "${SERVER_PIDS[$server_name]:-}" ]]; then
        log "Server $server_name is not running"
        return 0
    fi
    
    local server_pid=${SERVER_PIDS[$server_name]}
    log "Stopping server: $server_name (PID: $server_pid)"
    
    # Update metrics before stopping
    update_server_metrics "$server_name" "stopping"
    
    # Attempt graceful shutdown with SIGTERM
    kill -TERM "$server_pid" 2>/dev/null || true
    
    # Wait for graceful shutdown with periodic checks
    local count=0
    while kill -0 "$server_pid" 2>/dev/null && [[ $count -lt $GRACE_PERIOD ]]; do
        sleep 1
        ((count++))
        
        # Log progress if taking longer
        if [[ $count -eq 10 || $((count % 15)) -eq 0 ]]; then
            log "Waiting for server $server_name to stop... ($count seconds elapsed)"
        fi
    done
    
    # Check if process is still running after grace period
    if kill -0 "$server_pid" 2>/dev/null; then
        log "Server $server_name did not respond to SIGTERM within $GRACE_PERIOD seconds, attempting SIGKILL"
        
        # Try SIGINT before SIGKILL as an intermediate step
        kill -INT "$server_pid" 2>/dev/null || true
        sleep 2
        
        # Check again
        if kill -0 "$server_pid" 2>/dev/null; then
            log "Force killing server $server_name with SIGKILL"
            kill -KILL "$server_pid" 2>/dev/null || true
            
            # Wait briefly to ensure process is terminated
            sleep 1
            
            # Final check
            if kill -0 "$server_pid" 2>/dev/null; then
                log "ERROR: Could not kill server $server_name (PID: $server_pid)"
                return 1
            fi
        fi
    fi
    
    log "Server $server_name stopped successfully"
    
    # Clean up server info
    unset SERVER_PIDS[$server_name]
    unset SERVER_START_TIMES[$server_name]
    unset SERVER_LAST_ACCESS[$server_name]
    
    # Update final metrics
    update_server_metrics "$server_name" "stopped"
    
    # Update active server count
    update_active_count
    
    return 0
}

# Force stop a server immediately (emergency shutdown)
force_stop_server() {
    local server_name=$1
    
    if [[ -z "${SERVER_PIDS[$server_name]:-}" ]]; then
        log "Server $server_name is not running"
        return 0
    fi
    
    local server_pid=${SERVER_PIDS[$server_name]}
    log "Force stopping server: $server_name (PID: $server_pid)"
    
    # Send SIGKILL immediately
    kill -KILL "$server_pid" 2>/dev/null || true
    
    # Wait briefly to ensure process is terminated
    sleep 1
    
    # Verify process is terminated
    if kill -0 "$server_pid" 2>/dev/null; then
        log "ERROR: Could not force stop server $server_name (PID: $server_pid)"
        return 1
    fi
    
    log "Server $server_name force stopped"
    
    # Clean up server info
    unset SERVER_PIDS[$server_name]
    unset SERVER_START_TIMES[$server_name]
    unset SERVER_LAST_ACCESS[$server_name]
    
    # Update metrics
    update_server_metrics "$server_name" "stopped"
    
    # Update active server count
    update_active_count
    
    return 0
}

# Check if a server is running
is_server_running() {
    local server_name=$1
    
    if [[ -z "${SERVER_PIDS[$server_name]:-}" ]]; then
        return 1
    fi
    
    local server_pid=${SERVER_PIDS[$server_name]}
    kill -0 "$server_pid" 2>/dev/null
}

# Update server access time
update_server_access() {
    local server_name=$1
    SERVER_LAST_ACCESS[$server_name]=$(date +%s)
    increment_access_count "$server_name"
}

# Check for inactive servers and stop them
check_inactive_servers() {
    local current_time=$(date +%s)
    
    for server_name in "${!SERVER_PIDS[@]}"; do
        if [[ -n "${SERVER_LAST_ACCESS[$server_name]:-}" ]]; then
            local last_access=${SERVER_LAST_ACCESS[$server_name]}
            local time_since_access=$((current_time - last_access))
            
            if [[ $time_since_access -gt $INACTIVITY_TIMEOUT ]]; then
                log "Server $server_name has been inactive for $time_since_access seconds, stopping it"
                stop_server "$server_name"
            fi
        fi
    done
}

# Get server status
get_server_status() {
    local server_name=$1
    
    if is_server_running "$server_name"; then
        local start_time=${SERVER_START_TIMES[$server_name]}
        local uptime=$(( $(date +%s) - start_time ))
        local last_access=${SERVER_LAST_ACCESS[$server_name]}
        local idle_time=$(( $(date +%s) - last_access ))
        
        echo "{\"status\": \"running\", \"pid\": \"${SERVER_PIDS[$server_name]}\", \"uptime\": $uptime, \"idle_time\": $idle_time}"
    else
        echo "{\"status\": \"stopped\"}"
    fi
}

# Get all server statuses
get_all_server_statuses() {
    local statuses="{"
    local first=1
    
    for server_name in "${!SERVER_PIDS[@]}"; do
        if [[ $first -eq 1 ]]; then
            statuses="$statuses\"$server_name\": $(get_server_status \"$server_name\")"
            first=0
        else
            statuses="$statuses, \"$server_name\": $(get_server_status \"$server_name\")"
        fi
    done
    
    statuses="$statuses}"
    echo "$statuses"
}

# Initialize the lazy loader
init_lazy_loader() {
    log "Initializing MCP Lazy Loader"
    load_config
    init_metrics
    
    # Create servers directory if it doesn't exist
    mkdir -p "$SERVERS_DIR"
    
    # Parse server configurations from JSON
    local server_count=$(echo "$MCP_SERVERS_JSON" | jq 'length')
    for i in $(seq 0 $((server_count - 1))); do
        local server_name=$(echo "$MCP_SERVERS_JSON" | jq -r ".[$i].name")
        local server_path=$(echo "$MCP_SERVERS_JSON" | jq -r ".[$i].path")
        local server_args=$(echo "$MCP_SERVERS_JSON" | jq -r ".[$i].args // \"\"")
        
        if [[ "$server_name" != "null" && "$server_path" != "null" ]]; then
            log "Configured server: $server_name -> $server_path"
        fi
    done
}

# Cleanup function
cleanup() {
    log "Shutting down lazy loader"
    
    # Stop all running servers with proper cleanup
    local servers_to_stop=()
    for server_name in "${!SERVER_PIDS[@]}"; do
        servers_to_stop+=("$server_name")
    done
    
    # Stop servers one by one
    for server_name in "${servers_to_stop[@]}"; do
        log "Stopping server $server_name during shutdown..."
        stop_server "$server_name"
    done
    
    # Remove PID file
    rm -f "$LAZY_LOADER_PID_FILE"
    
    # Update metrics with shutdown info
    if [[ -f "$METRICS_FILE" ]]; then
        jq --arg stop_time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
           '.lazy_loader.status = "stopped" | .lazy_loader.stop_time = $stop_time' "$METRICS_FILE" > "$METRICS_FILE.tmp" && mv "$METRICS_FILE.tmp" "$METRICS_FILE"
    fi
    
    log "Lazy loader shutdown complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Main loop
main_loop() {
    log "MCP Lazy Loader started with PID $$"
    echo $$ > "$LAZY_LOADER_PID_FILE"
    
    while true; do
        # Update active server count
        update_active_count
        
        # Check for inactive servers
        check_inactive_servers
        
        # Sleep for 30 seconds before next check
        sleep 30
    done
}

# Start a specific server on demand
start_server_on_demand() {
    local server_name=$1
    
    # Find server configuration
    local server_path=$(echo "$MCP_SERVERS_JSON" | jq -r ".[] | select(.name == \"$server_name\") | .path")
    local server_args=$(echo "$MCP_SERVERS_JSON" | jq -r ".[] | select(.name == \"$server_name\") | .args // \"\"")
    
    if [[ "$server_path" == "null" ]]; then
        log "Server $server_name not found in configuration"
        return 1
    fi
    
    start_server "$server_name" "$server_path" "$server_args"
    update_server_access "$server_name"
}

# Fast API: Start server immediately
fast_start_server() {
    local server_name=$1
    log "Fast API: Starting server $server_name immediately"
    start_server_on_demand "$server_name"
}

# Resting API: Get server status
resting_get_status() {
    local server_name=$1
    log "Resting API: Getting status for server $server_name"
    get_server_status "$server_name"
}

# Resting API: Stop server
resting_stop_server() {
    local server_name=$1
    log "Resting API: Stopping server $server_name"
    stop_server "$server_name"
}

# Command-line interface
case "${1:-}" in
    start)
        init_lazy_loader
        main_loop
        ;;
    start-server)
        if [[ -n "${2:-}" ]]; then
            init_lazy_loader
            start_server_on_demand "$2"
        else
            echo "Usage: $0 start-server <server_name>"
            exit 1
        fi
        ;;
    fast-start)
        if [[ -n "${2:-}" ]]; then
            load_config
            fast_start_server "$2"
        else
            echo "Usage: $0 fast-start <server_name>"
            exit 1
        fi
        ;;
    status)
        if [[ -n "${2:-}" ]]; then
            load_config
            get_server_status "$2"
        else
            echo "Usage: $0 status <server_name>"
            exit 1
        fi
        ;;
    stop)
        if [[ -n "${2:-}" ]]; then
            load_config
            stop_server "$2"
        else
            echo "Usage: $0 stop <server_name>"
            exit 1
        fi
        ;;
    list)
        load_config
        get_all_server_statuses
        ;;
    *)
        echo "Usage: $0 {start|start-server|fast-start|status|stop|list}"
        echo "  start          - Start the lazy loader daemon"
        echo "  start-server   - Start a specific server on demand"
        echo "  fast-start     - Fast API to start a server immediately"
        echo "  status         - Get status of a specific server"
        echo "  stop           - Stop a specific server"
        echo "  list           - List all server statuses"
        exit 1
        ;;
esac