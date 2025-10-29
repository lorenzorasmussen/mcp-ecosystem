#!/bin/bash
# check-versions.sh - Script to check versions of all MCP ecosystem components

echo "🔍 Checking MCP Ecosystem Component Versions"
echo "=========================================="

# Function to check package.json version
check_package_version() {
  local package_path=$1
  local component_name=$2
  
  if [ -f "$package_path" ]; then
    local version=$(jq -r '.version' "$package_path" 2>/dev/null)
    if [ "$version" != "null" ]; then
      echo "✅ $component_name: v$version"
    else
      echo "⚠️  $component_name: Version not found in package.json"
    fi
  else
    echo "❌ $component_name: package.json not found at $package_path"
  fi
}

# Check MCP Client Bridge version
check_package_version "/Users/lorenzorasmussen/.local/share/mcp/vendor/mcp.ecosystem/mcp.clients/mcp.client-bridge/package.json" "MCP Client Bridge"

# Check MCP Server versions (if they have package.json files)
# This would need to be updated as more servers are added
echo ""
echo "📦 MCP Server Versions:"
echo "   (To be implemented as servers are added)"

echo ""
echo "📋 Version check complete!"
echo "For detailed version history, see: /Users/lorenzorasmussen/.local/share/mcp/docs/MCP_VERSIONING.md"