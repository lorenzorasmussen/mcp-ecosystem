#!/usr/bin/env python3
"""
Script to update OpenCode agent and command files with required standards.
"""

import os
import re
import yaml
from pathlib import Path

def read_file_content(file_path):
    """Read file content and separate frontmatter from content."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Split frontmatter and content
        if content.startswith('---'):
            parts = content.split('---', 2)
            if len(parts) >= 3:
                frontmatter = parts[1].strip()
                main_content = parts[2].strip()
                return frontmatter, main_content
        
        # No frontmatter found
        return None, content
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None, None

def write_file_content(file_path, frontmatter, main_content):
    """Write file content with frontmatter."""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            if frontmatter:
                f.write('---\n')
                f.write(frontmatter)
                f.write('\n---\n')
            if main_content:
                f.write('\n' + main_content if frontmatter else main_content)
        return True
    except Exception as e:
        print(f"Error writing {file_path}: {e}")
        return False

def parse_yaml_frontmatter(frontmatter_str):
    """Parse YAML frontmatter."""
    try:
        return yaml.safe_load(frontmatter_str) or {}
    except Exception as e:
        print(f"Error parsing YAML: {e}")
        return {}

def dump_yaml_frontmatter(data):
    """Dump YAML frontmatter."""
    try:
        return yaml.dump(data, default_flow_style=False, sort_keys=False)
    except Exception as e:
        print(f"Error dumping YAML: {e}")
        return ""

def process_agent_file(file_path):
    """Process a single agent file."""
    frontmatter_str, main_content = read_file_content(file_path)
    
    if frontmatter_str is None:
        print(f"No frontmatter found in {file_path}")
        return False, "No frontmatter"
    
    data = parse_yaml_frontmatter(frontmatter_str)
    updated = False
    changes = []
    
    # Ensure tools section exists
    if 'tools' not in data:
        data['tools'] = {}
        updated = True
        changes.append("Added tools section")
    
    # Add todowrite and todoread to tools
    if 'todowrite' not in data['tools'] or data['tools']['todowrite'] != True:
        data['tools']['todowrite'] = True
        updated = True
        changes.append("Added todowrite: true")
    
    if 'todoread' not in data['tools'] or data['tools']['todoread'] != True:
        data['tools']['todoread'] = True
        updated = True
        changes.append("Added todoread: true")
    
    # Remove any argument-hint fields
    if 'argument-hint' in data:
        del data['argument-hint']
        updated = True
        changes.append("Removed argument-hint")
    
    # Also check in tools section for argument-hint
    if 'argument-hint' in data.get('tools', {}):
        del data['tools']['argument-hint']
        updated = True
        changes.append("Removed argument-hint from tools")
    
    if updated:
        new_frontmatter = dump_yaml_frontmatter(data)
        success = write_file_content(file_path, new_frontmatter, main_content)
        return success, ", ".join(changes)
    
    return False, "No changes needed"

def process_command_file(file_path):
    """Process a single command file."""
    frontmatter_str, main_content = read_file_content(file_path)
    
    if frontmatter_str is None:
        print(f"No frontmatter found in {file_path}")
        return False, "No frontmatter"
    
    data = parse_yaml_frontmatter(frontmatter_str)
    updated = False
    changes = []
    
    # Add subtask: true
    if 'subtask' not in data or data['subtask'] != True:
        data['subtask'] = True
        updated = True
        changes.append("Added subtask: true")
    
    # Remove any argument-hint fields
    if 'argument-hint' in data:
        del data['argument-hint']
        updated = True
        changes.append("Removed argument-hint")
    
    if updated:
        new_frontmatter = dump_yaml_frontmatter(data)
        success = write_file_content(file_path, new_frontmatter, main_content)
        return success, ", ".join(changes)
    
    return False, "No changes needed"

def main():
    """Main processing function."""
    base_path = Path("/Users/lorenzorasmussen/.config/opencode")
    
    # Process agent files
    agent_dir = base_path / "agent"
    agent_files = list(agent_dir.glob("*.md"))
    
    print(f"Found {len(agent_files)} agent files")
    
    agent_updated = 0
    agent_failed = 0
    agent_argument_hints_removed = 0
    
    for agent_file in agent_files:
        success, changes = process_agent_file(agent_file)
        if success:
            agent_updated += 1
            print(f"✓ Updated {agent_file.name}: {changes}")
            if "argument-hint" in changes:
                agent_argument_hints_removed += 1
        elif "No changes needed" in changes:
            print(f"- No changes needed for {agent_file.name}")
        else:
            agent_failed += 1
            print(f"✗ Failed to update {agent_file.name}: {changes}")
    
    # Process command files
    command_dir = base_path / "command"
    command_files = list(command_dir.glob("*.md"))
    
    print(f"\nFound {len(command_files)} command files")
    
    command_updated = 0
    command_failed = 0
    command_argument_hints_removed = 0
    
    for command_file in command_files:
        success, changes = process_command_file(command_file)
        if success:
            command_updated += 1
            print(f"✓ Updated {command_file.name}: {changes}")
            if "argument-hint" in changes:
                command_argument_hints_removed += 1
        elif "No changes needed" in changes:
            print(f"- No changes needed for {command_file.name}")
        else:
            command_failed += 1
            print(f"✗ Failed to update {command_file.name}: {changes}")
    
    # Generate final report
    print("\n" + "="*60)
    print("FINAL REPORT")
    print("="*60)
    print(f"Agent files processed: {len(agent_files)}")
    print(f"  - Updated with todowrite/todoread: {agent_updated}")
    print(f"  - Failed to update: {agent_failed}")
    print(f"  - Argument-hint fields removed: {agent_argument_hints_removed}")
    print()
    print(f"Command files processed: {len(command_files)}")
    print(f"  - Updated with subtask: true: {command_updated}")
    print(f"  - Failed to update: {command_failed}")
    print(f"  - Argument-hint fields removed: {command_argument_hints_removed}")
    print()
    total_argument_hints_removed = agent_argument_hints_removed + command_argument_hints_removed
    print(f"Total argument-hint fields removed: {total_argument_hints_removed}")
    
    if agent_failed == 0 and command_failed == 0:
        print("\n✅ ALL FILES SUCCESSFULLY PROCESSED!")
    else:
        print(f"\n⚠️  {agent_failed + command_failed} files failed to update")

if __name__ == "__main__":
    main()