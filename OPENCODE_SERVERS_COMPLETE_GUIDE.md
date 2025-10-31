# 🗂️ **Complete OpenCode Server Management Guide**

## 📋 **Current Server Inventory**

Based on your setup, you have **3 OpenCode servers** running, each with different purposes:

| Port      | PID   | Directory                                   | Purpose                    | Project ID                                 |
| --------- | ----- | ------------------------------------------- | -------------------------- | ------------------------------------------ |
| **55717** | ?     | `/Users/lorenzorasmussen/.local/share/mcp`  | **Main MCP Ecosystem**     | `0895173e5e7a6fb55508eb5c75bc0f1c2c206dce` |
| **55467** | 43825 | `/Users/lorenzorasmussen/Projects/opencode` | **OpenCode Development**   | `4b0ea68d7af9a6031a7ffda7ad66e0cb83315750` |
| **55471** | 44055 | `/Users/lorenzorasmussen/.config/opencode`  | **OpenCode Configuration** | `4b0ea68d7af9a6031a7ffda7ad66e0cb83315750` |

---

## 🎯 **Server Purposes & Use Cases**

### **🚀 Port 55717 - Main MCP Ecosystem Server**

- **Directory**: `/Users/lorenzorasmussen/.local/share/mcp`
- **Purpose**: Primary development environment for MCP ecosystem
- **Use Cases**:
  - Qwen MCP client development
  - MCP server testing
  - Production monitoring
  - Multi-project API demonstrations

### **🛠️ Port 55467 - OpenCode Development Server**

- **Directory**: `/Users/lorenzorasmussen/Projects/opencode`
- **Purpose**: OpenCode source code development
- **Use Cases**:
  - OpenCode feature development
  - API testing and validation
  - Documentation updates
  - Bug fixes and improvements

### **⚙️ Port 55471 - OpenCode Configuration Server**

- **Directory**: `/Users/lorenzorasmussen/.config/opencode`
- **Purpose**: OpenCode configuration and settings management
- **Use Cases**:
  - Configuration testing
  - Settings validation
  - Plugin development
  - Personal customizations

---

## 🔍 **Server Identification Commands**

### **Quick Server Discovery**

```bash
# Find all OpenCode servers with their PIDs and ports
ps aux | grep "opencode serve" | grep -v grep | while read line; do
    pid=$(echo $line | awk '{print $2}')
    port=$(lsof -p $pid 2>/dev/null | grep LISTEN | awk -F: '{print $2}' | awk '{print $1}')
    echo "PID $pid → Port $port"
done

# Get detailed server information
for port in 55717 55467 55471; do
    echo "=== Port $port ==="
    curl -s "http://127.0.0.1:$port/project/current?directory=/Users/lorenzorasmussen/.local/share/mcp" | jq .
    echo ""
done
```

### **Server Health Check**

```bash
#!/bin/bash
# check-opencode-servers.sh

declare -A SERVERS=(
    ["55717"]="/Users/lorenzorasmussen/.local/share/mcp:Main MCP Ecosystem"
    ["55467"]="/Users/lorenzorasmussen/Projects/opencode:OpenCode Development"
    ["55471"]="/Users/lorenzorasmussen/.config/opencode:OpenCode Configuration"
)

echo "🔍 OpenCode Server Status"
echo "========================="

for port in "${!SERVERS[@]}"; do
    IFS=':' read -r directory purpose <<< "${SERVERS[$port]}"

    # Test API connectivity
    if curl -s "http://127.0.0.1:$port/doc" > /dev/null 2>&1; then
        status="✅ Online"
        # Get project info
        project_info=$(curl -s "http://127.0.0.1:$port/project/current?directory=$directory" 2>/dev/null)
        if [ $? -eq 0 ]; then
            project_id=$(echo $project_info | jq -r '.id // "Unknown"')
            sessions=$(curl -s "http://127.0.0.1:$port/session?directory=$directory" 2>/dev/null | jq '. | length // 0')
        else
            project_id="Error"
            sessions="N/A"
        fi
    else
        status="❌ Offline"
        project_id="N/A"
        sessions="N/A"
    fi

    printf "Port %5s | %-7s | %-20s | %s\n" "$port" "$status" "$purpose" "$directory"
    printf "         | Project ID: %s | Sessions: %s\n" "$project_id" "$sessions"
    echo ""
done
```

---

## 🛠️ **Server Management Scripts**

### **Enhanced Server Manager**

