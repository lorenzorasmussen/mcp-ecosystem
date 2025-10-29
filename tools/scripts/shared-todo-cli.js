#!/usr/bin/env node

/**
 * Shared Todo CLI - LLM Interface
 *
 * This CLI provides a comprehensive interface for LLMs to interact with the shared todo system.
 * LLMs can check who's working on what, who completed tasks, create new todos, assign work, etc.
 */

import fs from "fs";
import path from "path";
import SharedTodoService from "./shared-todo-service.js";

class SharedTodoCLI {
  constructor() {
    this.repositoryPath = process.cwd();
    this.sharedKnowledgePath = path.join(
      this.repositoryPath,
      "data",
      "shared-knowledge",
      ".mcp-shared-knowledge",
    );
    this.todoService = new SharedTodoService(this.sharedKnowledgePath);
  }

  /**
   * Show current status of all todos and agents
   */
  async showStatus(agentId = null) {
    console.log("📊 Shared Todo System Status\n");

    const systemStats = await this.todoService.getSystemStats();
    const allAgents = await this.todoService.getAllAgents();

    console.log(`System Overview:`);
    console.log(`  Total Todos: ${systemStats.metadata?.totalTasks || 0}`);
    console.log(`  Active Todos: ${systemStats.metadata?.activeTasks || 0}`);
    console.log(
      `  Completed Todos: ${systemStats.metadata?.completedTasks || 0}`,
    );
    console.log(`  Total Agents: ${systemStats.agentCount || 0}`);
    console.log(
      `  Last Updated: ${new Date(systemStats.metadata?.lastUpdated || Date.now()).toLocaleString()}\n`,
    );

    // Show agent status
    console.log("🤖 Agent Status:");
    if (Object.keys(allAgents).length === 0) {
      console.log("  No agents registered yet");
    } else {
      for (const [id, stats] of Object.entries(allAgents)) {
        const status = stats.activeTasks > 0 ? "🟢 Active" : "⚪ Idle";
        console.log(
          `  ${id}: ${status} (${stats.totalCompleted}/${stats.totalAssigned} completed, ${stats.completionRate?.toFixed(1) || 0}% rate)`,
        );
      }
    }
    console.log();

    // Show current active todos
    const activeTodos = agentId
      ? await this.todoService.getActiveTodos(agentId)
      : await this.todoService.getTodosForAgent(null, {
          status: "in_progress",
        });

    console.log("📋 Active Todos:");
    if (activeTodos.length === 0) {
      console.log("  No active todos");
    } else {
      activeTodos.slice(0, 10).forEach((todo) => {
        const assigned = todo.assignedTo
          ? ` 👤 ${todo.assignedTo}`
          : " (unassigned)";
        const priority =
          todo.priority === "high"
            ? "🔴"
            : todo.priority === "medium"
              ? "🟡"
              : "🟢";
        console.log(`  ${priority} ${todo.id}: ${todo.title}${assigned}`);
        if (todo.description && todo.description !== todo.title) {
          console.log(`      ${todo.description}`);
        }
      });
      if (activeTodos.length > 10) {
        console.log(`  ... and ${activeTodos.length - 10} more`);
      }
    }
    console.log();

    // Show recent activity
    console.log("📝 Recent Activity:");
    const recentActivity = systemStats.recentActivity?.slice(0, 5) || [];
    if (recentActivity.length === 0) {
      console.log("  No recent activity");
    } else {
      recentActivity.forEach((activity) => {
        const time = new Date(activity.timestamp).toLocaleString();
        console.log(`  ${time}: ${activity.action} by ${activity.agentId}`);
      });
    }
  }

