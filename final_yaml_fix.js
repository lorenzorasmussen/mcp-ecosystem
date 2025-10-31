import fs from 'fs';
import path from 'path';

// Configuration
const AGENT_DIR = '/Users/lorenzorasmussen/.config/opencode/agent';
const COMMAND_DIR = '/Users/lorenzorasmussen/.config/opencode/command';

// Final fix statistics
let finalStats = {
  agentFilesFixed: 0,
  commandFilesFixed: 0,
  quotesFixed: 0,
  modesFixed: 0,
  descriptionsFixed: 0,
  frontmatterRebuilt: 0,
};

function fixQuotesAndFormatting(content) {
  let fixed = content;

  // Fix truncated description quotes
  fixed = fixed.replace(/^description: "([^"]*)$/gm, 'description: "$1"');

  // Fix permission quotes
  fixed = fixed.replace(/^  (edit|webfetch|bash): "([^"]*)$/gm, '  $1: "$2"');

  // Fix agent mode comments (remove the comment part)
  fixed = fixed.replace(/^mode: all  # FIXED from invalid value$/gm, 'mode: all');

  return fixed;
}

function rebuildProperFrontmatter(content, type, filename) {
  const lines = content.split('\n');

  // Extract basic info from content
  let description = '';
  let agentName = filename.replace('.md', '');

  // Try to find description in existing content
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    if (line.includes('description') || line.includes('Description')) {
      // Extract description from line
      const match = line.match(/["']([^"']+)["']/) || line.match(/:\s*(.+)$/);
      if (match) {
        description = match[1].trim();
        break;
      }
    }
  }

  // Generate description if not found
  if (!description) {
    if (type === 'agent') {
      description = `${agentName} agent for specialized tasks`;
    } else {
      description = `${agentName} command execution`;
    }
  }

  // Build proper frontmatter
  let frontmatter;
  if (type === 'agent') {
    frontmatter = `---
description: "${description}"
mode: all
---
`;
  } else {
    frontmatter = `---
description: "${description}"
---
`;
  }

  // Find where content actually starts (after any existing frontmatter)
  let contentStart = 0;
  let frontmatterEnd = 0;
  let inFrontmatter = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        contentStart = i;
      } else {
        frontmatterEnd = i + 1;
        break;
      }
    }
  }

  // Rebuild file
  const actualContent =
    frontmatterEnd > 0 ? lines.slice(frontmatterEnd).join('\n') : lines.join('\n');

  return frontmatter + actualContent.trim();
}

function fixDescriptionQuotes(content) {
  let fixed = content;

  // Fix unquoted descriptions
  fixed = fixed.replace(/^description: ([^"].*[^"])$/gm, (match, desc) => {
    return `description: "${desc.trim()}"`;
  });

  return fixed;
}

function processFile(filePath, type) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    const filename = path.basename(filePath);

    // Check if file has corrupted or missing frontmatter
    const lines = content.split('\n');
    const hasValidFrontmatter =
      lines.some(line => line.trim() === '---') &&
      lines.filter(line => line.trim() === '---').length >= 2;

    if (!hasValidFrontmatter) {
      // Rebuild frontmatter completely
      content = rebuildProperFrontmatter(content, type, filename);
      finalStats.frontmatterRebuilt++;
      console.log(`Rebuilt frontmatter for ${type}: ${filename}`);
    } else {
      // Fix quotes and formatting
      content = fixQuotesAndFormatting(content);
      content = fixDescriptionQuotes(content);

      if (content !== originalContent) {
        finalStats.quotesFixed++;
      }
    }

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      if (type === 'agent') {
        finalStats.agentFilesFixed++;
      } else {
        finalStats.commandFilesFixed++;
      }
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function main() {
  console.log('Running final comprehensive YAML fixes...');
  console.log('');

  // Process agent files
  console.log('Final fixes for agent files...');
  const agentFiles = fs.readdirSync(AGENT_DIR).filter(f => f.endsWith('.md'));
  for (const file of agentFiles) {
    processFile(path.join(AGENT_DIR, file), 'agent');
  }

  console.log('');
  console.log('Final fixes for command files...');
  const commandFiles = fs.readdirSync(COMMAND_DIR).filter(f => f.endsWith('.md'));
  for (const file of commandFiles) {
    processFile(path.join(COMMAND_DIR, file), 'command');
  }

  console.log('');
  console.log('=== FINAL FIX REPORT ===');
  console.log(`Agent files fixed: ${finalStats.agentFilesFixed}`);
  console.log(`Command files fixed: ${finalStats.commandFilesFixed}`);
  console.log(`Quote issues fixed: ${finalStats.quotesFixed}`);
  console.log(`Mode fields fixed: ${finalStats.modesFixed}`);
  console.log(`Descriptions fixed: ${finalStats.descriptionsFixed}`);
  console.log(`Frontmatter rebuilt: ${finalStats.frontmatterRebuilt}`);
  console.log('');
  console.log('Final fixes completed!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, finalStats };