```bash
#!/bin/bash
# opencode-multi-server-manager.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$HOME/.opencode/logs"

# Server configurations
declare -A SERVER_CONFIGS=(
    ["mcp-ecosystem"]="55717:/Users/lorenzorasmussen/.local/share/mcp:Main MCP Ecosystem"
    ["opencode-dev"]="55467:/Users/lorenzorasmussen/Projects/opencode:OpenCode Development"
    ["opencode-config"]="55471:/Users/lorenzorasmussen/.config/opencode:OpenCode Configuration"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# List all servers
list_servers() {
    log "OpenCode Server Inventory"
    echo "========================="

    for server_name in "${!SERVER_CONFIGS[@]}"; do
        IFS=':' read -r port directory purpose <<< "${SERVER_CONFIGS[$server_name]}"

        # Check if server is running
        if curl -s "http://127.0.0.1:$port/doc" > /dev/null 2>&1; then
            status="Online"
            status_color="$GREEN"

            # Get additional info
            project_id=$(curl -s "http://127.0.0.1:$port/project/current?directory=$directory" | jq -r '.id // "Unknown"' 2>/dev/null)
            sessions=$(curl -s "http://127.0.0.1:$port/session?directory=$directory" | jq '. | length // 0' 2>/dev/null)
        else
            status="Offline"
            status_color="$RED"
            project_id="N/A"
            sessions="N/A"
        fi

        printf "${status_color}%-15s${NC} | Port %-5s | %-7s | %s\n" "$server_name" "$port" "$status" "$purpose"
        printf "                | Directory: %s\n" "$directory"
        printf "                | Project ID: %s | Sessions: %s\n" "$project_id" "$sessions"
        echo ""
    done
}

# Start specific server
start_server() {
    local server_name=$1
    if [ -z "$server_name" ]; then
        error "Server name required"
        echo "Available servers: ${!SERVER_CONFIGS[@]}"
        return 1
    fi

    if [ -z "${SERVER_CONFIGS[$server_name]}" ]; then
        error "Unknown server: $server_name"
        echo "Available servers: ${!SERVER_CONFIGS[@]}"
        return 1
    fi

    IFS=':' read -r port directory purpose <<< "${SERVER_CONFIGS[$server_name]}"

    log "Starting $server_name server..."
    log "Port: $port"
    log "Directory: $directory"
    log "Purpose: $purpose"

    # Check if port is already in use
    if lsof -i :$port > /dev/null 2>&1; then
        warning "Port $port is already in use"
        read -p "Do you want to kill the existing process? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            lsof -ti:$port | xargs kill -9
            sleep 2
        else
            return 1
        fi
    fi

    # Create log directory
    mkdir -p "$LOG_DIR"

    # Start server
    cd "$directory"
    nohup opencode serve -p $port --print-logs --log-level INFO > "$LOG_DIR/$server_name.log" 2>&1 &
    local pid=$!

    sleep 3

    # Verify server started
    if curl -s "http://127.0.0.1:$port/doc" > /dev/null 2>&1; then
        success "$server_name server started successfully (PID: $pid)"
        echo "Logs: $LOG_DIR/$server_name.log"
        echo "API: http://127.0.0.1:$port/doc"
    else
        error "Failed to start $server_name server"
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

    log "Stopping $server_name server (Port: $port)..."

    # Find and kill process
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        kill -TERM $pid
        sleep 2

        # Force kill if still running
        if kill -0 $pid 2>/dev/null; then
            kill -KILL $pid
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

    log "Testing $server_name server API..."

    # Test basic connectivity
    if curl -s "http://127.0.0.1:$port/doc" > /dev/null 2>&1; then
        success "API is accessible"

        # Get project info
        echo "Project Info:"
        curl -s "http://127.0.0.1:$port/project/current?directory=$directory" | jq .

        # Get session count
        local sessions=$(curl -s "http://127.0.0.1:$port/session?directory=$directory" | jq '. | length // 0')
        echo "Active Sessions: $sessions"

        # Test MCP status
        echo "MCP Status:"
        curl -s "http://127.0.0.1:$port/mcp?directory=$directory" | jq .
    else
        error "API is not accessible"
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
        log "Showing logs for $server_name (Ctrl+C to exit):"
        tail -f "$log_file"
    else
        error "No log file found for $server_name"
    fi
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
    logs)
        show_logs "$2"
        ;;
    *)
        echo "OpenCode Multi-Server Manager"
        echo ""
        echo "Usage: $0 {list|start|stop|restart|test|logs} [server_name]"
        echo ""
        echo "Available servers:"
        for server_name in "${!SERVER_CONFIGS[@]}"; do
            IFS=':' read -r port directory purpose <<< "${SERVER_CONFIGS[$server_name]}"
            echo "  $server_name - $purpose (Port: $port)"
        done
        echo ""
        echo "Examples:"
        echo "  $0 list                    # List all servers"
        echo "  $0 start mcp-ecosystem     # Start MCP ecosystem server"
        echo "  $0 test opencode-dev       # Test OpenCode development server"
        echo "  $0 logs mcp-ecosystem     # Show MCP ecosystem logs"
        exit 1
        ;;
esac
```

