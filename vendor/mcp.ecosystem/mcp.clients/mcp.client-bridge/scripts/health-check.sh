#!/bin/bash
# health-check.sh - Simple health check script for MCP Client Bridge

# Check if the service is running
echo "Checking MCP Client Bridge health..."

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

echo "✅ Node.js is installed"

# Check if the service is running on the default port
if nc -z localhost 3000; then
    echo "✅ MCP Client Bridge is running on port 3000"
    
    # Check the health endpoint
    if curl -s http://localhost:3000/health | grep -q '"status":"OK"'; then
        echo "✅ Health check endpoint is responding correctly"
    else
        echo "❌ Health check endpoint is not responding correctly"
        exit 1
    fi
else
    echo "⚠️  MCP Client Bridge is not running on port 3000"
    echo "   To start the service, run: npm start"
fi

# Check if required files exist
REQUIRED_FILES=(
    "package.json"
    "index.js"
    "src/services/MCPClientBridge.js"
    "src/services/ServerDiscoveryService.js"
    "src/models/PersistentStorage.js"
    "MCP_SERVER_INDEX.json"
)

MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo "✅ All required files are present"
else
    echo "❌ Missing files:"
    for file in "${MISSING_FILES[@]}"; do
        echo "   - $file"
    done
    exit 1
fi

# Check node modules
if [ -d "node_modules" ]; then
    echo "✅ Node modules are installed"
else
    echo "⚠️  Node modules are not installed"
    echo "   To install, run: npm install"
fi

echo "Health check completed"