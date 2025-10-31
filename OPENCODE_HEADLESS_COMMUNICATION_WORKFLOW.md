# 🔗 **OpenCode Headless Server Communication Workflow**

## 📋 **Server Identification & Port Mapping**

### **Current Running Servers**

```bash
# Find OpenCode serve processes
ps aux | grep "opencode serve" | grep -v grep

# Map PIDs to ports
lsof -p <PID> | grep LISTEN

# Current mapping:
# PID 43825 → Port 55467
# PID 44055 → Port 55471
```

### **Launch with Custom Port**

```bash
# Launch OpenCode with specific port and directory
opencode serve -p 55500 -h 127.0.0.1 --directory /path/to/project

# Launch with logging
opencode serve -p 55500 --print-logs --log-level INFO
```

---

## 🌐 **API Endpoint Discovery**

### **Automatic Port Detection**

```bash
# Function to find all OpenCode servers
find_opencode_servers() {
    local pids=$(ps aux | grep "opencode serve" | grep -v grep | awk '{print $2}')
    for pid in $pids; do
        local port=$(lsof -p $pid | grep LISTEN | awk '{print $9}' | cut -d: -f2)
        echo "PID $pid → Port $port"
    done
}

# Test API availability
test_opencode_api() {
    local port=$1
    local directory=$2

    # Test health/documentation
    curl -s "http://127.0.0.1:$port/doc" > /dev/null && echo "Port $port: API OK"

    # Get project info
    curl -s "http://127.0.0.1:$port/project/current?directory=$directory" | jq .
}
```

---

## 📂 **Directory & Project Management**

### **Project Operations**

```bash
# List all projects
curl -s "http://127.0.0.1:55467/project" | jq '.[] | {id: .id, worktree: .worktree}'

# Get current project for specific directory
curl -s "http://127.0.0.1:55467/project/current?directory=/Users/lorenzorasmussen/.local/share/mcp"

# Get file status for project
curl -s "http://127.0.0.1:55467/file/status?directory=/Users/lorenzorasmussen/.local/share/mcp"
```

### **File Operations**

```bash
# List files in directory
curl -s "http://127.0.0.1:55467/file?directory=/Users/lorenzorasmussen/.local/share/mcp&path=src"

# Read file content
curl -s "http://127.0.0.1:55467/file/content?directory=/Users/lorenzorasmussen/.local/share/mcp&path=README.md"

# Find files
curl -s "http://127.0.0.1:55467/find/file?directory=/Users/lorenzorasmussen/.local/share/mcp&query=*.js"
```

---

## 🔄 **Session Management**

### **Session Discovery**

```bash
# List all sessions (with directory context)
curl -s "http://127.0.0.1:55467/session?directory=/Users/lorenzorasmussen/.local/share/mcp" | jq '.[] | {id: .id, title: .title, created: .created}'

# Get session details
curl -s "http://127.0.0.1:55467/session/ses123456?directory=/Users/lorenzorasmussen/.local/share/mcp"

# Get session messages
curl -s "http://127.0.0.1:55467/session/ses123456/message?directory=/Users/lorenzorasmussen/.local/share/mcp"
```

### **Session Creation**

```bash
# Create new session
curl -X POST "http://127.0.0.1:55467/session?directory=/Users/lorenzorasmussen/.local/share/mcp" \
  -H "Content-Type: application/json" \
  -d '{"title": "MCP Integration Test"}'

# Create session with parent
curl -X POST "http://127.0.0.1:55467/session?directory=/Users/lorenzorasmussen/.local/share/mcp" \
  -H "Content-Type: application/json" \
  -d '{"title": "Child Session", "parentID": "ses123456"}'
```

---

## 🤖 **MCP Integration**

### **MCP Status Check**

```bash
# Get MCP server status
curl -s "http://127.0.0.1:55467/mcp?directory=/Users/lorenzorasmussen/.local/share/mcp"

# Get available tools
curl -s "http://127.0.0.1:55467/experimental/tool/ids?directory=/Users/lorenzorasmussen/.local/share/mcp"
```

### **Agent Operations**

```bash
# List available agents
curl -s "http://127.0.0.1:55467/agent?directory=/Users/lorenzorasmussen/.local/share/mcp"

# List providers and models
curl -s "http://127.0.0.1:55467/config/providers?directory=/Users/lorenzorasmussen/.local/share/mcp"
```

---

## 💬 **Message & Command Handling**

### **Send Messages to Sessions**

