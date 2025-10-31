import fs from 'fs';
import path from 'path';

// Configuration
const COMMAND_DIR = '/Users/lorenzorasmussen/.config/opencode/command';

function cleanCommandFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const filename = path.basename(filePath);

    // Split into lines
    const lines = content.split('\n');

    // Find frontmatter boundaries
    const frontmatterStart = lines.findIndex(line => line.trim() === '---');
    const frontmatterEnd = lines.findIndex(
      (line, index) => index > frontmatterStart && line.trim() === '---'
    );

    if (frontmatterStart === -1 || frontmatterEnd === -1) {
      console.log(`No valid frontmatter in ${filename}`);
      return;
    }

    // Extract frontmatter and content
    const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
    const contentLines = lines.slice(frontmatterEnd + 1);

    // Clean up content - remove duplicate descriptions and malformed lines
    const cleanContent = contentLines
      .filter(line => {
        const trimmed = line.trim();
        // Remove empty lines, duplicate descriptions, and malformed lines
        return (
          trimmed !== '' &&
          !trimmed.startsWith('description:') &&
          !trimmed.startsWith('agent:') &&
          !trimmed.startsWith('---') &&
          !trimmed.startsWith('"') &&
          trimmed.length > 0
        );
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

    // Write back
    fs.writeFileSync(filePath, newContent);
    console.log(`Cleaned command file: ${filename}`);
  } catch (error) {
    console.error(`Error cleaning ${filePath}:`, error.message);
  }
}

function main() {
  console.log('Final cleanup of command files...');

  const commandFiles = fs.readdirSync(COMMAND_DIR).filter(f => f.endsWith('.md'));

  for (const file of commandFiles) {
    cleanCommandFile(path.join(COMMAND_DIR, file));
  }

  console.log('Command file cleanup completed!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
