#!/usr/bin/env node

/**
 * MCP Documentation Synchronization Engine
 * 
 * This script implements the core synchronization logic for keeping documentation
 * synchronized with code changes through intelligent drift detection and automated updates.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

class DocumentationSyncEngine {
  constructor(options = {}) {
    this.repositoryPath = options.repositoryPath || process.cwd();
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from .specify/config.json or use defaults
   */
  loadConfig() {
    const configPath = path.join(this.repositoryPath, '.specify', 'config.json');
    
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    return {
      sync: {
        enabled: true,
        autoUpdate: true,
        criticalChanges: {
          autoPR: true,
          reviewers: ['documentation-team'],
          labels: ['documentation', 'auto-generated']
        },
        standardChanges: {
          notifyOnly: true,
          slackChannel: '#documentation'
        },
        minorChanges: {
          backgroundUpdate: true
        }
      },
      monitoring: {
        healthCheckInterval: 300000, // 5 minutes
        driftDetection: true,
        metricsRetention: 30 // days
      }
    };
  }

  /**
   * Analyze recent Git changes and classify their impact
   */
  async analyzeChanges() {
    console.log('🔍 Analyzing recent changes...');
    
    try {
      // Get changed files since last documentation update
      const lastDocUpdate = this.getLastDocumentationUpdate();
      const changedFiles = this.getChangedFiles(lastDocUpdate);
      
      console.log(`📊 Found ${changedFiles.length} changed files`);
      
      const changes = {
        critical: [],
        standard: [],
        minor: []
      };
      
      for (const file of changedFiles) {
        const changeType = await this.classifyChange(file);
        changes[changeType].push(file);
      }
      
      return changes;
    } catch (error) {
      console.error('❌ Error analyzing changes:', error.message);
      throw error;
    }
  }

  /**
   * Get the timestamp of the last documentation update
   */
  getLastDocumentationUpdate() {
    try {
      const output = execSync('git log --max-count=1 --format="%ct" -- docs/ .specify/', {
        cwd: this.repositoryPath,
        encoding: 'utf8'
      }).trim();
      
      return new Date(parseInt(output) * 1000);
    } catch (error) {
      // No documentation commits found, use last week as default
      return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get list of files changed since given date
   */
  getChangedFiles(sinceDate) {
    const since = sinceDate.toISOString().split('T')[0];
    const output = execSync(
      `git log --since="${since}" --name-only --pretty="" --diff-filter=ACMRT | sort -u`,
      { cwd: this.repositoryPath, encoding: 'utf8' }
    ).trim();
    
    return output.split('\n').filter(file => 
      file && 
      !file.startsWith('.specify/') && 
      !file.startsWith('docs/') &&
      (file.endsWith('.js') || file.endsWith('.ts') || 
       file.endsWith('.py') || file.endsWith('.md'))
    );
  }

  /**
   * Classify a file change based on its impact
   */
  async classifyChange(filePath) {
    const content = this.getFileContent(filePath);
    
    // Critical changes: API endpoints, public interfaces, breaking changes
    if (this.isCriticalChange(content)) {
      return 'critical';
    }
    
    // Standard changes: New features, internal refactoring
    if (this.isStandardChange(content)) {
      return 'standard';
    }
    
    // Minor changes: Comments, formatting, variable renames
    return 'minor';
  }

  /**
   * Determine if a change is critical
   */
  isCriticalChange(content) {
    const criticalPatterns = [
      /export\s+(async\s+)?function\s+\w+/,
      /export\s+class\s+\w+/,
      /export\s+interface\s+\w+/,
      /export\s+type\s+\w+/,
      /router\.(get|post|put|delete|patch)\s*\(/,
      /app\.(get|post|put|delete|patch)\s*\(/,
      /@app\.route\s*\(/,
      /def\s+(?!_)\w+\s*\([^)]*\)\s*->/,
      /BREAKING CHANGE:/,
      /@deprecated/
    ];
    
    return criticalPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Determine if a change is standard
   */
  isStandardChange(content) {
    const standardPatterns = [
      /function\s+\w+/,
      /class\s+\w+/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /def\s+\w+\s*\(/,
      /import\s+.*from/,
      /require\s*\(/,
      /TODO:/,
      /FIXME:/
    ];
    
    return standardPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Get file content at current HEAD
   */
  getFileContent(filePath) {
    try {
      return execSync(`git show HEAD:${filePath}`, {
        cwd: this.repositoryPath,
        encoding: 'utf8'
      });
    } catch (error) {
      // File might be new, try reading from working directory
      if (fs.existsSync(path.join(this.repositoryPath, filePath))) {
        return fs.readFileSync(path.join(this.repositoryPath, filePath), 'utf8');
      }
      return '';
    }
  }

  /**
   * Process changes and trigger appropriate actions
   */
  async processChanges(changes) {
    console.log('🔄 Processing changes...');
    
    const results = {
      critical: { processed: 0, errors: [] },
      standard: { processed: 0, errors: [] },
      minor: { processed: 0, errors: [] }
    };
    
    // Process critical changes
    for (const file of changes.critical) {
      try {
        await this.processCriticalChange(file);
        results.critical.processed++;
      } catch (error) {
        results.critical.errors.push({ file, error: error.message });
      }
    }
    
    // Process standard changes
    for (const file of changes.standard) {
      try {
        await this.processStandardChange(file);
        results.standard.processed++;
      } catch (error) {
        results.standard.errors.push({ file, error: error.message });
      }
    }
    
    // Process minor changes
    for (const file of changes.minor) {
      try {
        await this.processMinorChange(file);
        results.minor.processed++;
      } catch (error) {
        results.minor.errors.push({ file, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Process a critical change - create PR for documentation update
   */
  async processCriticalChange(filePath) {
    console.log(`🚨 Processing critical change: ${filePath}`);
    
    if (this.dryRun) {
      console.log(`[DRY RUN] Would create PR for ${filePath}`);
      return;
    }
    
    // Create feature branch
    const branchName = `docs/update-${this.sanitizeFileName(filePath)}`;
    execSync(`git checkout -b ${branchName}`, { cwd: this.repositoryPath });
    
    // Update documentation
    await this.updateDocumentationForFile(filePath);
    
    // Commit changes
    execSync('git add .', { cwd: this.repositoryPath });
    execSync(`git commit -m "docs: Update documentation for ${filePath}"`, {
      cwd: this.repositoryPath
    });
    
    // Push and create PR
    execSync(`git push -u origin ${branchName}`, { cwd: this.repositoryPath });
    
    const prTitle = `docs: Update documentation for ${filePath}`;
    const prBody = this.generatePRDescription(filePath);
    
    // Create PR using GitHub CLI
    const prCommand = `gh pr create --title "${prTitle}" --body "${prBody}" --label documentation --label auto-generated`;
    execSync(prCommand, { cwd: this.repositoryPath });
    
    console.log(`✅ Created PR for ${filePath}`);
  }

  /**
   * Process a standard change - notify team
   */
  async processStandardChange(filePath) {
    console.log(`📋 Processing standard change: ${filePath}`);
    
    if (this.config.sync.standardChanges.notifyOnly) {
      await this.notifyTeam(filePath, 'standard');
    } else {
      await this.updateDocumentationForFile(filePath);
    }
  }

  /**
   * Process a minor change - background update
   */
  async processMinorChange(filePath) {
    console.log(`🔧 Processing minor change: ${filePath}`);
    
    if (this.config.sync.minorChanges.backgroundUpdate) {
      await this.updateDocumentationForFile(filePath);
    }
  }

  /**
   * Update documentation for a specific file
   */
  async updateDocumentationForFile(filePath) {
    // This would integrate with the specific documentation update logic
    // For now, we'll just log the action
    console.log(`📝 Updating documentation for ${filePath}`);
    
    // In a real implementation, this would:
    // 1. Identify which specs are affected by the file change
    // 2. Regenerate the relevant documentation sections
    // 3. Update API specs if needed
    // 4. Validate the changes
  }

  /**
   * Notify team about documentation changes
   */
  async notifyTeam(filePath, changeType) {
    const message = `📄 Documentation update needed for ${filePath} (${changeType} change)`;
    console.log(`📢 Notifying team: ${message}`);
    
    // In a real implementation, this would send Slack notifications, emails, etc.
  }

  /**
   * Generate PR description
   */
  generatePRDescription(filePath) {
    return `## Documentation Update

This PR automatically updates documentation to reflect changes in \`${filePath}\`.

### Changes Detected
- File: ${filePath}
- Type: Critical change requiring documentation update
- Impact: Public API or interface modification

### Review Checklist
- [ ] Documentation accurately reflects code changes
- [ ] All examples are tested and working
- [ ] No breaking changes introduced without proper documentation

---
*Auto-generated by MCP Documentation Sync Engine*`;
  }

  /**
   * Sanitize filename for branch naming
   */
  sanitizeFileName(filePath) {
    return filePath
      .replace(/[^a-zA-Z0-9\/]/g, '-')
      .replace(/\/+/g, '-')
      .toLowerCase();
  }

  /**
   * Run the complete synchronization process
   */
  async run() {
    console.log('🚀 Starting MCP Documentation Synchronization...');
    
    try {
      const changes = await this.analyzeChanges();
      console.log(`📈 Changes: ${changes.critical.length} critical, ${changes.standard.length} standard, ${changes.minor.length} minor`);
      
      const results = await this.processChanges(changes);
      
      console.log('\n📊 Results:');
      console.log(`Critical: ${results.critical.processed} processed, ${results.critical.errors.length} errors`);
      console.log(`Standard: ${results.standard.processed} processed, ${results.standard.errors.length} errors`);
      console.log(`Minor: ${results.minor.processed} processed, ${results.minor.errors.length} errors`);
      
      if (results.critical.errors.length > 0) {
        console.log('\n❌ Critical errors:');
        results.critical.errors.forEach(({ file, error }) => {
          console.log(`  ${file}: ${error}`);
        });
      }
      
      console.log('\n✅ Synchronization complete!');
      
    } catch (error) {
      console.error('❌ Synchronization failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI interface
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose')
};

const engine = new DocumentationSyncEngine(options);
engine.run();

export default DocumentationSyncEngine;