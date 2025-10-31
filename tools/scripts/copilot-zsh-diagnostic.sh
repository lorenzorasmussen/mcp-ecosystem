#!/bin/bash

# Copilot Zsh Diagnostic and Troubleshooting Utility
# Comprehensive diagnostic tools for zsh configuration issues

set -euo pipefail

# Source the main workflow script for utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/copilot-zsh-workflow.sh"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Diagnostic functions
check_zsh_installation() {
    info "Checking zsh installation..."
    
    if ! command -v zsh &> /dev/null; then
        error "Zsh is not installed"
        return 1
    fi
    
    local zsh_version=$(zsh --version)
    success "Zsh is installed: $zsh_version"
    
    # Check if zsh is the default shell
    local current_shell=$(echo "$SHELL")
    if [[ "$current_shell" == *"zsh"* ]]; then
        success "Zsh is the default shell: $current_shell"
    else
        warning "Zsh is not the default shell. Current shell: $current_shell"
        info "To make zsh default: chsh -s \$(which zsh)"
    fi
    
    return 0
}

check_configuration_files() {
    local config_dir="${1:-${HOME}/.config/zsh}"
    local zshrc="${HOME}/.zshrc"
    
    info "Checking configuration files..."
    
    # Check .zshrc
    if [[ -f "$zshrc" ]]; then
        success "Found .zshrc: $zshrc"
        
        # Check syntax
        if zsh -n "$zshrc" 2>/dev/null; then
            success ".zshrc syntax is valid"
        else
            error ".zshrc has syntax errors"
            zsh -n "$zshrc"
            return 1
        fi
    else
        warning ".zshrc not found: $zshrc"
    fi
    
    # Check config directory
    if [[ -d "$config_dir" ]]; then
        success "Found config directory: $config_dir"
        
        # Check for common config files
        local common_files=("aliases.zsh" "functions.zsh" "plugins.zsh" "theme.zsh" "env.zsh")
        for file in "${common_files[@]}"; do
            local file_path="$config_dir/$file"
            if [[ -f "$file_path" ]]; then
                success "Found: $file"
                
                # Check syntax
                if zsh -n "$file_path" 2>/dev/null; then
                    success "  ✓ Syntax valid"
                else
                    error "  ✗ Syntax error in $file"
                    zsh -n "$file_path"
                fi
            else
                info "  Not found: $file"
            fi
        done
    else
        warning "Config directory not found: $config_dir"
    fi
    
    return 0
}

measure_startup_time() {
    info "Measuring zsh startup time..."
    
    # Measure startup time multiple times for accuracy
    local iterations=5
    local total_time=0
    
    for ((i=1; i<=iterations; i++)); do
        local start_time=$(date +%s%N)
        zsh -i -c 'exit' 2>/dev/null
        local end_time=$(date +%s%N)
        local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        total_time=$((total_time + duration))
        info "  Run $i: ${duration}ms"
    done
    
    local avg_time=$((total_time / iterations))
    
    if [[ $avg_time -lt 500 ]]; then
        success "Average startup time: ${avg_time}ms (Excellent)"
    elif [[ $avg_time -lt 1000 ]]; then
        success "Average startup time: ${avg_time}ms (Good)"
    elif [[ $avg_time -lt 2000 ]]; then
        warning "Average startup time: ${avg_time}ms (Could be optimized)"
    else
        error "Average startup time: ${avg_time}ms (Needs optimization)"
    fi
    
    return 0
}

analyze_plugins() {
    local config_dir="${1:-${HOME}/.config/zsh}"
    
    info "Analyzing zsh plugins..."
    
    # Check for Oh My Zsh
    if [[ -d "${HOME}/.oh-my-zsh" ]]; then
        local omz_version=$(cd "${HOME}/.oh-my-zsh" && git describe --tags 2>/dev/null || echo "unknown")
        success "Oh My Zsh installed: $omz_version"
        
        # Check plugins in .zshrc
        if [[ -f "${HOME}/.zshrc" ]]; then
            local plugins=$(grep "^plugins=" "${HOME}/.zshrc" | sed 's/plugins=(//' | sed 's/)//' | tr '\n' ' ')
            info "Oh My Zsh plugins: $plugins"
        fi
    else
        info "Oh My Zsh not installed"
    fi
    
    # Check for Zinit
    if [[ -f "${HOME}/.zinit/bin/zinit.zsh" ]]; then
        success "Zinit installed"
        
        # List installed plugins
        if command -v zinit &> /dev/null; then
            info "Zinit plugins:"
            zinit list
        fi
    else
        info "Zinit not installed"
    fi
    
    # Check for other plugin managers
    local plugin_managers=("antigen" "prezto" "zplug")
    for manager in "${plugin_managers[@]}"; do
        if [[ -f "${HOME}/.${manager}" ]] || [[ -d "${HOME}/.${manager}" ]]; then
            success "$manager detected"
        fi
    done
    
    return 0
}

