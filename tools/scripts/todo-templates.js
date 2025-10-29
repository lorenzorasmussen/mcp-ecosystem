#!/usr/bin/env node

/**
 * Todo Templates System
 *
 * Provides predefined todo templates for different agent types and operations
 */

import fs from "fs";
import path from "path";

class TodoTemplates {
  constructor() {
    this.templates = {
      // MCP Client Bridge templates
      "mcp-client-bridge": {
        "process-request": {
          content: "Process natural language request through MCP bridge",
          priority: "medium",
          estimatedTime: "5-10 minutes",
        },
        "connect-server": {
          content: "Establish connection to MCP server: {serverId}",
          priority: "high",
          estimatedTime: "2-5 minutes",
        },
        "execute-tool": {
          content: "Execute tool call: {toolName} on server: {serverId}",
          priority: "medium",
          estimatedTime: "1-5 minutes",
        },
        "cache-result": {
          content: "Cache result for tool call: {toolName}",
          priority: "low",
          estimatedTime: "1 minute",
        },
      },

      // General agent templates
      general: {
        "read-file": {
          content: "Read file: {filePath}",
          priority: "medium",
          estimatedTime: "1-2 minutes",
        },
        "write-file": {
          content: "Write content to file: {filePath}",
          priority: "medium",
          estimatedTime: "2-5 minutes",
        },
        "edit-file": {
          content: "Edit file: {filePath} - {description}",
          priority: "medium",
          estimatedTime: "3-10 minutes",
        },
        "bash-command": {
          content: "Execute bash command: {command}",
          priority: "high",
          estimatedTime: "1-15 minutes",
        },
        "search-files": {
          content: "Search for files matching: {pattern}",
          priority: "medium",
          estimatedTime: "2-5 minutes",
        },
        "web-fetch": {
          content: "Fetch content from URL: {url}",
          priority: "medium",
          estimatedTime: "2-10 minutes",
        },
      },

      // Development-specific templates
      development: {
        "implement-feature": {
          content: "Implement feature: {featureName}",
          priority: "high",
          estimatedTime: "30-120 minutes",
        },
        "fix-bug": {
          content: "Fix bug: {bugDescription}",
          priority: "high",
          estimatedTime: "15-60 minutes",
        },
        "write-tests": {
          content: "Write tests for: {component}",
          priority: "medium",
          estimatedTime: "20-60 minutes",
        },
        "code-review": {
          content: "Review code changes in: {filePath}",
          priority: "medium",
          estimatedTime: "10-30 minutes",
        },
        documentation: {
          content: "Update documentation for: {component}",
          priority: "low",
          estimatedTime: "15-45 minutes",
        },
      },

      // System administration templates
      system: {
        "setup-service": {
          content: "Set up service: {serviceName}",
          priority: "high",
          estimatedTime: "10-30 minutes",
        },
        "configure-environment": {
          content: "Configure environment: {environment}",
          priority: "high",
          estimatedTime: "5-20 minutes",
        },
        "monitor-system": {
          content: "Monitor system health and performance",
          priority: "medium",
          estimatedTime: "5-15 minutes",
        },
        "backup-data": {
          content: "Backup data from: {source}",
          priority: "medium",
          estimatedTime: "10-60 minutes",
        },
      },
    };
  }

  /**
   * Get todo template for agent and operation
   */
  getTemplate(agentId, operation, context = {}) {
    // Try agent-specific templates first
    if (this.templates[agentId] && this.templates[agentId][operation]) {
      return this.interpolateTemplate(
        this.templates[agentId][operation],
        context,
      );
    }

    // Fall back to general templates
    if (this.templates.general && this.templates.general[operation]) {
      return this.interpolateTemplate(
        this.templates.general[operation],
        context,
      );
    }

    // Fall back to development templates for development operations
    if (this.templates.development && this.templates.development[operation]) {
      return this.interpolateTemplate(
        this.templates.development[operation],
        context,
      );
    }

    // Generate a default template
    return this.generateDefaultTemplate(operation, context);
  }

  /**
   * Interpolate template variables
   */
  interpolateTemplate(template, context) {
    let content = template.content;

    // Replace template variables
    Object.keys(context).forEach((key) => {
      const placeholder = `{${key}}`;
      content = content.replace(new RegExp(placeholder, "g"), context[key]);
    });

    return {
      content: content,
      priority: template.priority,
      estimatedTime: template.estimatedTime,
      agentId: context.agentId || "unknown",
      operation: context.operation || "unknown",
    };
  }

  /**
   * Generate a default template when no specific template exists
   */
  generateDefaultTemplate(operation, context) {
    const description = context.description || operation;
    return {
      content: `Execute operation: ${description}`,
      priority: "medium",
      estimatedTime: "5-15 minutes",
      agentId: context.agentId || "unknown",
      operation: operation,
    };
  }

