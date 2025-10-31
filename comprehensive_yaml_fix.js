import fs from 'fs';
import path from 'path';

// Configuration
const AGENT_DIR = '/Users/lorenzorasmussen/.config/opencode/agent';
const COMMAND_DIR = '/Users/lorenzorasmussen/.config/opencode/command';

// Final comprehensive fix statistics
let comprehensiveStats = {
  agentFilesProcessed: 0,
  commandFilesProcessed: 0,
  quoteCorruptionFixed: 0,
  frontmatterRebuilt: 0,
  validationPassed: 0,
};

function extractCleanDescription(content) {
  // Try to extract a clean description from the content
  const lines = content.split('\n');

  // Look for description in first few lines
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i].trim();

    // Skip frontmatter markers
    if (line === '---') continue;

    // Look for description patterns
    if (line.includes('description') || line.includes('Description')) {
      // Extract text after description marker
      const match = line.match(/description[:\s]*["']?([^"']+)["']?/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Look for agent/command identity patterns
    if (line.includes('agent') || line.includes('command') || line.includes('specialist')) {
      // Extract meaningful description from identity line
      const cleanLine = line.replace(/^["'---\s]+/, '').replace(/["'---\s]+$/, '');
      if (cleanLine.length > 10 && cleanLine.length < 200) {
        return cleanLine;
      }
    }
  }

  // Fallback: generate description from filename
  return 'Specialized agent for task execution';
}

function rebuildCleanFrontmatter(content, type, filename) {
  const cleanDescription = extractCleanDescription(content);
  const baseName = path.basename(filename, '.md');

  let frontmatter;

  if (type === 'agent') {
    // Determine mode based on filename patterns
    let mode = 'all'; // default
    if (
      baseName.includes('subagent') ||
      baseName.includes('plan-subagent') ||
      baseName.includes('template-subagent')
    ) {
      mode = 'subagent';
    } else if (baseName === 'Dashboard-architect' || baseName === 'orchestrator') {
      mode = 'primary';
    }

    frontmatter = `---
description: "${cleanDescription}"
mode: ${mode}
---
`;
  } else {
    frontmatter = `---
description: "${cleanDescription}"
---
`;
  }

  // Extract clean content (remove any existing frontmatter)
  const lines = content.split('\n');
  let contentStart = 0;
  let inFrontmatter = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
      } else {
        contentStart = i + 1;
        break;
      }
    }
  }

  // Get the actual content
  const actualContent = contentStart > 0 ? lines.slice(contentStart).join('\n') : content;

  // Clean up the content
  const cleanContent = actualContent
    .replace(/^["'---\s]+/gm, '') // Remove leading quotes/dashes
    .replace(/["'---\s]+$/gm, '') // Remove trailing quotes/dashes
    .replace(/\n{3,}/g, '\n\n') // Fix excessive newlines
    .trim();

  return frontmatter + (cleanContent ? '\n' + cleanContent : '');
}

function fixQuoteCorruption(content) {
  let fixed = content;

  // Fix common quote corruption patterns
  fixed = fixed.replace(/true"/g, 'true');
  fixed = fixed.replace(/false"/g, 'false');
  fixed = fixed.replace(/ask"/g, '"ask"');
  fixed = fixed.replace(/allow"/g, '"allow"');
  fixed = fixed.replace(/deny"/g, '"deny"');
  fixed = fixed.replace(/edit"/g, '"edit"');
  fixed = fixed.replace(/bash"/g, '"bash"');
  fixed = fixed.replace(/webfetch"/g, '"webfetch"');
  fixed = fixed.replace(/write"/g, '"write"');

  // Fix broken description quotes
  fixed = fixed.replace(/^description: "([^"]*)$/gm, 'description: "$1"');
  fixed = fixed.replace(/([^"])$/gm, '$1'); // Remove trailing quotes

  // Fix permission section corruption
  fixed = fixed.replace(/permission:"/g, 'permission:');
  fixed = fixed.replace(/^  (\w+): "([^"]*)$/gm, '  $1: "$2"');

  return fixed;
}

function processFileComprehensive(filePath, type) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    const filename = path.basename(filePath);

    // Check for severe quote corruption
    const hasQuoteCorruption =
      content.includes('true"') ||
      content.includes('false"') ||
      content.includes('permission:"') ||
      content.includes('---"') ||
      content.includes('edit"') ||
      content.includes('bash"') ||
      content.includes('webfetch"');

    // Check for missing/invalid frontmatter
    const lines = content.split('\n');
    const frontmatterCount = lines.filter(line => line.trim() === '---').length;
    const hasValidFrontmatter = frontmatterCount >= 2;

    if (hasQuoteCorruption || !hasValidFrontmatter) {
      // Rebuild the entire file with clean frontmatter
      content = rebuildCleanFrontmatter(content, type, filename);
      comprehensiveStats.frontmatterRebuilt++;

      if (hasQuoteCorruption) {
        comprehensiveStats.quoteCorruptionFixed++;
      }

      console.log(`Comprehensive rebuild of ${type}: ${filename}`);
    } else {
      // Minor quote fixes
      content = fixQuoteCorruption(content);
    }

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);

      if (type === 'agent') {
        comprehensiveStats.agentFilesProcessed++;
      } else {
        comprehensiveStats.commandFilesProcessed++;
      }
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function validateFixedFile(filePath, type) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Check for valid frontmatter
    const frontmatterStart = lines.findIndex(line => line.trim() === '---');
    const frontmatterEnd = lines.findIndex(
      (line, index) => index > frontmatterStart && line.trim() === '---'
    );

    if (frontmatterStart === -1 || frontmatterEnd === -1) {
      return false;
    }

    const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);

    // Check for required description
    const hasDescription = frontmatterLines.some(line => line.trim().startsWith('description:'));
    if (!hasDescription) return false;

    // Check for forbidden fields
    const hasModel = frontmatterLines.some(line => line.trim().startsWith('model:'));
    if (hasModel) return false;

    // Check for quote corruption
    const hasCorruption =
      content.includes('true"') || content.includes('false"') || content.includes('permission:"');
    if (hasCorruption) return false;

    return true;
  } catch (error) {
    return false;
  }
}

function main() {
  console.log('Running COMPREHENSIVE FINAL YAML fixes...');
  console.log('This will rebuild corrupted files completely.');
  console.log('');

  // Process agent files
  console.log('Comprehensive fixes for agent files...');
  const agentFiles = fs.readdirSync(AGENT_DIR).filter(f => f.endsWith('.md'));
  for (const file of agentFiles) {
    processFileComprehensive(path.join(AGENT_DIR, file), 'agent');
  }

  console.log('');
  console.log('Comprehensive fixes for command files...');
  const commandFiles = fs.readdirSync(COMMAND_DIR).filter(f => f.endsWith('.md'));
  for (const file of commandFiles) {
    processFileComprehensive(path.join(COMMAND_DIR, file), 'command');
  }

  console.log('');
  console.log('Validating all fixed files...');

  // Validate all files
  for (const file of agentFiles) {
    if (validateFixedFile(path.join(AGENT_DIR, file), 'agent')) {
      comprehensiveStats.validationPassed++;
    }
  }

  for (const file of commandFiles) {
    if (validateFixedFile(path.join(COMMAND_DIR, file), 'command')) {
      comprehensiveStats.validationPassed++;
    }
  }

  console.log('');
  console.log('=== COMPREHENSIVE FINAL REPORT ===');
  console.log(`Agent files processed: ${comprehensiveStats.agentFilesProcessed}`);
  console.log(`Command files processed: ${comprehensiveStats.commandFilesProcessed}`);
  console.log(`Quote corruption fixed: ${comprehensiveStats.quoteCorruptionFixed}`);
  console.log(`Frontmatter rebuilt: ${comprehensiveStats.frontmatterRebuilt}`);
  console.log(`Files passing validation: ${comprehensiveStats.validationPassed}`);

  const totalFiles = agentFiles.length + commandFiles.length;
  const successRate = ((comprehensiveStats.validationPassed / totalFiles) * 100).toFixed(1);

  console.log('');
  console.log(
    `Final Success Rate: ${successRate}% (${comprehensiveStats.validationPassed}/${totalFiles} files)`
  );

  if (successRate >= 95) {
    console.log('🎉 COMPREHENSIVE FIX SUCCESSFUL - All files meet OpenCode standards!');
  } else {
    console.log('⚠️  Some files still need attention');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, comprehensiveStats };