  /**
   * Show what a specific agent is working on
   */
  async showAgentWork(agentId) {
    console.log(`👤 Agent ${agentId} Work Status\n`);

    const agentStats = await this.todoService.getAgentStats(agentId);
    const assignedTodos = await this.todoService.getAssignedTodos(agentId);
    const createdTodos = await this.todoService.getCreatedTodos(agentId);

    console.log("📊 Statistics:");
    console.log(`  Created: ${agentStats.totalCreated}`);
    console.log(`  Assigned: ${agentStats.totalAssigned}`);
    console.log(`  Completed: ${agentStats.totalCompleted}`);
    console.log(`  Active Tasks: ${agentStats.activeTasks}`);
    console.log(
      `  Completion Rate: ${agentStats.completionRate?.toFixed(1) || 0}%`,
    );
    console.log(
      `  Last Activity: ${agentStats.lastActivity ? new Date(agentStats.lastActivity).toLocaleString() : "Never"}`,
    );
    console.log();

    console.log("🎯 Currently Assigned:");
    if (assignedTodos.length === 0) {
      console.log("  No assigned todos");
    } else {
      assignedTodos.forEach((todo) => {
        const status =
          todo.status === "in_progress"
            ? "▶️"
            : todo.status === "completed"
              ? "✅"
              : "⏸️";
        console.log(`  ${status} ${todo.title} (${todo.priority} priority)`);
      });
    }
    console.log();

    console.log("📝 Recently Created:");
    const recentCreated = createdTodos.slice(0, 5);
    if (recentCreated.length === 0) {
      console.log("  No created todos");
    } else {
      recentCreated.forEach((todo) => {
        const status =
          todo.status === "completed"
            ? "✅"
            : todo.status === "in_progress"
              ? "▶️"
              : "📝";
        console.log(
          `  ${status} ${todo.title} (${new Date(todo.createdAt).toLocaleDateString()})`,
        );
      });
    }
  }

  /**
   * Create a new todo
   */
  async createTodo(agentId, title, options = {}) {
    console.log(`📝 Creating todo for agent ${agentId}: ${title}`);

    const todoData = {
      title: title,
      description: options.description || title,
      priority: options.priority || "medium",
      category: options.category || "general",
      tags: options.tags ? options.tags.split(",") : [],
      context: options.context || {},
      dependencies: options.dependencies ? options.dependencies.split(",") : [],
    };

    const todo = await this.todoService.createTodo(todoData, agentId);

    console.log(`✅ Created todo: ${todo.title}`);
    console.log(`   ID: ${todo.id}`);
    console.log(`   Priority: ${todo.priority}`);
    console.log(`   Status: ${todo.status}`);

    return todo;
  }

  /**
   * Assign a todo to an agent
   */
  async assignTodo(assignerId, todoId, assigneeId) {
    console.log(
      `👤 Assigning todo ${todoId} to ${assigneeId} by ${assignerId}`,
    );

    const todo = await this.todoService.assignTodo(
      todoId,
      assigneeId,
      assignerId,
    );

    console.log(`✅ Assigned todo: ${todo.title}`);
    console.log(`   Assigned to: ${todo.assignedTo}`);
    console.log(`   Assigned by: ${todo.assignedBy}`);
    console.log(
      `   Assigned at: ${new Date(todo.assignedAt).toLocaleString()}`,
    );

    return todo;
  }

  /**
   * Start working on a todo
   */
  async startTodo(agentId, todoId) {
    console.log(`▶️ Starting work on todo ${todoId} by ${agentId}`);

    const todo = await this.todoService.startTodo(todoId, agentId);

    console.log(`✅ Started working on: ${todo.title}`);
    console.log(`   Started at: ${new Date(todo.startedAt).toLocaleString()}`);

    return todo;
  }

  /**
   * Complete a todo
   */
  async completeTodo(agentId, todoId, completionData = {}) {
    console.log(`✅ Completing todo ${todoId} by ${agentId}`);

    const result = completionData.result || "completed";
    const notes = completionData.notes || "";

    const todo = await this.todoService.completeTodo(todoId, agentId, {
      result: result,
      notes: notes,
      actualTime: completionData.actualTime,
    });

    console.log(`✅ Completed todo: ${todo.title}`);
    console.log(
      `   Completed at: ${new Date(todo.completedAt).toLocaleString()}`,
    );
    if (notes) {
      console.log(`   Notes: ${notes}`);
    }

    return todo;
  }

  /**
   * Add a comment to a todo
   */
  async commentTodo(agentId, todoId, comment) {
    console.log(`💬 Adding comment to todo ${todoId} by ${agentId}`);

    const commentObj = await this.todoService.addComment(
      todoId,
      agentId,
      comment,
    );

    console.log(`✅ Added comment: "${comment}"`);
    console.log(`   Comment ID: ${commentObj.id}`);
    console.log(
      `   Added at: ${new Date(commentObj.timestamp).toLocaleString()}`,
    );

    return commentObj;
  }

