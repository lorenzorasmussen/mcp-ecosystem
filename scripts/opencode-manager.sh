#!/bin/bash
# OpenCode Server Management Script

PROJECT_DIR="/Users/lorenzorasmussen/.local/share/mcp"
OPENCODE_PORT=55500

start_server() {
    echo "🚀 Starting OpenCode server on port $OPENCODE_PORT..."
    cd "$PROJECT_DIR"
    opencode serve -p $OPENCODE_PORT --print-logs --log-level INFO &
    sleep 3
    
    if curl -s "http://127.0.0.1:$OPENCODE_PORT/doc" > /dev/null; then
        echo "✅ OpenCode API ready on port $OPENCODE_PORT"
    else
        echo "❌ Failed to start OpenCode API"
    fi
}

test_mcp() {
    echo "🔌 Testing MCP integration..."
    
    echo "📁 Project Info:"
    curl -s "http://127.0.0.1:$OPENCODE_PORT/project/current?directory=$PROJECT_DIR" | jq .
    
    echo "🔌 MCP Status:"
    curl -s "http://127.0.0.1:$OPENCODE_PORT/mcp?directory=$PROJECT_DIR" | jq .
    
    echo "💬 Active Sessions:"
    curl -s "http://127.0.0.1:$OPENCODE_PORT/session?directory=$PROJECT_DIR" | jq 'length'
}

list_servers() {
    echo "🔍 Finding OpenCode servers..."
    node scripts/opencode-server-manager.js list
}

case "$1" in
    start)
        start_server
        ;;
    test)
        test_mcp
        ;;
    list)
        list_servers
        ;;
    *)
        echo "Usage: $0 {start|test|list}"
        exit 1
        ;;
esac
