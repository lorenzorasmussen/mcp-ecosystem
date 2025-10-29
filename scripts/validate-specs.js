#!/usr/bin/env node

/**
 * Specification Validation Script
 * 
 * Validates all specifications in the specs/ directory for completeness,
 * consistency, and adherence to standards.
 */

import fs from 'fs';
import path from 'path';

class SpecificationValidator {
  constructor(repositoryPath = process.cwd()) {
    this.repositoryPath = repositoryPath;
    this.specsDir = path.join(repositoryPath, 'specs');
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate all specifications
   */
  async validateAll() {
    console.log('🔍 Validating specifications...\n');

    if (!fs.existsSync(this.specsDir)) {
      this.errors.push('specs/ directory not found');
      return this.generateReport();
    }

    const specDirs = fs.readdirSync(this.specsDir);
    
    for (const specDir of specDirs) {
      const specPath = path.join(this.specsDir, specDir);
      const stat = fs.statSync(specPath);
      
      if (stat.isDirectory()) {
        await this.validateSpecification(specDir, specPath);
      }
    }

    return this.generateReport();
  }

  /**
   * Validate a single specification
   */
  async validateSpecification(specId, specPath) {
    console.log(`📋 Validating spec: ${specId}`);

    const specFile = path.join(specPath, 'spec.md');
    const planFile = path.join(specPath, 'plan.md');
    const tasksDir = path.join(specPath, 'tasks');

    // Check spec.md exists
    if (!fs.existsSync(specFile)) {
      this.errors.push(`${specId}: spec.md not found`);
      return;
    }

    // Validate spec.md content
    await this.validateSpecFile(specId, specFile);

    // Check plan.md exists
    if (!fs.existsSync(planFile)) {
      this.warnings.push(`${specId}: plan.md not found`);
    } else {
      await this.validatePlanFile(specId, planFile);
    }

    // Check tasks directory
    if (!fs.existsSync(tasksDir)) {
      this.warnings.push(`${specId}: tasks/ directory not found`);
    } else {
      await this.validateTasks(specId, tasksDir);
    }
  }

  /**
   * Validate spec.md content
   */
  async validateSpecFile(specId, specFile) {
    const content = fs.readFileSync(specFile, 'utf8');

    // Check required sections
    const requiredSections = [
      '## Overview',
      '## Goals',
      '## User Stories',
      '## Non-Functional Requirements',
      '## Success Metrics'
    ];

    for (const section of requiredSections) {
      if (!content.includes(section)) {
        this.errors.push(`${specId}: Missing section "${section}" in spec.md`);
      }
    }

    // Validate user stories format
    const userStoryMatches = content.match(/### US-\d+: .+/g);
    if (!userStoryMatches || userStoryMatches.length === 0) {
      this.errors.push(`${specId}: No user stories found in spec.md`);
    }

    // Check for acceptance criteria
    const acceptanceCriteriaMatches = content.match(/Acceptance Criteria:/g);
    if (!acceptanceCriteriaMatches || acceptanceCriteriaMatches.length === 0) {
      this.errors.push(`${specId}: No acceptance criteria found in spec.md`);
    }

    // Check for spec metadata
    if (!content.includes('**Spec ID**:')) {
      this.errors.push(`${specId}: Missing Spec ID in spec.md`);
    }

    if (!content.includes('**Status**:')) {
      this.errors.push(`${specId}: Missing Status in spec.md`);
    }

    // Validate user story format
    if (userStoryMatches) {
      for (const story of userStoryMatches) {
        // Extract the content after the heading
        const storyContent = content.split(story)[1]?.split('\n\n')[0] || '';
        if (!storyContent.includes('As a') || !storyContent.includes('I want') || !storyContent.includes('so that')) {
          this.errors.push(`${specId}: Invalid user story format: ${story}`);
        }
      }
    }
  }

  /**
   * Validate plan.md content
   */
  async validatePlanFile(specId, planFile) {
    const content = fs.readFileSync(planFile, 'utf8');

    // Check required sections
    const requiredSections = [
      '## Architecture',
      '### Components',
      '### Data Model',
      '### API Endpoints',
      '## Implementation Phases'
    ];

    for (const section of requiredSections) {
      if (!content.includes(section)) {
        this.warnings.push(`${specId}: Missing section "${section}" in plan.md`);
      }
    }

    // Check for external dependencies
    if (!content.includes('### External Dependencies')) {
      this.warnings.push(`${specId}: External dependencies not documented in plan.md`);
    }

    // Check for security considerations
    if (!content.includes('### Security Considerations')) {
      this.warnings.push(`${specId}: Security considerations not documented in plan.md`);
    }
  }

  /**
   * Validate tasks
   */
  async validateTasks(specId, tasksDir) {
    const taskFiles = fs.readdirSync(tasksDir);
    
    if (taskFiles.length === 0) {
      this.warnings.push(`${specId}: No task files found in tasks/ directory`);
      return;
    }

    for (const taskFile of taskFiles) {
      if (taskFile.endsWith('.md')) {
        await this.validateTaskFile(specId, path.join(tasksDir, taskFile));
      }
    }
  }

  /**
   * Validate a single task file
   */
  async validateTaskFile(specId, taskFile) {
    const content = fs.readFileSync(taskFile, 'utf8');
    const taskName = path.basename(taskFile, '.md');

    // Check required fields
    const requiredFields = [
      '**ID**:',
      '**Feature**:',
      '**Status**:',
      '**Sprint**:'
    ];

    for (const field of requiredFields) {
      if (!content.includes(field)) {
        this.errors.push(`${specId}: Missing field "${field}" in task ${taskName}`);
      }
    }

    // Check for acceptance criteria
    if (!content.includes('## Acceptance Criteria')) {
      this.errors.push(`${specId}: Missing acceptance criteria in task ${taskName}`);
    }

    // Check for definition of done
    if (!content.includes('## Definition of Done')) {
      this.warnings.push(`${specId}: Missing definition of done in task ${taskName}`);
    }

    // Validate task ID format
    const idMatch = content.match(/\*\*ID\*\*: (\d+-\d+)/);
    if (!idMatch) {
      this.errors.push(`${specId}: Invalid task ID format in task ${taskName}`);
    }

    // Validate acceptance criteria format
    const criteriaMatches = content.match(/- \[ \] .+/g);
    if (!criteriaMatches || criteriaMatches.length === 0) {
      this.errors.push(`${specId}: No properly formatted acceptance criteria in task ${taskName}`);
    }
  }

  /**
   * Generate validation report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SPECIFICATION VALIDATION REPORT');
    console.log('='.repeat(60));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ All specifications are valid!');
    } else {
      if (this.errors.length > 0) {
        console.log(`\n❌ ERRORS (${this.errors.length}):`);
        this.errors.forEach(error => {
          console.log(`  • ${error}`);
        });
      }

      if (this.warnings.length > 0) {
        console.log(`\n⚠️ WARNINGS (${this.warnings.length}):`);
        this.warnings.forEach(warning => {
          console.log(`  • ${warning}`);
        });
      }
    }

    console.log('\n' + '='.repeat(60));

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length
      }
    };
  }
}

// CLI interface
const validator = new SpecificationValidator();
validator.validateAll()
  .then(result => {
    process.exit(result.valid ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  });

export default SpecificationValidator;