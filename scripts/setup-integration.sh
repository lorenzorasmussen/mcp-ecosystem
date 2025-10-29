#!/bin/bash
# OpenCode MCP Integration Setup
# Sets up MCP integration with shell environment

set -e

# Configuration
MCP_DIR="$HOME/.local/share/mcp"
SHELL_RC=""
SHELL_TYPE=""

# Detect shell
detect_shell() {
    if [[ -n "$ZSH_VERSION" ]]; then
        SHELL_TYPE="zsh"
        SHELL_RC="$HOME/.zshrc"
    elif [[ -n "$BASH_VERSION" ]]; then
        SHELL_TYPE="bash"
        SHELL_RC="$HOME/.bashrc"
    else
        echo "❌ Unsupported shell. Please use bash or zsh."
        exit 1
    fi
}

# Check if line exists in file
line_exists() {
    local file="$1"
    local line="$2"
    grep -qF "$line" "$file" 2>/dev/null
}

# Add line to file if it doesn't exist
add_line_if_missing() {
    local file="$1"
    local line="$2"

    if ! line_exists "$file" "$line"; then
        echo "$line" >> "$file"
        echo "✅ Added to $file: $line"
    else
        echo "ℹ️  Already exists in $file: $line"
    fi
}

# Setup PATH
setup_path() {
    echo "🔧 Setting up PATH..."

    local path_line='export PATH="$HOME/.local/bin:$PATH"'

    if [[ -f "$SHELL_RC" ]]; then
        add_line_if_missing "$SHELL_RC" "$path_line"
    fi

    # Also add to current session
    export PATH="$HOME/.local/bin:$PATH"
}

# Setup shell integration
setup_shell_integration() {
    echo "🔗 Setting up shell integration..."

    local source_line='source ~/.local/share/mcp/mcp-shell-integration.sh'

    if [[ -f "$SHELL_RC" ]]; then
        add_line_if_missing "$SHELL_RC" "$source_line"
    fi
}

# Setup directory change hooks
setup_directory_hooks() {
    echo "📁 Setting up directory change hooks..."

    case "$SHELL_TYPE" in
        bash)
            local hook_line='PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND$'\''\n'\''} mcp-enter-directory"'
            if [[ -f "$SHELL_RC" ]]; then
                add_line_if_missing "$SHELL_RC" "$hook_line"
            fi
            ;;
        zsh)
            local hook_line='autoload -U add-zsh-hook'
            local hook_line2='add-zsh-hook chpwd mcp-enter-directory'

            if [[ -f "$SHELL_RC" ]]; then
                add_line_if_missing "$SHELL_RC" "$hook_line"
                add_line_if_missing "$SHELL_RC" "$hook_line2"
            fi
            ;;
    esac
}

# Create desktop shortcuts/applications
create_desktop_shortcuts() {
    echo "🖥️  Creating desktop shortcuts..."

    local desktop_dir="$HOME/Desktop"
    local applications_dir="$HOME/Applications"

    # Create MCP status checker script
    cat > "$desktop_dir/MCP Status.command" << 'EOF'
#!/bin/bash
echo "Checking MCP Status..."
~/.local/bin/mcp-connect status
echo ""
echo "Press Enter to continue..."
read
EOF

    chmod +x "$desktop_dir/MCP Status.command"

    # Create MCP server manager script
    cat > "$desktop_dir/MCP Servers.command" << 'EOF'
#!/bin/bash
echo "MCP Server Manager"
echo "=================="
echo ""
~/.local/bin/mcp-connect list
echo ""
echo "Commands:"
echo "  mcp-connect start <server>  - Start a server"
echo "  mcp-connect stop <server>   - Stop a server"
echo "  mcp-connect info            - Show status"
echo ""
echo "Press Enter to continue..."
read
EOF

    chmod +x "$desktop_dir/MCP Servers.command"

    echo "✅ Created desktop shortcuts"
}

# Verify setup
verify_setup() {
    echo "🔍 Verifying setup..."

    # Check if scripts are executable
    if [[ -x "$HOME/.local/bin/mcp-connect" ]]; then
        echo "✅ mcp-connect script is executable"
    else
        echo "❌ mcp-connect script is not executable"
    fi

    # Check if integration file exists
    if [[ -f "$HOME/.local/share/mcp/mcp-shell-integration.sh" ]]; then
        echo "✅ Shell integration file exists"
    else
        echo "❌ Shell integration file missing"
    fi

    # Check PATH
    if [[ ":$PATH:" == *":$HOME/.local/bin:"* ]]; then
        echo "✅ ~/.local/bin is in PATH"
    else
        echo "❌ ~/.local/bin is not in PATH"
    fi
}

# Main setup function
main() {
    echo "🚀 Setting up OpenCode MCP Integration"
    echo "======================================"
    echo ""

    detect_shell
    echo "📟 Detected shell: $SHELL_TYPE"
    echo "📄 Shell config: $SHELL_RC"
    echo ""

    setup_path
    echo ""

    setup_shell_integration
    echo ""

    setup_directory_hooks
    echo ""

    create_desktop_shortcuts
    echo ""

    verify_setup
    echo ""

    echo "🎉 Setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Restart your terminal or run: source $SHELL_RC"
    echo "2. Test with: mcp-status"
    echo "3. Start MCP ecosystem: pm2 start $MCP_DIR/ecosystem.config.cjs"
    echo "4. Try: mcp-auto (in any project directory)"
    echo ""
    echo "Documentation: $MCP_DIR/README.md"
}

# Run main setup
main "$@"