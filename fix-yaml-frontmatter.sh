#!/bin/bash

# Script to fix YAML frontmatter by adding quotes around description fields
# Usage: ./fix-yaml-frontmatter.sh

set -e

COMMAND_DIR="/Users/lorenzorasmussen/.config/opencode/command"
TEMP_DIR="/tmp/yaml-fix-$$"

# Create temporary directory
mkdir -p "$TEMP_DIR"

echo "🔧 Fixing YAML frontmatter in command files..."
echo ""

# Files to fix
files=(
    "debug.md"
    "orchestrator.md" 
    "rube-tools.md"
)

# Function to fix description field in a file
fix_description() {
    local file="$1"
    local temp_file="$TEMP_DIR/$(basename "$file")"
    
    echo "📝 Processing: $file"
    
    # Copy original file to temp location
    cp "$file" "$temp_file"
    
    # Fix the description line by adding quotes
    sed -i '' 's/^description: \([^"]\)/description: "\1/' "$temp_file"
    sed -i '' 's/\([^"]\)$/"/' "$temp_file"
    
    # More precise fix for each file
    case "$(basename "$file")" in
        "debug.md")
            sed -i '' 's/^description: Advanced debugging utility with interactive debugging, time-travel debugging, AI-powered analysis, breakpoint management, performance profiling, memory leak detection, and automated fix generation$/description: "Advanced debugging utility with interactive debugging, time-travel debugging, AI-powered analysis, breakpoint management, performance profiling, memory leak detection, and automated fix generation"/' "$temp_file"
            ;;
        "orchestrator.md")
            sed -i '' 's/^description: Coordinate project workflow and manage agent collaboration$/description: "Coordinate project workflow and manage agent collaboration"/' "$temp_file"
            ;;
        "rube-tools.md")
            sed -i '' 's/^description: Comprehensive Rube MCP server toolkit integration documentation generator - creates detailed usage guides for all 333+ tools across 14 service categories$/description: "Comprehensive Rube MCP server toolkit integration documentation generator - creates detailed usage guides for all 333+ tools across 14 service categories"/' "$temp_file"
            ;;
    esac
    
    # Replace original file
    cp "$temp_file" "$file"
    
    echo "   ✅ Fixed: $file"
}

# Process each file
for file in "${files[@]}"; do
    full_path="$COMMAND_DIR/$file"
    if [[ -f "$full_path" ]]; then
        fix_description "$full_path"
    else
        echo "   ❌ File not found: $full_path"
    fi
done

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ YAML frontmatter fixes completed!"
echo ""
echo "Files updated:"
for file in "${files[@]}"; do
    echo "   • $COMMAND_DIR/$file"
done