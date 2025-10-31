import fs from 'fs';
import path from 'path';

// Configuration
const AGENT_DIR = '/Users/lorenzorasmussen/.config/opencode/agent';
const COMMAND_DIR = '/Users/lorenzorasmussen/.config/opencode/command';

// Validation results
let validationResults = {
  agentFiles: { valid: 0, invalid: 0, errors: [] },
  commandFiles: { valid: 0, invalid: 0, errors: [] },
  fixed: 0,
};

function validateAndFixQuotes(content) {
  // Fix truncated quotes in YAML
  let fixed = content;

  // Fix description quotes
  fixed = fixed.replace(/^description: "([^"]*)$/gm, 'description: "$1"');
  fixed = fixed.replace(/^description: "([^"]*)\n([^"]*)$/gm, (match, p1, p2) => {
    if (
      p2.trim() &&
      !p2.startsWith('mode:') &&
      !p2.startsWith('tools:') &&
      !p2.startsWith('permission:')
    ) {
      return `description: "${p1} ${p2}"`;
    }
    return match;
  });

  // Fix permission quotes
  fixed = fixed.replace(/^  (edit|webfetch|bash): "([^"]*)$/gm, '  $1: "$2"');

  return fixed;
}

function validateAgentFrontmatter(lines, filename) {
  const errors = [];
  let hasDescription = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('description:')) {
      hasDescription = true;
      if (!trimmed.includes('"') && !trimmed.includes("'")) {
        errors.push(`Description should be quoted in ${filename}`);
      }
    }

    if (trimmed.startsWith('mode:')) {
      const modeValue = trimmed.split(':')[1]?.trim();
      if (['primary', 'subagent', 'all'].includes(modeValue)) {
        hasValidMode = true;
      } else {
        errors.push(`Invalid mode '${modeValue}' in ${filename}`);
      }
    }

    // Check for forbidden fields
    if (trimmed.startsWith('model:')) {
      errors.push(`Model field found in ${filename}`);
    }

    if (trimmed.startsWith('permissions:')) {
      errors.push(`Permissions (plural) field found in ${filename}, should be permission`);
    }
  }

  if (!hasDescription) {
    errors.push(`Missing description in ${filename}`);
  }

  return errors;
}

function validateCommandFrontmatter(lines, filename) {
  const errors = [];
  let hasDescription = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('description:')) {
      hasDescription = true;
      if (!trimmed.includes('"') && !trimmed.includes("'")) {
        errors.push(`Description should be quoted in ${filename}`);
      }
    }

    // Check for forbidden fields
    if (trimmed.startsWith('model:')) {
      errors.push(`Model field found in ${filename}`);
    }

    if (
      trimmed.startsWith('permissions:') ||
      trimmed.startsWith('temperature:') ||
      trimmed.startsWith('tools:')
    ) {
      errors.push(`Invalid field '${trimmed.split(':')[0]}' found in ${filename}`);
    }

    if (trimmed.startsWith('subagent:')) {
      errors.push(`Should use 'subtask' instead of 'subagent' in ${filename}`);
    }
  }

  if (!hasDescription) {
    errors.push(`Missing description in ${filename}`);
  }

  return errors;
}

function validateAndFixFile(filePath, type) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix quote issues first
    const originalContent = content;
    content = validateAndFixQuotes(content);

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      validationResults.fixed++;
    }

    // Parse frontmatter
    const lines = content.split('\n');
    const frontmatterStart = lines.findIndex(line => line.trim() === '---');
    const frontmatterEnd = lines.findIndex(
      (line, index) => index > frontmatterStart && line.trim() === '---'
    );

    if (frontmatterStart === -1 || frontmatterEnd === -1) {
      const error = `No valid frontmatter found in ${path.basename(filePath)}`;
      if (type === 'agent') {
        validationResults.agentFiles.errors.push(error);
        validationResults.agentFiles.invalid++;
      } else {
        validationResults.commandFiles.errors.push(error);
        validationResults.commandFiles.invalid++;
      }
      return;
    }

    const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
    const errors =
      type === 'agent'
        ? validateAgentFrontmatter(frontmatterLines, path.basename(filePath))
        : validateCommandFrontmatter(frontmatterLines, path.basename(filePath));

    if (errors.length === 0) {
      if (type === 'agent') {
        validationResults.agentFiles.valid++;
      } else {
        validationResults.commandFiles.valid++;
      }
    } else {
      if (type === 'agent') {
        validationResults.agentFiles.invalid++;
        validationResults.agentFiles.errors.push(...errors);
      } else {
        validationResults.commandFiles.invalid++;
        validationResults.commandFiles.errors.push(...errors);
      }
    }
  } catch (error) {
    console.error(`Error validating ${filePath}:`, error.message);
  }
}

function main() {
  console.log('Validating YAML headers against OpenCode standards...');
  console.log('');

  // Validate agent files
  console.log('Validating agent files...');
  const agentFiles = fs.readdirSync(AGENT_DIR).filter(f => f.endsWith('.md'));
  for (const file of agentFiles) {
    validateAndFixFile(path.join(AGENT_DIR, file), 'agent');
  }

  console.log('');
  console.log('Validating command files...');
  const commandFiles = fs.readdirSync(COMMAND_DIR).filter(f => f.endsWith('.md'));
  for (const file of commandFiles) {
    validateAndFixFile(path.join(COMMAND_DIR, file), 'command');
  }

  console.log('');
  console.log('=== VALIDATION REPORT ===');
  console.log('Agent Files:');
  console.log(`  Valid: ${validationResults.agentFiles.valid}`);
  console.log(`  Invalid: ${validationResults.agentFiles.invalid}`);
  if (validationResults.agentFiles.errors.length > 0) {
    console.log('  Errors:');
    validationResults.agentFiles.errors.forEach(error => console.log(`    - ${error}`));
  }

  console.log('');
  console.log('Command Files:');
  console.log(`  Valid: ${validationResults.commandFiles.valid}`);
  console.log(`  Invalid: ${validationResults.commandFiles.invalid}`);
  if (validationResults.commandFiles.errors.length > 0) {
    console.log('  Errors:');
    validationResults.commandFiles.errors.forEach(error => console.log(`    - ${error}`));
  }

  console.log('');
  console.log(`Files with quote issues fixed: ${validationResults.fixed}`);

  const totalValid = validationResults.agentFiles.valid + validationResults.commandFiles.valid;
  const totalFiles = agentFiles.length + commandFiles.length;
  const successRate = ((totalValid / totalFiles) * 100).toFixed(1);

  console.log('');
  console.log(`Overall Success Rate: ${successRate}% (${totalValid}/${totalFiles} files valid)`);

  if (successRate >= 95) {
    console.log('✅ YAML header validation PASSED - Files meet OpenCode standards!');
  } else {
    console.log('⚠️  YAML header validation needs attention - Some files have issues');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, validationResults };
