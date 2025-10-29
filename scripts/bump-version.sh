#!/bin/bash
# bump-version.sh - Script to bump version of MCP ecosystem components

set -e

# Function to bump version in package.json
bump_package_version() {
  local package_path=$1
  local component_name=$2
  local version_type=$3
  
  if [ ! -f "$package_path" ]; then
    echo "❌ $component_name: package.json not found at $package_path"
    return 1
  fi
  
  # Get current version
  local current_version=$(jq -r '.version' "$package_path" 2>/dev/null)
  if [ "$current_version" == "null" ]; then
    echo "❌ $component_name: Version not found in package.json"
    return 1
  fi
  
  # Parse version components
  IFS='.' read -ra VERSION_PARTS <<< "$current_version"
  local major=${VERSION_PARTS[0]}
  local minor=${VERSION_PARTS[1]}
  local patch=${VERSION_PARTS[2]}
  
  # Bump version based on type
  case $version_type in
    "major")
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    "minor")
      minor=$((minor + 1))
      patch=0
      ;;
    "patch")
      patch=$((patch + 1))
      ;;
    *)
      echo "❌ Invalid version type: $version_type (use major, minor, or patch)"
      return 1
      ;;
  esac
  
  # Create new version
  local new_version="$major.$minor.$patch"
  
  # Update package.json
  jq --arg version "$new_version" '.version = $version' "$package_path" > "$package_path.tmp" && mv "$package_path.tmp" "$package_path"
  
  echo "✅ $component_name: Bumped version from $current_version to $new_version"
  
  # Create git tag
  git tag -a "v$new_version" -m "Release version $new_version of $component_name"
  echo "📌 Git tag v$new_version created"
}

# Main script
if [ $# -lt 2 ]; then
  echo "Usage: $0 <component> <version_type>"
  echo "  component: Name of the component (e.g., mcp-client-bridge)"
  echo "  version_type: Type of version bump (major, minor, patch)"
  echo ""
  echo "Examples:"
  echo "  $0 mcp-client-bridge patch"
  echo "  $0 mcp-client-bridge minor"
  echo "  $0 mcp-client-bridge major"
  exit 1
fi

COMPONENT=$1
VERSION_TYPE=$2

echo "🚀 Bumping version for $COMPONENT ($VERSION_TYPE)"

# Change to the appropriate directory based on component
case $COMPONENT in
  "mcp-client-bridge")
    cd "/Users/lorenzorasmussen/.local/share/mcp/vendor/mcp.ecosystem/mcp.clients/mcp.client-bridge"
    bump_package_version "package.json" "MCP Client Bridge" "$VERSION_TYPE"
    ;;
  *)
    echo "❌ Unknown component: $COMPONENT"
    echo "Supported components:"
    echo "  mcp-client-bridge"
    exit 1
    ;;
esac

echo ""
echo "✅ Version bump completed successfully!"
echo "Don't forget to commit the changes and push the git tag."