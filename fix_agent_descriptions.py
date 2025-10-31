#!/usr/bin/env python3
"""
Script to add missing description fields to agent files.
"""

import os
import re
import yaml
from pathlib import Path

def extract_description_from_content(content):
    """Extract a meaningful description from the agent's content."""
    # Look for the first sentence after the frontmatter that describes the agent
    # Remove frontmatter first
    parts = content.split('---', 2)
    if len(parts) < 3:
        return None
    
    main_content = parts[2].strip()
    
    # Look for patterns like "You are a..." or "Specialist in..." etc.
    patterns = [
        r'You are (?:an? )?([^.\n]+)\.',
        r'Specializing in ([^.\n]+)\.',
        r'([^.\n]*specialist[^.\n]*)\.',
        r'([^.\n]*expert[^.\n]*)\.',
        r'([^.\n]*architect[^.\n]*)\.',
        r'# ([^\n]+)',  # Title
    ]
    
    for pattern in patterns:
        match = re.search(pattern, main_content, re.IGNORECASE | re.MULTILINE)
        if match:
            desc = match.group(1).strip()
            # Clean up and format
            desc = re.sub(r'\*\*', '', desc)  # Remove bold markers
            desc = re.sub(r'```\s*', '', desc)  # Remove code blocks
            desc = desc.strip()
            if len(desc) > 10:  # Make sure it's meaningful
                return desc
    
    return None

def fix_agent_file(file_path, filename):
    """Add description field to an agent file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if file has frontmatter
        if not content.startswith('---'):
            print(f"  {filename}: No frontmatter - skipping")
            return False
        
        # Parse frontmatter
        parts = content.split('---', 2)
        if len(parts) < 3:
            print(f"  {filename}: Invalid frontmatter - skipping")
            return False
        
        frontmatter_str = parts[1].strip()
        main_content = parts[2]
        
        # Parse existing frontmatter
        try:
            data = yaml.safe_load(frontmatter_str) or {}
        except:
            data = {}
        
        # Skip if description already exists
        if 'description' in data and data['description']:
            print(f"  {filename}: Already has description - skipping")
            return True
        
        # Extract description from content
        description = extract_description_from_content(content)
        
        # If no description found, use filename-based fallback
        if not description:
            # Create description from filename
            name = filename.replace('.md', '').replace('-', ' ').title()
            description = f"Specialized agent for {name} tasks and operations"
        
        # Add description to frontmatter
        data['description'] = description
        
        # Convert back to YAML
        new_frontmatter = yaml.dump(data, default_flow_style=False, sort_keys=False)
        
        # Reconstruct file
        new_content = f"---\n{new_frontmatter}---\n\n{main_content}"
        
        # Write back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"  ✓ {filename}: Added description - '{description}'")
        return True
        
    except Exception as e:
        print(f"  ✗ {filename}: Error - {e}")
        return False

def main():
    """Main function to fix all agent files."""
    base_path = Path("/Users/lorenzorasmussen/.config/opencode/agent")
    
    # List of files that need fixing (from validation output)
    files_to_fix = [
        "debug.md",
        "backend-architect.md", 
        "code-reviewer.md",
        "mcp.md",
        "context.md",
        "structure-analyst.md",
        "lint.md",
        "opencode-specialist.md",
        "plan-subagent.md",
        "tests.md",
        "review-changes.md",
        "clean.md",
        "config.md",
        "prompter.md",
        "Dashboard-architect.md",
        "refactor.md",
        "analyze-coverage.md",
        "hello.md",
        "hooks.md",
        "ui-designer.md",
        "refactor-planner.md",
        "security-analyst.md",
        "review.md",
        "test.md",
        "project-architect.md",
        "spec-kit.md"
    ]
    
    print(f"Fixing {len(files_to_fix)} agent files...")
    
    success_count = 0
    for filename in files_to_fix:
        file_path = base_path / filename
        if file_path.exists():
            if fix_agent_file(file_path, filename):
                success_count += 1
        else:
            print(f"  ✗ {filename}: File not found")
    
    print(f"\nCompleted: {success_count}/{len(files_to_fix)} files fixed")
    return success_count == len(files_to_fix)

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)