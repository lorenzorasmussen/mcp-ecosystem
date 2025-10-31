#!/bin/bash

# Script to fix YAML frontmatter by adding quotes around description fields
# Uses cat and redirection to avoid temp file issues

set -e

COMMAND_DIR="/Users/lorenzorasmussen/.config/opencode/command"

echo "🔧 Fixing YAML frontmatter in command files (v3)..."
echo ""

# Function to fix description field using awk
fix_description() {
    local file="$1"
    local filename=$(basename "$file")
    
    echo "📝 Processing: $filename"
    
    # Use awk to process the file line by line
    awk '
    BEGIN { in_frontmatter = 0; fixed = 0 }
    /^---$/ { 
        if (in_frontmatter == 0) {
            in_frontmatter = 1
            print $0
            next
        } else if (in_frontmatter == 1) {
            in_frontmatter = 2
            print $0
            next
        }
    }
    /^description: / && in_frontmatter == 1 && fixed == 0 {
        # Add quotes around the description
        gsub(/^description: /, "description: \"")
        $0 = $0 "\""
        fixed = 1
        print $0
        next
    }
    { print $0 }
    ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
    
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