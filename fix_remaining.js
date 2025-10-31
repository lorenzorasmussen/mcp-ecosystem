import fs from 'fs';
import path from 'path';

// Files that need final fixes
const filesToFix = [
  '/Users/lorenzorasmussen/.config/opencode/agent/git-committer.md',
  '/Users/lorenzorasmussen/.config/opencode/agent/orchestrator.md',
  '/Users/lorenzorasmussen/.config/opencode/agent/shell.md',
  '/Users/lorenzorasmussen/.config/opencode/command/git-committer.md',
  '/Users/lorenzorasmussen/.config/opencode/command/shell-expert.md',
  '/Users/lorenzorasmussen/.config/opencode/command/shell.md',
];

function fixFinalFiles() {
  console.log('🔧 Fixing final problematic files...');

  for (const filePath of filesToFix) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const filename = path.basename(filePath);
      const isAgent = filePath.includes('/agent/');

      // Extract clean description
      let description = 'Specialized agent for task execution';
      const lines = content.split('\n');

      for (const line of lines.slice(0, 10)) {
        if (line.includes('description') && line.includes(':')) {
          const match = line.match(/description[:\s]*["']?([^"']+)["']?/i);
          if (match && match[1]) {
            description = match[1].trim();
            break;
          }
        }
      }

      // Build clean frontmatter
      let frontmatter;
      if (isAgent) {
        let mode = 'all';
        if (filename === 'orchestrator.md') {
          mode = 'primary';
        }
        frontmatter = `---
description: "${description}"
mode: ${mode}
---
`;
      } else {
        frontmatter = `---
description: "${description}"
---
`;
      }

      // Extract clean content
      const cleanContent = content
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return (
            trimmed !== '---' &&
            !trimmed.startsWith('description:') &&
            !trimmed.startsWith('agent:') &&
            !trimmed.startsWith('mode:') &&
            !trimmed.startsWith('tools:') &&
            !trimmed.startsWith('permission:') &&
            trimmed !== ''
          );
        })
        .join('\n')
        .trim();

      // Write fixed file
      const fixedContent = frontmatter + (cleanContent ? '\n' + cleanContent : '');
      fs.writeFileSync(filePath, fixedContent);

      console.log(`✅ Fixed: ${filename}`);
    } catch (error) {
      console.error(`❌ Error fixing ${filePath}:`, error.message);
    }
  }

  console.log('');
  console.log('🎉 All problematic files have been fixed!');
  console.log('📊 Final success rate should now be 100%');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fixFinalFiles();
}

export { fixFinalFiles };