  /**
   * Show detailed todo information
   */
  async showTodo(todoId) {
    const todos = await this.todoService.getTodosForAgent(null);
    const todo = todos.find((t) => t.id === todoId);

    if (!todo) {
      console.log(`❌ Todo ${todoId} not found`);
      return null;
    }

    console.log(`📋 Todo Details: ${todo.title}\n`);
    console.log(`ID: ${todo.id}`);
    console.log(`Status: ${todo.status}`);
    console.log(`Priority: ${todo.priority}`);
    console.log(`Category: ${todo.category}`);

    console.log(`\n👥 People:`);
    console.log(
      `  Created by: ${todo.createdBy} (${new Date(todo.createdAt).toLocaleString()})`,
    );
    if (todo.assignedTo) {
      console.log(`  Assigned to: ${todo.assignedTo}`);
      if (todo.assignedAt) {
        console.log(
          `  Assigned at: ${new Date(todo.assignedAt).toLocaleString()}`,
        );
      }
      if (todo.assignedBy) {
        console.log(`  Assigned by: ${todo.assignedBy}`);
      }
    }
    if (todo.completedBy) {
      console.log(
        `  Completed by: ${todo.completedBy} (${new Date(todo.completedAt).toLocaleString()})`,
      );
    }

    if (todo.description && todo.description !== todo.title) {
      console.log(`\n📝 Description: ${todo.description}`);
    }

    if (todo.tags && todo.tags.length > 0) {
      console.log(`\n🏷️ Tags: ${todo.tags.join(", ")}`);
    }

    if (todo.dependencies && todo.dependencies.length > 0) {
      console.log(`\n🔗 Dependencies: ${todo.dependencies.join(", ")}`);
    }

    if (todo.comments && todo.comments.length > 0) {
      console.log(`\n💬 Comments:`);
      todo.comments.forEach((comment) => {
        console.log(
          `  ${new Date(comment.timestamp).toLocaleString()} - ${comment.agentId}: ${comment.content}`,
        );
      });
    }

    if (todo.history && todo.history.length > 0) {
      console.log(`\n📜 History:`);
      todo.history.forEach((entry) => {
        console.log(
          `  ${new Date(entry.timestamp).toLocaleString()}: ${entry.action} by ${entry.agentId}`,
        );
      });
    }

    return todo;
  }

  /**
   * Search todos
   */
  async searchTodos(query, agentId = null) {
    console.log(
      `🔍 Searching todos for "${query}"${agentId ? ` (agent: ${agentId})` : ""}`,
    );

    const results = await this.todoService.searchTodos(query, agentId);

    console.log(`Found ${results.length} todos:\n`);

    results.forEach((todo) => {
      const status =
        todo.status === "completed"
          ? "✅"
          : todo.status === "in_progress"
            ? "▶️"
            : "📝";
      const assigned = todo.assignedTo ? ` 👤 ${todo.assignedTo}` : "";
      console.log(`${status} ${todo.id}: ${todo.title}${assigned}`);
      if (todo.description && todo.description !== todo.title) {
        console.log(`    ${todo.description}`);
      }
      console.log();
    });

    return results;
  }

  /**
   * Show todos by category
   */
  async showByCategory(category) {
    console.log(`📂 Todos in category: ${category}\n`);

    const todos = await this.todoService.getTodosForAgent(null, { category });

    if (todos.length === 0) {
      console.log("No todos found in this category");
      return [];
    }

    todos.forEach((todo) => {
      const status =
        todo.status === "completed"
          ? "✅"
          : todo.status === "in_progress"
            ? "▶️"
            : "📝";
      const assigned = todo.assignedTo ? ` 👤 ${todo.assignedTo}` : "";
      console.log(`${status} ${todo.id}: ${todo.title}${assigned}`);
    });

    return todos;
  }

  /**
   * Show pending todos that need assignment
   */
  async showUnassigned() {
    console.log("📋 Unassigned Pending Todos:\n");

    const todos = await this.todoService.getTodosForAgent(null, {
      status: "pending",
    });
    const unassigned = todos.filter((todo) => !todo.assignedTo);

    if (unassigned.length === 0) {
      console.log("No unassigned todos");
      return [];
    }

    unassigned.forEach((todo) => {
      const priority =
        todo.priority === "high"
          ? "🔴"
          : todo.priority === "medium"
            ? "🟡"
            : "🟢";
      console.log(`${priority} ${todo.id}: ${todo.title}`);
      console.log(
        `    Created by: ${todo.createdBy} (${new Date(todo.createdAt).toLocaleString()})`,
      );
      if (todo.description && todo.description !== todo.title) {
        console.log(`    ${todo.description}`);
      }
      console.log();
    });

    return unassigned;
  }

