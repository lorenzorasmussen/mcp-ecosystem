import fs from 'fs';
import path from 'path';

// Files that need final cleanup
const filesToFix = [
  '/Users/lorenzorasmussen/.config/opencode/agent/git-committer.md',
  '/Users/lorenzorasmussen/.config/opencode/agent/orchestrator.md',
  '/Users/lorenzorasmussen/.config/opencode/agent/shell.md',
  '/Users/lorenzorasmussen/.config/opencode/command/git-committer.md',
  '/Users/lorenzorasmussen/.config/opencode/command/shell-expert.md',
  '/Users/lorenzorasmussen/.config/opencode/command/shell.md',
];

function finalCleanup() {
  console.log('🧹 Final cleanup of quote corruption...');

  for (const filePath of filesToFix) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const filename = path.basename(filePath);
      const isAgent = filePath.includes('/agent/');

      // Extract frontmatter
      const lines = content.split('\n');
      const frontmatterStart = lines.findIndex(line => line.trim() === '---');
      const frontmatterEnd = lines.findIndex(
        (line, index) => index > frontmatterStart && line.trim() === '---'
      );

      if (frontmatterStart === -1 || frontmatterEnd === -1) {
        console.log(`❌ No valid frontmatter in ${filename}`);
        continue;
      }

      const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
      const contentLines = lines.slice(frontmatterEnd + 1);

      // Clean up content - remove all quote corruption
      const cleanContent = contentLines
        .map(line => line.trim())
        .filter(line => {
          // Remove corrupted lines
          return line !== '---"' && line !== '"' && !line.startsWith('"') && line.length > 0;
        })
        .join('\n')
        .trim();

      // Rebuild file
      const newContent = [
        '---',
        ...frontmatterLines,
        '---',
        cleanContent ? '\n' + cleanContent : '',
      ].join('\n');

      fs.writeFileSync(filePath, newContent);
      console.log(`✅ Final cleanup: ${filename}`);
    } catch (error) {
      console.error(`❌ Error cleaning ${filePath}:`, error.message);
    }
  }

  console.log('');
  console.log('🎯 Running final validation...');

  // Quick validation
  let allValid = true;
  for (const filePath of filesToFix) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasCorruption = content.includes('---"') || content.includes('"\n"');
    if (hasCorruption) {
      console.log(`❌ Still corrupted: ${path.basename(filePath)}`);
      allValid = false;
    } else {
      console.log(`✅ Clean: ${path.basename(filePath)}`);
    }
  }

  if (allValid) {
    console.log('');
    console.log('🎉 SUCCESS! All files are now clean and compliant!');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  finalCleanup();
}

export { finalCleanup };
