#!/bin/bash

# MCP Server Startup Script for OpenCode Integration
# This script ensures the MCP server starts automatically and handles failures

set -e

PROJECT_DIR="/Users/lorenzorasmussen/mcp-go-sdk"
SERVER_BINARY="$PROJECT_DIR/bin/mcp-server"
ECOSYSTEM_FILE="$PROJECT_DIR/ecosystem.config.js"
PID_FILE="$PROJECT_DIR/mcp-server.pid"

echo "🚀 Starting MCP Server with OpenCode integration..."

# Check if server binary exists
if [ ! -f "$SERVER_BINARY" ]; then
    echo "❌ Server binary not found. Building..."
    cd "$PROJECT_DIR"
    go build -o bin/mcp-server cmd/mcp-server/main.go
fi

# Ensure logs directory exists
mkdir -p "$PROJECT_DIR/logs"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 not found. Installing..."
    npm install -g pm2
fi

# Stop any existing instance
pm2 stop mcp-server 2>/dev/null || true

# Start the server with PM2
echo "🔄 Starting MCP server with auto-restart..."
cd "$PROJECT_DIR"
pm2 start "$ECOSYSTEM_FILE"

# Wait for startup
sleep 2

# Verify it's running
if pm2 status | grep -q "mcp-server.*online"; then
    echo "✅ MCP Server started successfully!"
    echo "📊 Status: $(pm2 status | grep mcp-server)"
    echo "📋 Logs: pm2 logs mcp-server"
    echo "🛑 Stop: pm2 stop mcp-server"
else
    echo "❌ Failed to start MCP server. Check logs:"
    pm2 logs mcp-server --lines 20
    exit 1
fi

# Save PM2 configuration for auto-restart on system reboot
pm2 save
if command -v pm2-startup &> /dev/null; then
    pm2 startup
fi

echo "🎯 MCP Server is now running and will auto-restart on failures!"