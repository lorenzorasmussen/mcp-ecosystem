#!/bin/bash
# init.sh - Initialization script for MCP Browsertools Server

set -e

echo "Initializing MCP Browsertools Server..."

# Create necessary directories
echo "Creating directories..."
mkdir -p logs config data src tests

# Create sample .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating sample .env file..."
  cat > .env << EOF
# MCP Browsertools Server Environment Variables

# Server Configuration
PORT=3107
HOST=localhost
NODE_ENV=production

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/browsertools-server.log

# Browser Configuration
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=30000
PUPPETEER_SLOWMO=0

# Security Configuration
CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Cache Configuration
CACHE_TTL=300
CACHE_CHECKPERIOD=600
EOF
fi

# Install dependencies
echo "Installing dependencies..."
npm install

echo "Initialization complete!"
echo ""
echo "Next steps:"
echo "1. Review and update the .env file with your configuration"
echo "2. Start the server with: npm start"
echo "3. Or run in development mode with: npm run dev"