```bash
# Send text message
curl -X POST "http://127.0.0.1:55467/session/ses123456/message?directory=/Users/lorenzorasmussen/.local/share/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "parts": [{"type": "text", "text": "Test MCP integration"}],
    "model": {"providerID": "openai", "modelID": "gpt-4"}
  }'

# Send command
curl -X POST "http://127.0.0.1:55467/session/ses123456/command?directory=/Users/lorenzorasmussen/.local/share/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "test_mcp_connection",
    "arguments": "--server=qwen-client",
    "agent": "mcp-specialist"
  }'
```

---

## 🛠 **Advanced Operations**

### **Session Forking & Sharing**

```bash
# Fork session at specific message
curl -X POST "http://127.0.0.1:55467/session/ses123456/fork?directory=/Users/lorenzorasmussen/.local/share/mcp" \
  -H "Content-Type: application/json" \
  -d '{"messageID": "msg789"}'

# Share session
curl -X POST "http://127.0.0.1:55467/session/ses123456/share?directory=/Users/lorenzorasmussen/.local/share/mcp"

# Summarize session
curl -X POST "http://127.0.0.1:55467/session/ses123456/summarize?directory=/Users/lorenzorasmussen/.local/share/mcp" \
  -H "Content-Type: application/json" \
  -d '{"providerID": "openai", "modelID": "gpt-4"}'
```

### **File Operations via Sessions**

```bash
# Run shell command through session
curl -X POST "http://127.0.0.1:55467/session/ses123456/shell?directory=/Users/lorenzorasmussen/.local/share/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "shell-expert",
    "command": "ls -la src/qwen-client/"
  }'
```

---

## 📊 **Monitoring & Logging**

### **Application Logging**

```bash
# Write log entry
curl -X POST "http://127.0.0.1:55467/log?directory=/Users/lorenzorasmussen/.local/share/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "qwen-mcp-client",
    "level": "info",
    "message": "MCP connection test successful",
    "extra": {"port": 55467, "session": "ses123456"}
  }'
```

---

## 🎯 **Best Practices**

### **Server Management**

1. **Use dedicated ports** for different projects/environments
2. **Document port mappings** for easy reference
3. **Use descriptive names** when launching multiple servers

### **Session Organization**

1. **Use descriptive titles** for sessions
2. **Group related sessions** with parent-child relationships
3. **Share important sessions** for collaboration

### **API Usage**

1. **Always include directory parameter** for project context
2. **Handle errors gracefully** with proper HTTP status codes
3. **Use JSON formatting** for readable output with `jq`

---

## 🚀 **Quick Start Script**

```bash
#!/bin/bash
# OpenCode Server Manager

PROJECT_DIR="/Users/lorenzorasmussen/.local/share/mcp"
OPENCODE_PORT=55500

# Start OpenCode server with custom port
start_opencode() {
    echo "Starting OpenCode server on port $OPENCODE_PORT..."
    opencode serve -p $OPENCODE_PORT --print-logs --log-level INFO &
    sleep 2

    # Test API
    if curl -s "http://127.0.0.1:$OPENCODE_PORT/doc" > /dev/null; then
        echo "✅ OpenCode API ready on port $OPENCODE_PORT"
    else
        echo "❌ Failed to start OpenCode API"
    fi
}

# Test MCP integration
test_mcp() {
    echo "Testing MCP integration..."

    # Get project info
    echo "📁 Project Info:"
    curl -s "http://127.0.0.1:$OPENCODE_PORT/project/current?directory=$PROJECT_DIR" | jq .

    # Check MCP status
    echo "🔌 MCP Status:"
    curl -s "http://127.0.0.1:$OPENCODE_PORT/mcp?directory=$PROJECT_DIR" | jq .

    # List sessions
    echo "💬 Active Sessions:"
    curl -s "http://127.0.0.1:$OPENCODE_PORT/session?directory=$PROJECT_DIR" | jq 'length'
}

# Main execution
case "$1" in
    start)
        start_opencode
        ;;
    test)
        test_mcp
        ;;
    *)
        echo "Usage: $0 {start|test}"
        exit 1
        ;;
esac
```

---

## 📝 **Troubleshooting**

### **Common Issues**

1. **Port already in use**: Use `-p` to specify different port
2. **Directory not found**: Ensure absolute path is provided
3. **MCP not responding**: Check MCP server configuration
4. **Session not found**: Verify session ID and directory context

### **Debug Commands**

```bash
# Check all OpenCode processes
ps aux | grep opencode

# Test API connectivity
curl -v "http://127.0.0.1:55467/doc"

# Check port availability
lsof -i :55467

# View OpenCode logs (if launched with --print-logs)
journalctl -f | grep opencode
```

---

**🎯 This workflow provides comprehensive headless OpenCode server management with dynamic port detection and full API integration capabilities!**
