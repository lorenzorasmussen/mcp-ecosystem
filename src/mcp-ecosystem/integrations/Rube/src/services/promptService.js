/**
 * Prompt Service for Rube MCP Server
 * Manages prompts and their expansion
 */

const { logger } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { PromptNotFoundError } = require('../utils/errors');

class PromptService {
  constructor() {
    // Define available prompts
    this.prompts = {
      'email-draft': {
        name: 'email-draft',
        description: 'Draft an email based on user input',
        template: `
Subject: {subject}

Dear {recipient},

{body}

Best regards,
{sender}
        `,
      },
      'meeting-summary': {
        name: 'meeting-summary',
        description: 'Generate a meeting summary template',
        template: `
# Meeting Summary

**Date:** {date}
**Attendees:** {attendees}
**Agenda:**
{agenda}

**Action Items:**
{action_items}

**Next Steps:**
{next_steps}
        `,
      },
      'multi-app-workflow': {
        name: 'multi-app-workflow',
        description: 'Generate a multi-app workflow based on user requirements',
        template: `
# Multi-App Workflow

**Workflow Name:** {name}
**Description:** {description}

## Steps:
{steps}

## Integration Points:
- Gmail: {gmail_integration}
- GitHub: {github_integration}
- Slack: {slack_integration}
- Other Apps: {other_apps}

## Expected Outcomes:
{outcomes}
        `,
      },
      'app-sync-plan': {
        name: 'app-sync-plan',
        description: 'Generate an app synchronization plan',
        template: `
# App Synchronization Plan

**Apps to Sync:** {apps}
**Sync Frequency:** {frequency}
**Data Types:** {data_types}
**Sync Direction:** {sync_direction}

## Configuration:
- Source App: {source_app}
- Target App: {target_app}
- Fields to Sync: {fields}
- Sync Triggers: {triggers}

## Monitoring:
- Success Rate: {success_rate}
- Error Handling: {error_handling}
        `,
      },
    };
  }

  // List all available prompts
  async listPrompts() {
    return Object.values(this.prompts);
  }

  // Get specific prompt
  async getPrompt(promptId) {
    const prompt = this.prompts[promptId];
    if (!prompt) {
      throw new PromptNotFoundError(promptId);
    }
    return prompt;
  }

  // Expand a prompt with provided arguments
  async expandPrompt(promptId, args) {
    const prompt = this.prompts[promptId];
    if (!prompt) {
      throw new PromptNotFoundError(promptId);
    }

    // Simple template expansion - in a real implementation, this would be more sophisticated
    let expanded = prompt.template;
    
    for (const [key, value] of Object.entries(args)) {
      const regex = new RegExp(`{${key}}`, 'g');
      expanded = expanded.replace(regex, value || '');
    }

    logger.info(`Expanded prompt: ${promptId}`, { args });
    
    return expanded;
  }

  // Create a custom prompt
  async createPrompt(promptData) {
    if (!promptData.name || !promptData.template) {
      throw new Error('Prompt name and template are required');
    }

    const promptId = promptData.id || uuidv4();
    
    const newPrompt = {
      name: promptData.name,
      description: promptData.description || '',
      template: promptData.template,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.prompts[promptId] = newPrompt;
    
    logger.info(`Created custom prompt: ${promptId}`, { 
      name: promptData.name,
      description: promptData.description 
    });
    
    return {
      id: promptId,
      ...newPrompt
    };
  }

  // Update a prompt
  async updatePrompt(promptId, updates) {
    const prompt = this.prompts[promptId];
    if (!prompt) {
      throw new PromptNotFoundError(promptId);
    }

    // Update allowed fields
    if (updates.name !== undefined) prompt.name = updates.name;
    if (updates.description !== undefined) prompt.description = updates.description;
    if (updates.template !== undefined) prompt.template = updates.template;
    prompt.updatedAt = new Date().toISOString();

    logger.info(`Updated prompt: ${promptId}`);
    
    return {
      id: promptId,
      ...prompt
    };
  }

  // Delete a custom prompt
  async deletePrompt(promptId) {
    if (!this.prompts[promptId]) {
      throw new PromptNotFoundError(promptId);
    }

    // Don't allow deletion of built-in prompts
    const builtInPrompts = ['email-draft', 'meeting-summary', 'multi-app-workflow', 'app-sync-plan'];
    if (builtInPrompts.includes(promptId)) {
      throw new Error(`Cannot delete built-in prompt: ${promptId}`);
    }

    delete this.prompts[promptId];
    
    logger.info(`Deleted custom prompt: ${promptId}`);
    
    return true;
  }
}

module.exports = {
  promptService: new PromptService(),
};