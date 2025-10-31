import fs from 'fs';
import path from 'path';

// Configuration
const AGENT_DIR = '/Users/lorenzorasmussen/.config/opencode/agent';
const COMMAND_DIR = '/Users/lorenzorasmussen/.config/opencode/command';

// Counters for reporting
let stats = {
  agentFilesProcessed: 0,
  commandFilesProcessed: 0,
  modelFieldsRemoved: 0,
  modeFieldsFixed: 0,
  permissionFieldsFixed: 0,
  invalidFieldsRemoved: 0,
  corruptedHeadersFixed: 0,
};

// Valid agent modes
const VALID_AGENT_MODES = ['primary', 'subagent', 'all'];

// Valid agent tools
const VALID_AGENT_TOOLS = [
  'write',
  'edit',
  'bash',
  'webfetch',
  'read',
  'list',
  'search',
  'grep',
  'glob',
  'todoread',
  'todowrite',
];

function parseFrontmatter(content) {
  const lines = content.split('\n');
  const frontmatterStart = lines.findIndex(line => line.trim() === '---');
  const frontmatterEnd = lines.findIndex(
    (line, index) => index > frontmatterStart && line.trim() === '---'
  );

  if (frontmatterStart === -1 || frontmatterEnd === -1) {
    return { frontmatter: [], contentStart: 0, hasFrontmatter: false };
  }

  return {
    frontmatter: lines.slice(frontmatterStart + 1, frontmatterEnd),
    contentStart: frontmatterEnd + 1,
    hasFrontmatter: true,
  };
}

function fixAgentFrontmatter(lines, filename) {
  const fixedLines = [];
  let changes = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Remove model fields
    if (trimmed.startsWith('model:')) {
      changes.push(`Removed model field from ${filename}`);
      stats.modelFieldsRemoved++;
      continue;
    }

    // Fix permissions to permission
    if (trimmed.startsWith('permissions:')) {
      fixedLines.push(line.replace('permissions:', 'permission:'));
      changes.push(`Fixed permissions->permission in ${filename}`);
      stats.permissionFieldsFixed++;
      continue;
    }

    // Fix mode fields
    if (trimmed.startsWith('mode:')) {
      const modeValue = trimmed.split(':')[1]?.trim();
      if (modeValue && !VALID_AGENT_MODES.includes(modeValue)) {
        fixedLines.push('mode: all  # FIXED from invalid value');
        changes.push(`Fixed invalid mode '${modeValue}' to 'all' in ${filename}`);
        stats.modeFieldsFixed++;
        continue;
      }
    }

    // Remove invalid tools
    if (trimmed.match(/^  [a-zA-Z]+:/)) {
      const toolName = trimmed.split(':')[0].trim();
      if (!VALID_AGENT_TOOLS.includes(toolName)) {
        changes.push(`Removed invalid tool '${toolName}' from ${filename}`);
        stats.invalidFieldsRemoved++;
        continue;
      }
    }

    fixedLines.push(line);
  }

  return { lines: fixedLines, changes };
}

function fixCommandFrontmatter(lines, filename) {
  const fixedLines = [];
  let changes = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Remove model fields
    if (trimmed.startsWith('model:')) {
      changes.push(`Removed model field from ${filename}`);
      stats.modelFieldsRemoved++;
      continue;
    }

    // Fix subagent to subtask
    if (trimmed.startsWith('subagent:')) {
      fixedLines.push(line.replace('subagent:', 'subtask:'));
      changes.push(`Fixed subagent->subtask in ${filename}`);
      continue;
    }

    // Remove invalid fields for commands
    if (
      trimmed.startsWith('permissions:') ||
      trimmed.startsWith('temperature:') ||
      trimmed.startsWith('tools:')
    ) {
      changes.push(`Removed invalid field '${trimmed.split(':')[0]}' from ${filename}`);
      stats.invalidFieldsRemoved++;
      continue;
    }

    fixedLines.push(line);
  }

  return { lines: fixedLines, changes };
}

function fixCorruptedHeader(content) {
  // Fix common corruption patterns
  let fixed = content;

  // Replace --" with ---
  fixed = fixed.replace(/^--"$/gm, '---');
  fixed = fixed.replace(/--"$/gm, '---');

  // Fix truncated lines
  fixed = fixed.replace(/([^\\n])"$/gm, '$1');

  return fixed;
}

function processFile(filePath, type) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix corrupted headers first
    const originalContent = content;
    content = fixCorruptedHeader(content);
    if (content !== originalContent) {
      stats.corruptedHeadersFixed++;
    }

    const { frontmatter, contentStart, hasFrontmatter } = parseFrontmatter(content);

    if (!hasFrontmatter) {
      console.log(`No frontmatter found in ${filePath}`);
      return;
    }

    let result;
    if (type === 'agent') {
      result = fixAgentFrontmatter(frontmatter, path.basename(filePath));
    } else {
      result = fixCommandFrontmatter(frontmatter, path.basename(filePath));
    }

    // Reconstruct file
    const remainingLines = content.split('\n').slice(contentStart);
    const newContent = ['---', ...result.lines, '---', ...remainingLines].join('\n');

    // Write back if changes were made
    if (result.changes.length > 0 || content !== originalContent) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Fixed ${type} file: ${path.basename(filePath)}`);
      result.changes.forEach(change => console.log(`  - ${change}`));
    }

    if (type === 'agent') {
      stats.agentFilesProcessed++;
    } else {
      stats.commandFilesProcessed++;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function main() {
  console.log('Starting comprehensive YAML header fixes...');
  console.log(`Agent directory: ${AGENT_DIR}`);
  console.log(`Command directory: ${COMMAND_DIR}`);
  console.log('');

  // Process agent files
  console.log('Processing agent files...');
  const agentFiles = fs.readdirSync(AGENT_DIR).filter(f => f.endsWith('.md'));
  for (const file of agentFiles) {
    processFile(path.join(AGENT_DIR, file), 'agent');
  }

  console.log('');
  console.log('Processing command files...');
  const commandFiles = fs.readdirSync(COMMAND_DIR).filter(f => f.endsWith('.md'));
  for (const file of commandFiles) {
    processFile(path.join(COMMAND_DIR, file), 'command');
  }

  console.log('');
  console.log('=== COMPREHENSIVE FIX REPORT ===');
  console.log(`Agent files processed: ${stats.agentFilesProcessed}`);
  console.log(`Command files processed: ${stats.commandFilesProcessed}`);
  console.log(`Model fields removed: ${stats.modelFieldsRemoved}`);
  console.log(`Mode fields fixed: ${stats.modeFieldsFixed}`);
  console.log(`Permission fields fixed: ${stats.permissionFieldsFixed}`);
  console.log(`Invalid fields removed: ${stats.invalidFieldsRemoved}`);
  console.log(`Corrupted headers fixed: ${stats.corruptedHeadersFixed}`);
  console.log('');
  console.log('YAML header fixes completed successfully!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, stats };