  /**
   * Create a todo from template
   */
  createTodoFromTemplate(agentId, operation, context = {}) {
    const template = this.getTemplate(agentId, operation, context);

    return {
      id: `${agentId}-${operation}-${Date.now()}`,
      content: template.content,
      status: "pending",
      priority: template.priority,
      agentId: agentId,
      operation: operation,
      estimatedTime: template.estimatedTime,
      context: context,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Get all available templates for an agent
   */
  getAgentTemplates(agentId) {
    const agentTemplates = this.templates[agentId] || {};
    const generalTemplates = this.templates.general || {};

    return {
      agent: agentTemplates,
      general: generalTemplates,
      all: { ...agentTemplates, ...generalTemplates },
    };
  }

  /**
   * List all template categories
   */
  listTemplateCategories() {
    return Object.keys(this.templates);
  }

  /**
   * Add a custom template
   */
  addTemplate(agentId, operation, template) {
    if (!this.templates[agentId]) {
      this.templates[agentId] = {};
    }

    this.templates[agentId][operation] = {
      content: template.content,
      priority: template.priority || "medium",
      estimatedTime: template.estimatedTime || "5-15 minutes",
    };
  }

  /**
   * Save templates to file
   */
  async saveTemplates(filePath) {
    try {
      await fs.writeFile(filePath, JSON.stringify(this.templates, null, 2));
      console.log(`✅ Templates saved to ${filePath}`);
    } catch (error) {
      console.error("❌ Failed to save templates:", error.message);
      throw error;
    }
  }

  /**
   * Load templates from file
   */
  async loadTemplates(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const data = await fs.readFile(filePath, "utf8");
        this.templates = JSON.parse(data);
        console.log(`✅ Templates loaded from ${filePath}`);
      }
    } catch (error) {
      console.error("❌ Failed to load templates:", error.message);
    }
  }

  /**
   * Generate todo suggestions based on context
   */
  generateSuggestions(context) {
    const suggestions = [];

    // Analyze context to suggest relevant todos
    if (context.files && context.files.length > 0) {
      suggestions.push({
        type: "file-operations",
        todos: context.files.map((file) => ({
          operation: "read-file",
          context: { filePath: file },
          template: this.getTemplate("general", "read-file", {
            filePath: file,
          }),
        })),
      });
    }

    if (context.commands && context.commands.length > 0) {
      suggestions.push({
        type: "command-execution",
        todos: context.commands.map((cmd) => ({
          operation: "bash-command",
          context: { command: cmd },
          template: this.getTemplate("general", "bash-command", {
            command: cmd,
          }),
        })),
      });
    }

    if (context.features && context.features.length > 0) {
      suggestions.push({
        type: "feature-development",
        todos: context.features.map((feature) => ({
          operation: "implement-feature",
          context: { featureName: feature },
          template: this.getTemplate("development", "implement-feature", {
            featureName: feature,
          }),
        })),
      });
    }

    return suggestions;
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];
const agentId = args[1];
const operation = args[2];

const templates = new TodoTemplates();

switch (command) {
  case "get":
    if (!agentId || !operation) {
      console.error("Usage: node todo-templates.js get <agentId> <operation>");
      process.exit(1);
    }

    const context = {};
    // Parse additional context from args
    for (let i = 3; i < args.length; i += 2) {
      if (args[i + 1]) {
        const key = args[i].replace("--", "");
        context[key] = args[i + 1];
      }
    }

    const template = templates.getTemplate(agentId, operation, context);
    console.log(JSON.stringify(template, null, 2));
    break;

  case "create":
    if (!agentId || !operation) {
      console.error(
        "Usage: node todo-templates.js create <agentId> <operation> [context...]",
      );
      process.exit(1);
    }

    const createContext = {};
    for (let i = 3; i < args.length; i += 2) {
      if (args[i + 1]) {
        const key = args[i].replace("--", "");
        createContext[key] = args[i + 1];
      }
    }

    const todo = templates.createTodoFromTemplate(
      agentId,
      operation,
      createContext,
    );
    console.log(JSON.stringify(todo, null, 2));
    break;

  case "list":
    if (agentId) {
      const agentTemplates = templates.getAgentTemplates(agentId);
      console.log(JSON.stringify(agentTemplates, null, 2));
    } else {
      const categories = templates.listTemplateCategories();
      console.log("Available template categories:", categories);
    }
    break;

  default:
    console.log(`
Usage: node todo-templates.js <command> [options]

Commands:
  get <agentId> <operation> [context...]  Get template for agent/operation
  create <agentId> <operation> [context...] Create todo from template
  list [agentId]                          List templates

Examples:
  node todo-templates.js get mcp-client-bridge process-request
  node todo-templates.js create general read-file --filePath /path/to/file
  node todo-templates.js list mcp-client-bridge
    `);
}

export default TodoTemplates;
