#!/usr/bin/env python3
"""
Script to fix YAML quote corruption in OpenCode files.
"""

import os
import re
from pathlib import Path

def fix_yaml_quotes(content):
    """Fix common YAML quote corruption issues."""
    # Fix unclosed quotes at end of lines
    content = re.sub(r'"([^"\n]*?)\n', r'"\1\n', content)
    
    # Fix double quotes at start
    content = re.sub(r'""([^"])', r'"\1', content)
    
    # Fix quotes that don't close properly
    content = re.sub(r'([^:]\s*)"([^"]*?)\n(?!\s*[-:])', r'\1"\2"\n', content)
    
    # Fix argument-hint lines that are cut off
    content = re.sub(r'argument-hint:\s*"([^"]*?)\n', r'argument-hint: "\1"\n', content)
    
    # Fix description lines that are cut off
    content = re.sub(r'description:\s*"([^"]*?)\n(?!\s*[-:])', r'description: "\1"\n', content)
    
    # Fix agent lines that are cut off
    content = re.sub(r'agent:\s*"([^"]*?)\n(?!\s*[-:])', r'agent: "\1"\n', content)
    
    # Fix template lines that are cut off
    content = re.sub(r'template:\s*"([^"]*?)\n(?!\s*[-:])', r'template: "\1"\n', content)
    
    # Fix subtask lines with corruption
    content = re.sub(r'subtask:\s*"([^"]*?)\n(?!\s*[-:])', r'subtask: \1\n', content)
    content = re.sub(r'subtasks:\s*([^"\n]*?)\n', r'subtask: \1\n', content)
    
    # Fix permission values that are corrupted
    content = re.sub(r'(edit|bash|webfetch):\s*""([^"])"', r'\1: "\2', content)
    
    return content

def fix_specific_patterns(content):
    """Fix specific known corruption patterns."""
    # Fix specific patterns found in the error output
    fixes = [
        # Fix description truncation
        (r'description:\s*"([^"]*?)\s*$', r'description: "\1"'),
        # Fix agent truncation
        (r'agent:\s*"([^"]*?)\s*$', r'agent: "\1"'),
        # Fix argument-hint truncation
        (r'argument-hint:\s*"([^"]*?)\s*$', r'argument-hint: "\1"'),
        # Fix template truncation
        (r'template:\s*"([^"]*?)\s*$', r'template: "\1"'),
        # Fix corrupted permission values
        (r'(edit|bash|webfetch):\s*""([^"])"', r'\1: "\2"'),
        # Fix subtask corruption
        (r'subtask:\s*"([^"]*?)\s*$', r'subtask: \1'),
        (r'subtasks:\s*([^"\n]*?)\s*$', r'subtask: \1'),
    ]
    
    for pattern, replacement in fixes:
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    
    return content

def process_file_for_quotes(file_path):
    """Process a single file to fix quote corruption."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply quote fixes
        content = fix_yaml_quotes(content)
        content = fix_specific_patterns(content)
        
        # Only write if content changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, "Fixed quote corruption"
        
        return False, "No quote issues found"
    
    except Exception as e:
        return False, f"Error: {e}"

def main():
    """Main processing function."""
    base_path = Path("/Users/lorenzorasmussen/.config/opencode")
    
    # Process agent files
    agent_dir = base_path / "agent"
    agent_files = list(agent_dir.glob("*.md"))
    
    print(f"Fixing quote corruption in {len(agent_files)} agent files...")
    
    agent_fixed = 0
    agent_failed = 0
    
    for agent_file in agent_files:
        fixed, message = process_file_for_quotes(agent_file)
        if fixed:
            agent_fixed += 1
            print(f"✓ Fixed quotes in {agent_file.name}")
        elif "No quote issues" in message:
            print(f"- No quote issues in {agent_file.name}")
        else:
            agent_failed += 1
            print(f"✗ Failed to fix {agent_file.name}: {message}")
    
    # Process command files
    command_dir = base_path / "command"
    command_files = list(command_dir.glob("*.md"))
    
    print(f"\nFixing quote corruption in {len(command_files)} command files...")
    
    command_fixed = 0
    command_failed = 0
    
    for command_file in command_files:
        fixed, message = process_file_for_quotes(command_file)
        if fixed:
            command_fixed += 1
            print(f"✓ Fixed quotes in {command_file.name}")
        elif "No quote issues" in message:
            print(f"- No quote issues in {command_file.name}")
        else:
            command_failed += 1
            print(f"✗ Failed to fix {command_file.name}: {message}")
    
    # Generate final report
    print("\n" + "="*60)
    print("QUOTE CORRUPTION FIX REPORT")
    print("="*60)
    print(f"Agent files processed: {len(agent_files)}")
    print(f"  - Quote corruption fixed: {agent_fixed}")
    print(f"  - Failed to fix: {agent_failed}")
    print()
    print(f"Command files processed: {len(command_files)}")
    print(f"  - Quote corruption fixed: {command_fixed}")
    print(f"  - Failed to fix: {command_failed}")
    print()
    total_fixed = agent_fixed + command_fixed
    total_failed = agent_failed + command_failed
    print(f"Total files with quote corruption fixed: {total_fixed}")
    
    if total_failed == 0:
        print("\n✅ ALL QUOTE CORRUPTION ISSUES RESOLVED!")
    else:
        print(f"\n⚠️  {total_failed} files still have issues")

if __name__ == "__main__":
    main()