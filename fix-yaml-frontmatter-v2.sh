#!/bin/bash

# Script to fix YAML frontmatter by adding quotes around description fields
# Usage: ./fix-yaml-frontmatter-v2.sh

set -e

COMMAND_DIR="/Users/lorenzorasmussen/.config/opencode/command"

echo "🔧 Fixing YAML frontmatter in command files (v2)..."
echo ""

# Function to fix description field using perl for better line handling
fix_description() {
    local file="$1"
    local filename=$(basename "$file")
    
    echo "📝 Processing: $filename"
    
    case "$filename" in
        "debug.md")
            perl -i -pe 's/^description: Advanced debugging utility with interactive debugging, time-travel debugging, AI-powered analysis, breakpoint management, performance profiling, memory leak detection, and automated fix generation$/description: "Advanced debugging utility with interactive debugging, time-travel debugging, AI-powered analysis, breakpoint management, performance profiling, memory leak detection, and automated fix generation"/' "$file"
            ;;
        "orchestrator.md")
            perl -i -pe 's/^description: Coordinate project workflow and manage agent collaboration$/description: "Coordinate project workflow and manage agent collaboration"/' "$file"
            ;;
        "rube-tools.md")
            perl -i -pe 's/^description: Comprehensive Rube MCP server toolkit integration documentation generator - creates detailed usage guides for all 333\+ tools across 14 service categories$/description: "Comprehensive Rube MCP server toolkit integration documentation generator - creates detailed usage guides for all 333+ tools across 14 service categories"/' "$file"
            ;;
    esac
    
    echo "   ✅ Fixed: $filename"
}

# Files to fix
files=(
    "debug.md"
    "orchestrator.md" 
    "rube-tools.md"
)

# Process each file
for file in "${files[@]}"; do
    full_path="$COMMAND_DIR/$file"
    if [[ -f "$full_path" ]]; then
        fix_description "$full_path"
    else
        echo "   ❌ File not found: $full_path"
    fi
done

echo ""
echo "✅ YAML frontmatter fixes completed!"
echo ""
echo "Verifying fixes..."
echo ""

# Verify the fixes
for file in "${files[@]}"; do
    full_path="$COMMAND_DIR/$file"
    echo "📋 $file:"
    head -3 "$full_path" | grep description
    echo ""
done