check_environment_variables() {
    info "Checking environment variables..."
    
    local important_vars=("ZSH" "ZSH_THEME" "EDITOR" "PATH" "HOME" "USER")
    
    for var in "${important_vars[@]}"; do
        if [[ -n "${!var:-}" ]]; then
            success "$var=${!var}"
        else
            info "$var is not set"
        fi
    done
    
    # Check for potential issues
    if [[ -n "${PATH:-}" ]]; then
        local path_entries=$(echo "$PATH" | tr ':' '\n' | wc -l)
        info "PATH entries: $path_entries"
        
        if [[ $path_entries -gt 20 ]]; then
            warning "PATH has many entries ($path_entries), which may slow down command lookup"
        fi
    fi
    
    return 0
}

check_permissions() {
    local config_dir="${1:-${HOME}/.config/zsh}"
    
    info "Checking file permissions..."
    
    # Check config directory permissions
    if [[ -d "$config_dir" ]]; then
        local dir_perms=$(stat -f "%A" "$config_dir" 2>/dev/null || stat -c "%a" "$config_dir" 2>/dev/null)
        info "Config directory permissions: $dir_perms"
        
        # Check for permission issues
        find "$config_dir" -name "*.zsh" -exec test -r {} \; -print | while read -r file; do
            if [[ ! -r "$file" ]]; then
                error "Cannot read: $file"
            fi
        done
        
        find "$config_dir" -name "*.zsh" -exec test -x {} \; -print | while read -r file; do
            if [[ ! -x "$file" ]]; then
                warning "Not executable: $file"
            fi
        done
    fi
    
    return 0
}

generate_copilot_fixes() {
    local config_dir="${1:-${HOME}/.config/zsh}"
    
    info "Generating Copilot fix suggestions..."
    
    cat << EOF

${CYAN}Copilot Commands to Fix Issues:${NC}

# Fix syntax errors
copilot -p "Fix syntax errors in my zsh configuration files" --add-dir "$config_dir" --allow-all-tools

# Optimize startup time
copilot -p "Optimize my zsh configuration for faster startup" --add-dir "$config_dir" --allow-all-tools

# Fix plugin issues
copilot -p "Debug and fix issues with my zsh plugins" --add-dir "$config_dir" --allow-all-tools

# Improve organization
copilot -p "Reorganize my zsh configuration for better maintainability" --add-dir "$config_dir" --allow-all-tools

# Add missing features
copilot -p "Add useful features and improvements to my zsh configuration" --add-dir "$config_dir" --allow-all-tools

EOF
}

run_full_diagnostic() {
    local config_dir="${1:-${HOME}/.config/zsh}"
    
    info "${CYAN}Starting comprehensive zsh diagnostic...${NC}"
    
    local issues=0
    
    # Run all checks
    check_zsh_installation || ((issues++))
    check_configuration_files "$config_dir" || ((issues++))
    measure_startup_time || ((issues++))
    analyze_plugins "$config_dir" || ((issues++))
    check_environment_variables || ((issues++))
    check_permissions "$config_dir" || ((issues++))
    
    # Summary
    echo
    info "${CYAN}Diagnostic Summary:${NC}"
    if [[ $issues -eq 0 ]]; then
        success "No critical issues found"
    else
        warning "Found $issues potential issues"
    fi
    
    generate_copilot_fixes "$config_dir"
    
    return $issues
}

