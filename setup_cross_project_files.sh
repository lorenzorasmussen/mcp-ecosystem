#!/bin/bash

# Cross-Project Orchestration File Setup Script
# This script helps place the Cross-Project Orchestration files in their correct locations

echo "Setting up Cross-Project Orchestration files..."

# Define target paths
AGENT_TARGET="/Users/lorenzorasmussen/.config/opencode/agent/cross-project.md"
COMMAND_TARGET="/Users/lorenzorasmussen/.config/opencode/command/orchestrate-cross-project.md"
DOCS_TARGET="/Users/lorenzorasmussen/.config/opencode/agent/cross-project-orchestration.md"

# Define source files (in current directory)
AGENT_SOURCE="cross-project.md"
COMMAND_SOURCE="orchestrate-cross-project.md"
DOCS_SOURCE="cross-project-orchestration.md"

# Function to copy file with error handling
copy_file() {
    local source="$1"
    local target="$2"
    local description="$3"
    
    echo "Installing $description..."
    
    if [ ! -f "$source" ]; then
        echo "Error: Source file $source not found!"
        return 1
    fi
    
    # Create backup if target exists
    if [ -f "$target" ]; then
        echo "Creating backup of existing $description..."
        cp "$target" "${target}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Copy the file
    if cp "$source" "$target"; then
        echo "✓ $description installed successfully"
        return 0
    else
        echo "✗ Failed to install $description"
        echo "You may need to run this script with sudo or check file permissions"
        return 1
    fi
}

# Check if files exist in current directory
echo "Checking source files..."
for file in "$AGENT_SOURCE" "$COMMAND_SOURCE" "$DOCS_SOURCE"; do
    if [ ! -f "$file" ]; then
        echo "Error: Source file $file not found in current directory!"
        exit 1
    fi
done

# Install files
echo ""
echo "Installing Cross-Project Orchestration files..."
echo ""

copy_file "$AGENT_SOURCE" "$AGENT_TARGET" "Cross-Project Agent"
copy_file "$COMMAND_SOURCE" "$COMMAND_TARGET" "Orchestration Command"
copy_file "$DOCS_SOURCE" "$DOCS_TARGET" "Comprehensive Documentation"

echo ""
echo "Installation complete!"
echo ""
echo "Files installed:"
echo "  - Agent: $AGENT_TARGET"
echo "  - Command: $COMMAND_TARGET"
echo "  - Documentation: $DOCS_TARGET"
echo ""
echo "To use the Cross-Project Orchestration agent:"
echo "  1. Restart your OpenCode configuration server"
echo "  2. Use the command: /orchestrate-cross-project"
echo ""
echo "For detailed documentation, see: $DOCS_TARGET"