  /**
   * Run the CLI
   */
  async run() {
    const args = process.argv.slice(2);
    const command = args[0];
    const agentId = args[1];

    try {
      switch (command) {
        case "status":
          await this.showStatus(agentId);
          break;

        case "agent":
          if (!agentId) {
            console.error("Usage: node shared-todo-cli.js agent <agentId>");
            process.exit(1);
          }
          await this.showAgentWork(agentId);
          break;

        case "create":
          if (!agentId || !args[2]) {
            console.error(
              'Usage: node shared-todo-cli.js create <agentId> <title> [--description="..."] [--priority=high|medium|low] [--category=...] [--tags=tag1,tag2]',
            );
            process.exit(1);
          }
          const title = args[2];
          const options = this.parseOptions(args.slice(3));
          await this.createTodo(agentId, title, options);
          break;

        case "assign":
          if (!agentId || !args[2] || !args[3]) {
            console.error(
              "Usage: node shared-todo-cli.js assign <assignerId> <todoId> <assigneeId>",
            );
            process.exit(1);
          }
          await this.assignTodo(agentId, args[2], args[3]);
          break;

        case "start":
          if (!agentId || !args[2]) {
            console.error(
              "Usage: node shared-todo-cli.js start <agentId> <todoId>",
            );
            process.exit(1);
          }
          await this.startTodo(agentId, args[2]);
          break;

        case "complete":
          if (!agentId || !args[2]) {
            console.error(
              'Usage: node shared-todo-cli.js complete <agentId> <todoId> [--notes="..."] [--result="..."]',
            );
            process.exit(1);
          }
          const completeOptions = this.parseOptions(args.slice(3));
          await this.completeTodo(agentId, args[2], completeOptions);
          break;

        case "comment":
          if (!agentId || !args[2] || !args[3]) {
            console.error(
              "Usage: node shared-todo-cli.js comment <agentId> <todoId> <comment>",
            );
            process.exit(1);
          }
          const comment = args.slice(3).join(" ");
          await this.commentTodo(agentId, args[2], comment);
          break;

        case "show":
          if (!args[1]) {
            console.error("Usage: node shared-todo-cli.js show <todoId>");
            process.exit(1);
          }
          await this.showTodo(args[1]);
          break;

        case "search":
          if (!args[1]) {
            console.error(
              "Usage: node shared-todo-cli.js search <query> [agentId]",
            );
            process.exit(1);
          }
          await this.searchTodos(args[1], args[2]);
          break;

        case "category":
          if (!args[1]) {
            console.error("Usage: node shared-todo-cli.js category <category>");
            process.exit(1);
          }
          await this.showByCategory(args[1]);
          break;

        case "unassigned":
          await this.showUnassigned();
          break;

        default:
          console.log(`
🤖 Shared Todo CLI - LLM Interface

Commands:
  status [agentId]              Show system status (optionally for specific agent)
  agent <agentId>               Show detailed agent work status
  create <agentId> <title>      Create a new todo
  assign <assigner> <todoId> <assignee>  Assign todo to agent
  start <agentId> <todoId>      Start working on todo
  complete <agentId> <todoId>   Complete todo
  comment <agentId> <todoId> <text>  Add comment to todo
  show <todoId>                 Show detailed todo information
  search <query> [agentId]      Search todos
  category <category>           Show todos by category
  unassigned                    Show unassigned pending todos

Examples:
  node shared-todo-cli.js status
  node shared-todo-cli.js agent qwen-agent
  node shared-todo-cli.js create qwen-agent "Implement new feature" --priority=high --category=development
  node shared-todo-cli.js assign admin todo-123 qwen-agent
  node shared-todo-cli.js start qwen-agent todo-123
  node shared-todo-cli.js complete qwen-agent todo-123 --notes="Feature implemented successfully"
  node shared-todo-cli.js comment qwen-agent todo-123 "Working on the UI component"
  node shared-todo-cli.js show todo-123
  node shared-todo-cli.js search "implement"
  node shared-todo-cli.js category development
  node shared-todo-cli.js unassigned

Options for create/complete:
  --description="..."           Detailed description
  --priority=high|medium|low     Priority level (default: medium)
  --category=...                 Category (default: general)
  --tags=tag1,tag2               Comma-separated tags
  --notes="..."                  Completion notes
  --result="..."                 Completion result
          `);
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  }

  /**
   * Parse command line options
   */
  parseOptions(args) {
    const options = {};

    args.forEach((arg) => {
      if (arg.startsWith("--")) {
        const [key, value] = arg.substring(2).split("=");
        if (value !== undefined) {
          options[key] = value;
        }
      }
    });

    return options;
  }
}

// Run the CLI
const cli = new SharedTodoCLI();
cli.run().catch(console.error);
