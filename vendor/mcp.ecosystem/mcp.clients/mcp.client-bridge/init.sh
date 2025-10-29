#!/bin/bash

# MCP Client Bridge Initialization Script
# This script sets up the MCP Client Bridge environment and runs initial configuration

set -e  # Exit immediately if a command exits with a non-zero status

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Initializing MCP Client Bridge...${NC}"

# Create necessary directories
echo -e "${YELLOW}Creating directory structure...${NC}"
mkdir -p config data logs

# Create a sample .env file if it doesn't exist
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Creating sample .env file...${NC}"
    cat > "$ENV_FILE" << EOF
# MCP Client Bridge Environment Configuration

# Server configuration
PORT=3000
HOST=localhost
NODE_ENV=development

# CORS configuration
CORS_ORIGIN=*
CORS_CREDENTIALS=true

# MCP client bridge configuration
MCP_DEFAULT_TIMEOUT=30000
MCP_MAX_RETRIES=3
MCP_RETRY_DELAY=1000
MCP_MAX_CONNECTIONS=10
MCP_MIN_CONNECTIONS=2
MCP_IDLE_TIMEOUT=30000

# Storage configuration
STORAGE_PATH=./data
STORAGE_TYPE=json
STORAGE_FILE_NAME=mcp-data.json

# Logging configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Cache configuration
CACHE_ENABLED=true
CACHE_TTL=300
CACHE_MAX_KEYS=1000

# Security
# API_KEY=your_api_key_here
# JWT_SECRET=your_jwt_secret_here

# Database (if using one)
# DATABASE_URL=postgresql://user:password@localhost:5432/mcp

# MCP Server configurations (as JSON array)
# MCP_SERVERS=[{"id":"example-server","name":"Example Server","url":"http://localhost:8080","timeout":30000,"enabled":true}]
EOF
    echo -e "${GREEN}.env file created with default values${NC}"
else
    echo -e "${GREEN}.env file already exists${NC}"
fi

# Create a sample configuration file for MCP servers
CONFIG_FILE="config/mcp-servers.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}Creating sample MCP server configuration...${NC}"
    mkdir -p config
    cat > "$CONFIG_FILE" << EOF
{
  "version": "1.0",
  "servers": [
    {
      "id": "example-server",
      "name": "Example Server",
      "url": "http://localhost:8080",
      "description": "Example MCP server for demonstration",
      "enabled": true,
      "timeout": 30000,
      "headers": {},
      "capabilities": {}
    }
  ],
  "globalSettings": {
    "defaultTimeout": 30000,
    "maxRetries": 3,
    "retryDelay": 1000,
    "connectionPool": {
      "maxConnections": 10,
      "minConnections": 2,
      "idleTimeout": 30000
    }
  }
}
EOF
    echo -e "${GREEN}MCP server configuration created${NC}"
else
    echo -e "${GREEN}MCP server configuration already exists${NC}"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    if command -v npm &> /dev/null; then
        npm install
        echo -e "${GREEN}Dependencies installed${NC}"
    else
        echo -e "${RED}npm is not available. Please install Node.js first.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Dependencies already installed${NC}"
fi

# Create data directory if it doesn't exist
if [ ! -d "data" ]; then
    mkdir -p data
    echo -e "${GREEN}Data directory created${NC}"
fi

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    mkdir -p logs
    echo -e "${GREEN}Logs directory created${NC}"
fi

echo -e "${GREEN}MCP Client Bridge initialization completed!${NC}"
echo -e "${YELLOW}To start the server, run: npm start${NC}"