#!/usr/bin/env node

/**
 * MCP Documentation Health Dashboard
 * 
 * This script generates and displays documentation health metrics including
 * coverage, freshness, drift detection, and overall quality scores.
 */

import fs from 'fs';
import path from 'path';

class DocumentationHealthMonitor {
  constructor(repositoryPath = process.cwd()) {
    this.repositoryPath = repositoryPath;
    this.metrics = {
      coverage: 0,
      freshness: 0,
      drift: 0,
      quality: 0,
      overall: 0
    };
    this.details = {
      components: [],
      specifications: [],
      issues: []
    };
  }

  /**
   * Calculate documentation coverage metrics
   */
  async calculateCoverage() {
    console.log('📊 Calculating documentation coverage...');
    
    const components = this.discoverComponents();
    let documentedCount = 0;
    
    for (const component of components) {
      const isDocumented = await this.checkComponentDocumentation(component);
      component.documented = isDocumented;
      
      if (isDocumented) {
        documentedCount++;
      }
    }
    
    this.metrics.coverage = components.length > 0 
      ? Math.round((documentedCount / components.length) * 100)
      : 0;
    
    this.details.components = components;
    
    console.log(`📈 Coverage: ${documentedCount}/${components.length} components documented (${this.metrics.coverage}%)`);
  }

  /**
   * Discover all components that should be documented
   */
  discoverComponents() {
    const components = [];
    
    // API endpoints
    const apiFiles = this.findFiles(['src/api/', 'routes/', 'app.py'], ['.js', '.ts', '.py']);
    apiFiles.forEach(file => {
      components.push({
        type: 'api',
        path: file,
        name: path.basename(file, path.extname(file))
      });
    });
    
    // Database models
    const modelFiles = this.findFiles(['src/models/', 'models/'], ['.js', '.ts', '.py']);
    modelFiles.forEach(file => {
      components.push({
        type: 'database',
        path: file,
        name: path.basename(file, path.extname(file))
      });
    });
    
    // Services/Utilities
    const serviceFiles = this.findFiles(['src/services/', 'services/', 'lib/'], ['.js', '.ts', '.py']);
    serviceFiles.forEach(file => {
      components.push({
        type: 'service',
        path: file,
        name: path.basename(file, path.extname(file))
      });
    });
    
    return components;
  }

  /**
   * Find files matching patterns in specified directories
   */
  findFiles(directories, extensions) {
    const files = [];
    
    for (const dir of directories) {
      const fullPath = path.join(this.repositoryPath, dir);
      if (fs.existsSync(fullPath)) {
        const dirFiles = this.getAllFiles(fullPath, extensions);
        files.push(...dirFiles);
      }
    }
    
    return files;
  }

