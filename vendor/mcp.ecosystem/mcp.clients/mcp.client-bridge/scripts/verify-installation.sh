#!/bin/bash
# verify-installation.sh - Script to verify MCP Client Bridge installation

echo "🔍 Verifying MCP Client Bridge installation..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Not in the MCP Client Bridge directory"
    echo "Please navigate to the MCP Client Bridge directory and run this script again"
    exit 1
fi

echo "✅ In correct directory"

# Check if all required files exist
REQUIRED_FILES=(
    "index.js"
    "package.json"
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

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✅ Node modules are installed"
else
    echo "⚠️  Node modules are not installed"
    echo "   Run 'npm install' to install dependencies"
fi

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ Environment configuration file exists"
else
    echo "⚠️  Environment configuration file (.env) does not exist"
    echo "   Run './init.sh' to create it"
fi

# Check if the main service file is valid JavaScript
if node -c "src/services/MCPClientBridge.js" 2>/dev/null; then
    echo "✅ MCPClientBridge.js is valid JavaScript"
else
    echo "❌ MCPClientBridge.js contains syntax errors"
    node -c "src/services/MCPClientBridge.js" 2>&1 | head -5
fi

# Check if the server discovery service is valid JavaScript
if node -c "src/services/ServerDiscoveryService.js" 2>/dev/null; then
    echo "✅ ServerDiscoveryService.js is valid JavaScript"
else
    echo "❌ ServerDiscoveryService.js contains syntax errors"
    node -c "src/services/ServerDiscoveryService.js" 2>&1 | head -5
fi

# Check if the persistent storage model is valid JavaScript
if node -c "src/models/PersistentStorage.js" 2>/dev/null; then
    echo "✅ PersistentStorage.js is valid JavaScript"
else
    echo "❌ PersistentStorage.js contains syntax errors"
    node -c "src/models/PersistentStorage.js" 2>&1 | head -5
fi

# Check if the server index is valid JSON
if node -e "JSON.parse(require('fs').readFileSync('MCP_SERVER_INDEX.json'))" 2>/dev/null; then
    echo "✅ MCP_SERVER_INDEX.json is valid JSON"
else
    echo "❌ MCP_SERVER_INDEX.json contains invalid JSON"
    node -e "JSON.parse(require('fs').readFileSync('MCP_SERVER_INDEX.json'))" 2>&1 | head -5
fi

# Check if package.json is valid JSON
if node -e "JSON.parse(require('fs').readFileSync('package.json'))" 2>/dev/null; then
    echo "✅ package.json is valid JSON"
else
    echo "❌ package.json contains invalid JSON"
    node -e "JSON.parse(require('fs').readFileSync('package.json'))" 2>&1 | head -5
fi

echo ""
echo "📋 Installation verification complete!"

if [ ${#MISSING_FILES[@]} -eq 0 ] && [ -d "node_modules" ]; then
    echo "🎉 MCP Client Bridge is properly installed and ready to use!"
    echo ""
    echo "To start the service:"
    echo "  npm start"
    echo ""
    echo "To run in development mode:"
    echo "  npm run dev"
    echo ""
    echo "To run tests:"
    echo "  npm test"
else
    echo "⚠️  MCP Client Bridge installation requires attention"
    if [ ${#MISSING_FILES[@]} -ne 0 ]; then
        echo "   Missing files need to be created"
    fi
    if [ ! -d "node_modules" ]; then
        echo "   Dependencies need to be installed with 'npm install'"
    fi
fi