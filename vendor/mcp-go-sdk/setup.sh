#!/bin/bash

# MCP Go SDK Setup Script
# This script sets up the MCP server for development and production use.

set -e

echo "🚀 Setting up MCP Go SDK..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go 1.21 or later."
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 is not installed. Installing globally..."
    npm install -g pm2
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p bin logs

# Build the server binary
echo "🔨 Building MCP server binary..."
go build -o bin/mcp-server cmd/mcp-server/main.go

# Make the binary executable
chmod +x bin/mcp-server

# Check if ecosystem file exists
if [ ! -f ecosystem.config.js ]; then
    echo "⚠️  ecosystem.config.js not found. Creating default configuration..."
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'mcp-server',
    script: './bin/mcp-server',
    cwd: process.cwd(),
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    log_file: './logs/mcp-server.log',
    out_file: './logs/mcp-server-out.log',
    error_file: './logs/mcp-server-error.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF
fi

echo "✅ Setup complete!"

echo ""
echo "🎯 Available commands:"
echo "  Start server:     pm2 start ecosystem.config.js"
echo "  Stop server:      pm2 stop mcp-server"
echo "  Restart server:   pm2 restart mcp-server"
echo "  View logs:        pm2 logs mcp-server"
echo "  Check status:     pm2 status"
echo ""
echo "📖 For more information, see docs/user/user-guide.md"
echo "🔧 Server binary: bin/mcp-server"
echo "📋 PM2 config: ecosystem.config.js"