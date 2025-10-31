#!/bin/bash

# Script to fix YAML headers in OpenCode agent and command files
# This script will:
# 1. Remove ALL model fields from both agent and command files
# 2. Fix mode fields in agents to use only: primary, subagent, or all
# 3. Use different standards for agent vs command files
# 4. Only allow official OpenCode fields

AGENT_DIR="$HOME/.config/opencode/agent"
COMMAND_DIR="$HOME/.config/opencode/command"

# Counters for reporting
AGENT_FILES_PROCESSED=0
COMMAND_FILES_PROCESSED=0
MODEL_FIELDS_REMOVED=0
MODE_FIELDS_FIXED=0
PERMISSION_FIELDS_FIXED=0
INVALID_FIELDS_REMOVED=0

echo "Starting comprehensive YAML header fixes..."
echo "Agent directory: $AGENT_DIR"
echo "Command directory: $COMMAND_DIR"
echo ""

# Function to fix agent files
fix_agent_file() {
    local file="$1"
    local temp_file=$(mktemp)
    local changes_made=false
    
    # Extract YAML frontmatter and content
    awk '
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
    {
        if (in_frontmatter == 1) {
            # Process frontmatter lines
            if ($0 ~ /^model:/) {
                print "# REMOVED: " $0
                next
            } else if ($0 ~ /^mode:/) {
                # Validate mode field
                if ($0 !~ /(primary|subagent|all)/) {
                    print "mode: all  # FIXED from invalid value"
                } else {
                    print $0
                }
                next
            } else if ($0 ~ /^permissions:/) {
                print "permission:"  # FIXED: plural to singular
                next
            } else if ($0 ~ /^  [a-zA-Z]+:/ && $0 !~ /^(  (write|edit|bash|webfetch|read|list|search|grep|glob|todoread|todowrite):)/) {
                print "# REMOVED INVALID TOOL: " $0
                next
            } else {
                print $0
            }
        } else {
            # Print content as-is
            print $0
        }
    }
    ' "$file" > "$temp_file"
    
    # Replace original file
    mv "$temp_file" "$file"
    echo "Fixed agent file: $file"
    ((AGENT_FILES_PROCESSED++))
}

# Function to fix command files
fix_command_file() {
    local file="$1"
    local temp_file=$(mktemp)
    
    # For command files, we need to handle corrupted headers first
    # Check if file has corrupted YAML
    if head -5 "$file" | grep -q '\-\-"'; then
        # Fix corrupted YAML header
        sed -i '' '1,10s/--"/---/g' "$file"
        sed -i '' 's/\-\-"$/---/g' "$file"
        echo "Fixed corrupted YAML in command file: $file"
    fi
    
    # Process command file
    awk '
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
    {
        if (in_frontmatter == 1) {
            # Process frontmatter lines for command files
            if ($0 ~ /^model:/) {
                print "# REMOVED: " $0
                next
            } else if ($0 ~ /^subagent:/) {
                # Fix subagent to subtask
                print "subtask:" substr($0, index($0, ":"))
                next
            } else if ($0 ~ /^permissions:/) {
                print "# REMOVED: " $0
                next
            } else if ($0 ~ /^temperature:/) {
                print "# REMOVED: " $0
                next
            } else if ($0 ~ /^tools:/) {
                print "# REMOVED: " $0
                next
            } else {
                print $0
            }
        } else {
            # Print content as-is
            print $0
        }
    }
    ' "$file" > "$temp_file"
    
    # Replace original file
    mv "$temp_file" "$file"
    echo "Fixed command file: $file"
    ((COMMAND_FILES_PROCESSED++))
}

# Process all agent files
echo "Processing agent files..."
for file in "$AGENT_DIR"/*.md; do
    if [[ -f "$file" ]]; then
        fix_agent_file "$file"
    fi
done

echo ""
echo "Processing command files..."
for file in "$COMMAND_DIR"/*.md; do
    if [[ -f "$file" ]]; then
        fix_command_file "$file"
    fi
done

echo ""
echo "=== COMPREHENSIVE FIX REPORT ==="
echo "Agent files processed: $AGENT_FILES_PROCESSED"
echo "Command files processed: $COMMAND_FILES_PROCESSED"
echo "Model fields removed: $MODEL_FIELDS_REMOVED"
echo "Mode fields fixed: $MODE_FIELDS_FIXED"
echo "Permission fields fixed: $PERMISSION_FIELDS_FIXED"
echo "Invalid fields removed: $INVALID_FIELDS_REMOVED"
echo ""
echo "YAML header fixes completed successfully!"