---

## 🎯 **Recommended Usage Patterns**

### **For MCP Development**

```bash
# Use the main MCP ecosystem server (Port 55717)
export OPENCODE_API="http://127.0.0.1:55717"
export OPENCODE_DIR="/Users/lorenzorasmussen/.local/share/mcp"

# Test MCP integration
curl -s "$OPENCODE_API/mcp?directory=$OPENCODE_DIR" | jq .
```

### **For OpenCode Development**

```bash
# Use the OpenCode development server (Port 55467)
export OPENCODE_API="http://127.0.0.1:55467"
export OPENCODE_DIR="/Users/lorenzorasmussen/Projects/opencode"

# Test new features
curl -s "$OPENCODE_API/project/current?directory=$OPENCODE_DIR" | jq .
```

### **For Configuration Testing**

```bash
# Use the configuration server (Port 55471)
export OPENCODE_API="http://127.0.0.1:55471"
export OPENCODE_DIR="/Users/lorenzorasmussen/.config/opencode"

# Test configuration changes
curl -s "$OPENCODE_API/config?directory=$OPENCODE_DIR" | jq .
```

---

## 🔄 **Multi-Project API Integration**

Now you can apply the multi-project extension to any of these servers:

### **Setup Multi-Project on Main MCP Server**

```bash
# Navigate to MCP ecosystem directory
cd /Users/lorenzorasmussen/.local/share/mcp

# Start the multi-project extension
node -e "
const MultiProjectExtension = require('./src/opencode-multi-project-extension');
const express = require('express');

const app = express();
app.use(express.json());

const multiProject = new MultiProjectExtension();
app.use('/api', multiProject.createRouter());

// Start on different port to avoid conflicts
app.listen(55800, () => {
    console.log('Multi-Project API running on http://127.0.0.1:55800');
});
" &

# Test the multi-project API
curl -X POST "http://127.0.0.1:55800/api/project/init" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "worktree": "/Users/lorenzorasmussen/.local/share/mcp",
    "metadata": {"tags": ["test"]}
  }'
```

---

## 📊 **Server Comparison Matrix**

| Feature                 | Port 55717 (MCP) | Port 55467 (OpenCode Dev) | Port 55471 (Config) |
| ----------------------- | ---------------- | ------------------------- | ------------------- |
| **Primary Use**         | MCP Development  | OpenCode Development      | Configuration       |
| **Session Count**       | 43+              | Variable                  | Variable            |
| **Multi-Project Ready** | ✅ Yes           | ✅ Yes                    | ✅ Yes              |
| **Production Ready**    | ✅ Yes           | ❌ Development            | ❌ Testing          |
| **API Stability**       | ✅ Stable        | 🔄 Changing               | 🔄 Changing         |
| **Recommended For**     | Daily work       | OpenCode contributions    | Config experiments  |

---

## 🚀 **Quick Start Commands**

```bash
# Make the server manager executable
chmod +x scripts/opencode-multi-server-manager.sh

# List all servers
./scripts/opencode-multi-server-manager.sh list

# Start MCP ecosystem server if not running
./scripts/opencode-multi-server-manager.sh start mcp-ecosystem

# Test server connectivity
./scripts/opencode-multi-server-manager.sh test mcp-ecosystem

# Show server logs
./scripts/opencode-multi-server-manager.sh logs mcp-ecosystem
```

---

## 🎯 **Best Practices**

### **1. Use Dedicated Servers for Different Purposes**

- **MCP Development**: Port 55717
- **OpenCode Development**: Port 55467
- **Configuration Testing**: Port 55471

### **2. Environment Variables for Context Switching**

```bash
# MCP Development Context
alias mcp-context='export OPENCODE_API="http://127.0.0.1:55717" && export OPENCODE_DIR="/Users/lorenzorasmussen/.local/share/mcp"'

# OpenCode Development Context
alias opencode-context='export OPENCODE_API="http://127.0.0.1:55467" && export OPENCODE_DIR="/Users/lorenzorasmussen/Projects/opencode"'

# Configuration Context
alias config-context='export OPENCODE_API="http://127.0.0.1:55471" && export OPENCODE_DIR="/Users/lorenzorasmussen/.config/opencode"'
```

### **3. Use the Multi-Project API for Organization**

```bash
# Create projects for different workstreams
curl -X POST "$OPENCODE_API/project/init" -d '{
  "name": "Qwen Client Development",
  "worktree": "/Users/lorenzorasmussen/projects/qwen-client"
}'

curl -X POST "$OPENCODE_API/project/init" -d '{
  "name": "Documentation Updates",
  "worktree": "/Users/lorenzorasmussen/projects/docs"
}'
```

---

**🎉 You now have a complete understanding and management system for all your OpenCode servers! Each server has its purpose, and you can easily switch between them based on your development needs.**