# Interactive mode
interactive_diagnostic() {
    while true; do
        clear
        cat << EOF
${CYAN}Zsh Configuration Diagnostic Tool${NC}

${YELLOW}Select an option:${NC}

1) Check zsh installation
2) Check configuration files
3) Measure startup time
4) Analyze plugins
5) Check environment variables
6) Check file permissions
7) Run full diagnostic
8) Generate Copilot fixes
9) Exit

EOF
        read -p "Enter your choice (1-9): " choice
        
        case $choice in
            1)
                check_zsh_installation
                read -p "Press Enter to continue..."
                ;;
            2)
                read -p "Enter config directory path (default: ~/.config/zsh): " config_dir
                config_dir="${config_dir:-${HOME}/.config/zsh}"
                check_configuration_files "$config_dir"
                read -p "Press Enter to continue..."
                ;;
            3)
                measure_startup_time
                read -p "Press Enter to continue..."
                ;;
            4)
                read -p "Enter config directory path (default: ~/.config/zsh): " config_dir
                config_dir="${config_dir:-${HOME}/.config/zsh}"
                analyze_plugins "$config_dir"
                read -p "Press Enter to continue..."
                ;;
            5)
                check_environment_variables
                read -p "Press Enter to continue..."
                ;;
            6)
                read -p "Enter config directory path (default: ~/.config/zsh): " config_dir
                config_dir="${config_dir:-${HOME}/.config/zsh}"
                check_permissions "$config_dir"
                read -p "Press Enter to continue..."
                ;;
            7)
                read -p "Enter config directory path (default: ~/.config/zsh): " config_dir
                config_dir="${config_dir:-${HOME}/.config/zsh}"
                run_full_diagnostic "$config_dir"
                read -p "Press Enter to continue..."
                ;;
            8)
                read -p "Enter config directory path (default: ~/.config/zsh): " config_dir
                config_dir="${config_dir:-${HOME}/.config/zsh}"
                generate_copilot_fixes "$config_dir"
                read -p "Press Enter to continue..."
                ;;
            9)
                info "Goodbye!"
                exit 0
                ;;
            *)
                error "Invalid choice. Please enter 1-9."
                read -p "Press Enter to continue..."
                ;;
        esac
    done
}

# Help system
show_help() {
    cat << EOF
${CYAN}Zsh Configuration Diagnostic Tool${NC}

${YELLOW}USAGE:${NC}
    $0 [command] [options]

${YELLOW}COMMANDS:${NC}
    ${GREEN}full${NC} [config-dir]                    Run complete diagnostic
    ${GREEN}installation${NC}                         Check zsh installation
    ${GREEN}config${NC} [config-dir]                  Check configuration files
    ${GREEN}startup${NC}                              Measure startup time
    ${GREEN}plugins${NC} [config-dir]                 Analyze plugins
    ${GREEN}environment${NC}                          Check environment variables
    ${GREEN}permissions${NC} [config-dir]             Check file permissions
    ${GREEN}fixes${NC} [config-dir]                   Generate Copilot fix commands
    ${GREEN}interactive${NC}                          Run in interactive mode
    ${GREEN}help${NC}                                  Show this help

${YELLOW}EXAMPLES:${NC}
    $0 full                                    # Run complete diagnostic
    $0 full ~/.config/zsh                     # Run diagnostic on custom directory
    $0 startup                                 # Measure startup time only
    $0 interactive                             # Interactive mode

${YELLOW}ENVIRONMENT VARIABLES:${NC}
    DEBUG=1                                    Enable debug logging

EOF
}

# Main execution
main() {
    local command="${1:-}"
    
    case "$command" in
        "full")
            shift
            run_full_diagnostic "$@"
            ;;
        "installation")
            check_zsh_installation
            ;;
        "config")
            shift
            check_configuration_files "$@"
            ;;
        "startup")
            measure_startup_time
            ;;
        "plugins")
            shift
            analyze_plugins "$@"
            ;;
        "environment")
            check_environment_variables
            ;;
        "permissions")
            shift
            check_permissions "$@"
            ;;
        "fixes")
            shift
            generate_copilot_fixes "$@"
            ;;
        "interactive")
            interactive_diagnostic
            ;;
        "help"|"--help"|"-h"|"")
            show_help
            ;;
        *)
            error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"