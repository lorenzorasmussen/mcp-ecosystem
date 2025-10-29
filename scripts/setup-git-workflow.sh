#!/bin/bash
# MCP Ecosystem Git Workflow Setup Script

set -e  # Exit on any error

echo "🔧 Setting up Git workflow for MCP Ecosystem..."

# Setup Git configuration
echo "⚙️ Configuring Git settings..."

# Set up commit template
git config commit.template /Users/lorenzorasmussen/.local/share/mcp/.gitmessage

# Set up user information if not already set
if [ -z "$(git config user.name)" ]; then
    git config user.name "MCP Documentation Agent"
fi

if [ -z "$(git config user.email)" ]; then
    git config user.email "docs@mcp-ecosystem.local"
fi

# Set up pull behavior
git config pull.rebase false

# Set up push behavior
git config push.default simple

# Set up color UI
git config color.ui auto

# Setup Git aliases
echo "🔗 Setting up Git aliases..."

# Read the gitconfig file and apply the aliases
while IFS= read -r line; do
    # Skip empty lines and comments
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    
    # Extract alias section
    if [[ "$line" =~ ^alias\. ]]; then
        key=$(echo "$line" | cut -d'=' -f1 | xargs)
        value=$(echo "$line" | cut -d'=' -f2- | xargs)
        git config --local "$key" "$value"
    elif [[ "$line" =~ ^[a-zA-Z] ]]; then
        # Handle complex configurations like functions
        key=$(echo "$line" | cut -d'=' -f1 | xargs)
        value=$(echo "$line" | cut -d'=' -f2- | xargs)
        if [[ "$key" =~ ^[a-zA-Z].* ]]; then
            git config --local "$key" "$value"
        fi
    fi
done < /Users/lorenzorasmussen/.local/share/mcp/.gitconfig

# Setup Git hooks
echo "🎣 Setting up Git hooks..."
bash /Users/lorenzorasmussen/.local/share/mcp/scripts/setup-git-hooks.sh

# Verify Git configuration
echo "✅ Git workflow setup completed!"

echo ""
echo "📋 Summary of Git workflow setup:"
echo "   - Commit template configured"
echo "   - Git aliases installed"
echo "   - Pre-commit hook installed"
echo "   - Commit message validation enabled"
echo ""
echo "🚀 You're ready to use the MCP Ecosystem Git workflow!"
echo ""
echo "💡 Quick start commands:"
echo "   git create-feature <feature-name>  # Create and switch to a new feature branch"
echo "   git create-bugfix <bugfix-name>    # Create and switch to a new bugfix branch"
echo "   git lg                             # View formatted log with graph"
echo "   git sync-develop                   # Sync with remote develop branch"
echo "   git cleanup-merged                 # Remove merged branches"