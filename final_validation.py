#!/usr/bin/env python3
"""
Final validation script to ensure all OpenCode requirements are met.
"""

import os
import yaml
from pathlib import Path

def validate_agent_file(file_path):
    """Validate a single agent file meets all requirements."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if file has frontmatter
        if not content.startswith('---'):
            return False, "No frontmatter found"
        
        # Parse frontmatter
        parts = content.split('---', 2)
        if len(parts) < 3:
            return False, "Invalid frontmatter structure"
        
        frontmatter_str = parts[1].strip()
        data = yaml.safe_load(frontmatter_str)
        
        if not data:
            return False, "Empty or invalid frontmatter"
        
        issues = []
        
        # Check ALL required fields at once
        # Description is REQUIRED
        if 'description' not in data or not data['description'] or data['description'].strip() == '':
            issues.append("Missing or empty description field")
        
        # Check for and REMOVE model field (not allowed)
        if 'model' in data:
            issues.append("Found model field (should be removed)")
        
        # Check tools section - REQUIRED for agents
        if 'tools' not in data:
            issues.append("Missing tools section")
        else:
            tools = data['tools']
            if not isinstance(tools, dict):
                issues.append("Tools section is not a dictionary")
            else:
                # Check for REQUIRED todowrite and todoread
                if tools.get('todowrite') != True:
                    issues.append("Missing or incorrect todowrite: true")
                if tools.get('todoread') != True:
                    issues.append("Missing or incorrect todoread: true")
                
                # Check for argument-hint (should not exist)
                if 'argument-hint' in tools:
                    issues.append("Found argument-hint in tools section (should be removed)")
        
        # Check for argument-hint in main section
        if 'argument-hint' in data:
            issues.append("Found argument-hint in main section (should be removed)")
        
        return len(issues) == 0, "; ".join(issues) if issues else "Valid"
    
    except Exception as e:
        return False, f"Error: {e}"

def validate_command_file(file_path):
    """Validate a single command file meets all requirements."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if file has frontmatter
        if not content.startswith('---'):
            return False, "No frontmatter found"
        
        # Parse frontmatter
        parts = content.split('---', 2)
        if len(parts) < 3:
            return False, "Invalid frontmatter structure"
        
        frontmatter_str = parts[1].strip()
        data = yaml.safe_load(frontmatter_str)
        
        if not data:
            return False, "Empty or invalid frontmatter"
        
        issues = []
        
        # Check for subtask: true
        if data.get('subtask') != True:
            issues.append("Missing or incorrect subtask: true")
        
        # Check for argument-hint (should not exist)
        if 'argument-hint' in data:
            issues.append("Found argument-hint (should be removed)")
        
        return len(issues) == 0, "; ".join(issues) if issues else "Valid"
    
    except Exception as e:
        return False, f"Error: {e}"

def main():
    """Main validation function."""
    base_path = Path("/Users/lorenzorasmussen/.config/opencode")
    
    # Validate agent files
    agent_dir = base_path / "agent"
    agent_files = list(agent_dir.glob("*.md"))
    
    print(f"Validating {len(agent_files)} agent files...")
    
    agent_valid = 0
    agent_invalid = 0
    agent_issues = {}
    
    for agent_file in agent_files:
        is_valid, message = validate_agent_file(agent_file)
        if is_valid:
            agent_valid += 1
            print(f"✓ {agent_file.name}: Valid")
        else:
            agent_invalid += 1
            agent_issues[agent_file.name] = message
            print(f"✗ {agent_file.name}: {message}")
    
    # Validate command files
    command_dir = base_path / "command"
    command_files = list(command_dir.glob("*.md"))
    
    print(f"\nValidating {len(command_files)} command files...")
    
    command_valid = 0
    command_invalid = 0
    command_issues = {}
    
    for command_file in command_files:
        is_valid, message = validate_command_file(command_file)
        if is_valid:
            command_valid += 1
            print(f"✓ {command_file.name}: Valid")
        else:
            command_invalid += 1
            command_issues[command_file.name] = message
            print(f"✗ {command_file.name}: {message}")
    
    # Generate final report
    print("\n" + "="*60)
    print("FINAL VALIDATION REPORT")
    print("="*60)
    print(f"Agent files validated: {len(agent_files)}")
    print(f"  - Valid: {agent_valid}")
    print(f"  - Invalid: {agent_invalid}")
    print()
    print(f"Command files validated: {len(command_files)}")
    print(f"  - Valid: {command_valid}")
    print(f"  - Invalid: {command_invalid}")
    
    # Show detailed issues if any
    if agent_issues or command_issues:
        print("\n" + "="*60)
        print("DETAILED ISSUES")
        print("="*60)
        
        if agent_issues:
            print("\nAGENT FILE ISSUES:")
            for filename, issues in agent_issues.items():
                print(f"  {filename}: {issues}")
        
        if command_issues:
            print("\nCOMMAND FILE ISSUES:")
            for filename, issues in command_issues.items():
                print(f"  {filename}: {issues}")
    
    total_valid = agent_valid + command_valid
    total_files = len(agent_files) + len(command_files)
    
    print(f"\nOVERALL STATUS: {total_valid}/{total_files} files valid ({(total_valid/total_files*100):.1f}%)")
    
    if agent_invalid == 0 and command_invalid == 0:
        print("\n🎉 ALL FILES MEET REQUIREMENTS!")
        return True
    else:
        print(f"\n⚠️  {agent_invalid + command_invalid} files still need fixes")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)