  /**
   * Recursively get all files with specified extensions
   */
  getAllFiles(dir, extensions, fileList = []) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.getAllFiles(fullPath, extensions, fileList);
      } else if (extensions.some(ext => item.endsWith(ext))) {
        fileList.push(fullPath.replace(this.repositoryPath + '/', ''));
      }
    }
    
    return fileList;
  }

  /**
   * Check if a component has documentation
   */
  async checkComponentDocumentation(component) {
    const docPaths = [
      `docs/${component.type}s/${component.name}.md`,
      `docs/api/${component.name}.md`,
      `docs/${component.name}.md`,
      `${component.path}.md`
    ];
    
    for (const docPath of docPaths) {
      if (fs.existsSync(path.join(this.repositoryPath, docPath))) {
        return true;
      }
    }
    
    // Check for inline documentation
    const filePath = path.join(this.repositoryPath, component.path);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasComments = /\/\*\*[\s\S]*?\*\/|"""[\s\S]*?"""|#[\s\S]*?Example/m.test(content);
      return hasComments;
    }
    
    return false;
  }

  /**
   * Calculate documentation freshness metrics
   */
  async calculateFreshness() {
    console.log('🕒 Calculating documentation freshness...');
    
    const docFiles = this.findFiles(['docs/'], ['.md', '.txt']);
    const now = new Date();
    let totalAge = 0;
    let staleCount = 0;
    
    for (const docFile of docFiles) {
      const filePath = path.join(this.repositoryPath, docFile);
      const stats = fs.statSync(filePath);
      const ageInDays = (now - stats.mtime) / (1000 * 60 * 60 * 24);
      
      totalAge += ageInDays;
      
      if (ageInDays > 30) {
        staleCount++;
        this.details.issues.push({
          type: 'stale_documentation',
          file: docFile,
          age: Math.round(ageInDays)
        });
      }
    }
    
    const averageAge = docFiles.length > 0 ? totalAge / docFiles.length : 0;
    this.metrics.freshness = Math.max(0, Math.round(100 - (averageAge / 30) * 100));
    
    console.log(`📅 Freshness: Average ${Math.round(averageAge)} days old, ${staleCount} stale files`);
  }

  /**
   * Detect documentation drift
   */
  async calculateDrift() {
    console.log('🔍 Detecting documentation drift...');
    
    const driftIssues = await this.detectDrift();
    this.metrics.drift = Math.max(0, 100 - (driftIssues.length * 10));
    this.details.issues.push(...driftIssues);
    
    console.log(`⚠️ Drift: ${driftIssues.length} issues detected`);
  }

  /**
   * Detect specific drift issues
   */
  async detectDrift() {
    const issues = [];
    
    // Check for undocumented API endpoints
    const apiEndpoints = this.extractAPIEndpoints();
    const documentedEndpoints = this.extractDocumentedAPIs();
    
    for (const endpoint of apiEndpoints) {
      if (!documentedEndpoints.includes(endpoint)) {
        issues.push({
          type: 'undocumented_api',
          endpoint: endpoint,
          severity: 'high'
        });
      }
    }
    
    // Check for outdated specifications
    const specs = this.loadSpecifications();
    for (const spec of specs) {
      const isOutdated = await this.checkSpecificationFreshness(spec);
      if (isOutdated) {
        issues.push({
          type: 'outdated_specification',
          spec: spec.id,
          severity: 'medium'
        });
      }
    }
    
    return issues;
  }

  /**
   * Extract API endpoints from code
   */
  extractAPIEndpoints() {
    const endpoints = [];
    const apiFiles = this.findFiles(['src/api/', 'routes/', 'app.py'], ['.js', '.ts', '.py']);
    
    for (const file of apiFiles) {
      const filePath = path.join(this.repositoryPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Match Express.js routes
      const expressMatches = content.match(/router?\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g);
      if (expressMatches) {
        expressMatches.forEach(match => {
          const method = match.match(/\.(get|post|put|delete|patch)/)[1].toUpperCase();
          const path = match.match(/['"`]([^'"`]+)['"`]/)[1];
          endpoints.push(`${method} ${path}`);
        });
      }
      
      // Match Flask routes
      const flaskMatches = content.match(/@app\.route\s*\(\s*['"`]([^'"`]+)['"`][^)]*\)/g);
      if (flaskMatches) {
        flaskMatches.forEach(match => {
          const path = match.match(/['"`]([^'"`]+)['"`]/)[1];
          endpoints.push(`GET ${path}`);
        });
      }
    }
    
    return endpoints;
  }

  /**
   * Extract documented APIs from documentation
   */
  extractDocumentedAPIs() {
    const documented = [];
    const docFiles = this.findFiles(['docs/'], ['.md']);
    
    for (const file of docFiles) {
      const filePath = path.join(this.repositoryPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Match API documentation patterns
      const matches = content.match(/###?\s*(GET|POST|PUT|DELETE|PATCH)\s+([^\n]+)/gi);
      if (matches) {
        matches.forEach(match => {
          const parts = match.trim().split(/\s+/);
          if (parts.length >= 2) {
            documented.push(`${parts[0]} ${parts.slice(1).join(' ')}`);
          }
        });
      }
    }
    
    return documented;
  }

  /**
   * Load all specifications
   */
  loadSpecifications() {
    const specs = [];
    const specsDir = path.join(this.repositoryPath, 'specs');
    
    if (fs.existsSync(specsDir)) {
      const specDirs = fs.readdirSync(specsDir);
      
      for (const specDir of specDirs) {
        const specPath = path.join(specsDir, specDir);
        const stat = fs.statSync(specPath);
        
        if (stat.isDirectory()) {
          const specFile = path.join(specPath, 'spec.md');
          if (fs.existsSync(specFile)) {
            const content = fs.readFileSync(specFile, 'utf8');
            const id = specDir.match(/^\d+/)?.[0] || specDir;
            
            specs.push({
              id: id,
              path: specFile,
              content: content,
              lastModified: stat.mtime
            });
          }
        }
      }
    }
    
    return specs;
  }

  /**
   * Check if a specification is outdated
   */
  async checkSpecificationFreshness(spec) {
    const specContent = fs.readFileSync(spec.path, 'utf8');
    const lastUpdated = this.extractLastUpdated(specContent);
    
    if (!lastUpdated) return true;
    
    const lastUpdateDate = new Date(lastUpdated);
    const now = new Date();
    const daysSinceUpdate = (now - lastUpdateDate) / (1000 * 60 * 60 * 24);
    
    return daysSinceUpdate > 14; // Consider specs older than 14 days as potentially outdated
  }

  /**
   * Extract last updated date from specification
   */
  extractLastUpdated(content) {
    const match = content.match(/\*\*Last Updated\*\*:\s*(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }

  /**
   * Calculate overall quality score
   */
  async calculateQuality() {
    console.log('🎯 Calculating documentation quality...');
    
    let qualityScore = 100;
    
    // Check for broken links
    const brokenLinks = await this.checkLinks();
    qualityScore -= brokenLinks.length * 5;
    
    // Check for spelling errors (simplified)
    const spellingErrors = await this.checkSpelling();
    qualityScore -= spellingErrors.length * 2;
    
    // Check for formatting consistency
    const formatIssues = await this.checkFormatting();
    qualityScore -= formatIssues.length * 3;
    
    this.metrics.quality = Math.max(0, qualityScore);
    
    console.log(`✨ Quality: ${brokenLinks.length} broken links, ${spellingErrors.length} spelling errors, ${formatIssues.length} format issues`);
  }

  /**
   * Check for broken links in documentation
   */
  async checkLinks() {
    const brokenLinks = [];
    const docFiles = this.findFiles(['docs/'], ['.md']);
    
    for (const file of docFiles) {
      const filePath = path.join(this.repositoryPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract markdown links
      const linkMatches = content.match(/\[([^\]]+)\]\(([^)]+)\)/g);
      if (linkMatches) {
        for (const link of linkMatches) {
          const url = link.match(/\(([^)]+)\)/)[1];
          
          // Check internal links
          if (!url.startsWith('http')) {
            const linkPath = path.resolve(path.dirname(filePath), url);
            if (!fs.existsSync(linkPath)) {
              brokenLinks.push({ file: file, link: url });
            }
          }
        }
      }
    }
    
    return brokenLinks;
  }

  /**
   * Check for spelling errors (simplified implementation)
   */
  async checkSpelling() {
    // This is a simplified implementation
    // In a real system, you'd use a proper spell-checking library
    return [];
  }

  /**
   * Check formatting consistency
   */
  async checkFormatting() {
    const issues = [];
    const docFiles = this.findFiles(['docs/'], ['.md']);
    
    for (const file of docFiles) {
      const filePath = path.join(this.repositoryPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for trailing whitespace
      if (/\s+$/m.test(content)) {
        issues.push({ file: file, issue: 'trailing_whitespace' });
      }
      
      // Check for inconsistent heading levels
      const lines = content.split('\n');
      let lastLevel = 0;
      
      for (const line of lines) {
        const match = line.match(/^(#{1,6})\s/);
        if (match) {
          const level = match[1].length;
          if (level > lastLevel + 1) {
            issues.push({ file: file, issue: 'heading_skip' });
          }
          lastLevel = level;
        }
      }
    }
    
    return issues;
  }

  /**
   * Calculate overall health score
   */
  calculateOverall() {
    const weights = {
      coverage: 0.3,
      freshness: 0.25,
      drift: 0.25,
      quality: 0.2
    };
    
    this.metrics.overall = Math.round(
      this.metrics.coverage * weights.coverage +
      this.metrics.freshness * weights.freshness +
      this.metrics.drift * weights.drift +
      this.metrics.quality * weights.quality
    );
  }

  /**
   * Generate health report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MCP DOCUMENTATION HEALTH REPORT');
    console.log('='.repeat(60));
    
    console.log('\n📈 METRICS:');
    console.log(`Coverage:   ${this.metrics.coverage}%`);
    console.log(`Freshness:  ${this.metrics.freshness}%`);
    console.log(`Drift:      ${this.metrics.drift}%`);
    console.log(`Quality:    ${this.metrics.quality}%`);
    console.log(`Overall:    ${this.metrics.overall}%`);
    
    // Health status
    let status = '🟢 EXCELLENT';
    if (this.metrics.overall < 80) status = '🟡 GOOD';
    if (this.metrics.overall < 70) status = '🟠 FAIR';
    if (this.metrics.overall < 60) status = '🔴 POOR';
    
    console.log(`\nStatus: ${status}`);
    
    // Component breakdown
    console.log('\n📋 COMPONENTS:');
    const documented = this.details.components.filter(c => c.documented).length;
    const total = this.details.components.length;
    console.log(`Documented: ${documented}/${total} components`);
    
    const byType = {};
    this.details.components.forEach(comp => {
      byType[comp.type] = (byType[comp.type] || 0) + 1;
    });
    
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} components`);
    });
    
    // Issues
    if (this.details.issues.length > 0) {
      console.log('\n⚠️ ISSUES:');
      const issuesByType = {};
      
      this.details.issues.forEach(issue => {
        issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
      });
      
      Object.entries(issuesByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} occurrences`);
      });
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (this.metrics.coverage < 80) {
      console.log('  • Increase documentation coverage for undocumented components');
    }
    if (this.metrics.freshness < 80) {
      console.log('  • Update stale documentation files');
    }
    if (this.metrics.drift < 80) {
      console.log('  • Address documentation drift and sync with code changes');
    }
    if (this.metrics.quality < 80) {
      console.log('  • Fix broken links and formatting issues');
    }
    
    console.log('\n' + '='.repeat(60));
  }

  /**
   * Run complete health analysis
   */
  async run() {
    console.log('🏥 Starting MCP Documentation Health Analysis...\n');
    
    await this.calculateCoverage();
    await this.calculateFreshness();
    await this.calculateDrift();
    await this.calculateQuality();
    this.calculateOverall();
    
    this.generateReport();
    
    return this.metrics;
  }
}

// CLI interface
const monitor = new DocumentationHealthMonitor();
monitor.run().catch(console.error);

export default DocumentationHealthMonitor;