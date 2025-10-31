#!/usr/bin/env node

/**
 * Todo Enforcement Hook System
 *
 * This script enforces that all LLM agents must create and manage todos
 * before proceeding with any workflow execution.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import SharedTodoService from "./shared-todo-service.js";

const __filename = fileURLToPath(import.meta.url);

class TodoEnforcementHook {
  constructor(options = {}) {
    this.repositoryPath = options.repositoryPath || process.cwd();
    this.strictMode =
      options.strictMode || process.env.TODO_ENFORCEMENT_STRICT === "true";
    this.sharedKnowledgePath = path.join(
      this.repositoryPath,
      "data",
      "shared-knowledge",
      ".mcp-shared-knowledge",
    );
    this.agentsPath = path.join(this.repositoryPath, ".qwen", "agents");
    this.todoService = new SharedTodoService(this.sharedKnowledgePath);
  }

  /**
   * Validate that a todo exists for the current operation
   */
  async validateTodoForOperation(operation, agentId, context = {}) {
    console.log(
      `🔍 Validating todo for operation: ${operation} by agent: ${agentId}`,
    );

    // Check if agent has active todos
    const activeTodos = await this.todoService.getActiveTodos(agentId);

    if (activeTodos.length === 0) {
      const errorMessage = this.buildDetailedErrorMessage(
        "no_active_todos",
        agentId,
        operation,
        context,
      );

      if (this.strictMode) {
        throw new Error(errorMessage);
      } else {
        console.warn(`⚠️ Warning: ${errorMessage}`);
        return { valid: true, warning: true };
      }
    }

    // Check if current operation aligns with active todos
    const relevantTodos = this.findRelevantTodos(
      operation,
      activeTodos,
      context,
    );

    if (relevantTodos.length === 0) {
      const errorMessage = this.buildDetailedErrorMessage(
        "no_relevant_todos",
        agentId,
        operation,
        context,
        activeTodos,
      );

      if (this.strictMode) {
        throw new Error(errorMessage);
      } else {
        console.warn(`⚠️ Warning: ${errorMessage}`);
        return { valid: true, warning: true };
      }
    }

    console.log(
      `✅ Todo validation passed: Found ${relevantTodos.length} relevant todos`,
    );
    return { valid: true, relevantTodos, warning: false };
  }

  /**
   * Build detailed error message for todo enforcement
   */
  buildDetailedErrorMessage(
    errorType,
    agentId,
    operation,
    context,
    activeTodos = [],
  ) {
    const baseMessage = `🚫 TODO ENFORCEMENT BLOCKED\n\n`;

    const errorDetails = {
      no_active_todos: {
        reason: `Agent '${agentId}' has no active todos`,
        explanation: `All LLMs in this system must create and manage todos before executing operations. This ensures proper task tracking, collaboration, and accountability.`,
        solution: `Create a todo first using: node tools/scripts/shared-todo-cli.js create ${agentId} "${operation}"`,
      },
      no_relevant_todos: {
        reason: `No relevant todos found for operation '${operation}'`,
        explanation: `The operation '${operation}' doesn't match any of your active todos. Each operation should have a corresponding todo for tracking.`,
        solution: `Create a relevant todo or update existing todos to match this operation.`,
      },
    };

    const details = errorDetails[errorType];
    if (!details) return `${baseMessage}Unknown error type: ${errorType}`;

    let message = baseMessage;
    message += `📋 ERROR DETAILS:\n`;
    message += `   • Reason: ${details.reason}\n`;
    message += `   • Operation: ${operation}\n`;
    message += `   • Agent: ${agentId}\n`;
    message += `   • Source: Todo Enforcement Hook (tools/scripts/todo-enforcement-hook.js)\n\n`;

    message += `💡 WHY THIS HAPPENS:\n`;
    message += `   ${details.explanation}\n\n`;

    message += `✅ HOW TO FIX:\n`;
    message += `   ${details.solution}\n\n`;

    if (activeTodos.length > 0) {
      message += `📝 YOUR CURRENT ACTIVE TODOS:\n`;
      activeTodos.slice(0, 3).forEach((todo) => {
        message += `   • ${todo.title} (ID: ${todo.id})\n`;
      });
      if (activeTodos.length > 3) {
        message += `   ... and ${activeTodos.length - 3} more\n`;
      }
      message += `\n`;
    }

    message += `🔧 CREATE A NEW TODO:\n`;
    message += `   node tools/scripts/shared-todo-cli.js create ${agentId} "${operation}"\n\n`;

    message += `📊 CHECK SYSTEM STATUS:\n`;
    message += `   node tools/scripts/shared-todo-cli.js status\n\n`;

    message += `⚙️ IF THIS IS A FALSE POSITIVE:\n`;
    message += `   Edit configuration: .env.todo\n`;
    message += `   Set: TODO_ENFORCEMENT_STRICT=false\n`;
    message += `   Or disable for specific operations in the config\n\n`;

    message += `📖 LEARN MORE:\n`;
    message += `   Read: SHARED_TODO_SYSTEM_GUIDE.md\n`;
    message += `   Read: TODO_ENFORCEMENT_GUIDE.md\n\n`;

    message += `🚨 This operation has been BLOCKED to maintain system accountability.\n`;
    message += `   Please create a todo and try again.`;

    return message;
  }

  /**
   * Find todos relevant to the current operation
   */
  findRelevantTodos(operation, todos, context) {
    return todos.filter((todo) => {
      // Check if operation matches todo title or description
      const operationLower = operation.toLowerCase();
      const todoTitle = (todo.title || "").toLowerCase();
      const todoDescription = (todo.description || "").toLowerCase();

      // Direct content match
      if (
        todoTitle.includes(operationLower) ||
        todoDescription.includes(operationLower)
      ) {
        return true;
      }

      // Context-based matching
      if (
        context.file &&
        (todoTitle.includes(context.file.toLowerCase()) ||
          todoDescription.includes(context.file.toLowerCase()))
      ) {
        return true;
      }

      if (
        context.feature &&
        (todoTitle.includes(context.feature.toLowerCase()) ||
          todoDescription.includes(context.feature.toLowerCase()))
      ) {
        return true;
      }

      // Priority-based filtering (high priority todos are more relevant)
      if (todo.priority === "high" && operationLower.includes("implement")) {
        return true;
      }

      return false;
    });
  }

  /**
   * Initialize todo system for a new agent session
   */
  async initializeAgentSession(agentId, operation) {
    console.log(`🚀 Initializing todo system for agent: ${agentId}`);

    // Check if agent has existing todos
    const existingTodos = await this.todoService.getActiveTodos(agentId);

    if (existingTodos.length === 0) {
      // Create initial todo for this operation
      const initialTodo = await this.todoService.createTodo(
        {
          title: `Execute ${operation}`,
          description: `Execute ${operation} - ${new Date().toISOString()}`,
          status: "pending",
          priority: "medium",
          category: "general",
          context: { operation: operation },
        },
        agentId,
      );

      // Start the todo immediately
      await this.todoService.startTodo(initialTodo.id, agentId);

      console.log(
        `📝 Created initial todo for agent ${agentId}: ${initialTodo.title}`,
      );

      return { todoCreated: true, todo: initialTodo };
    }

    return { todoCreated: false, existingTodos };
  }

  /**
   * Update todo status based on operation result
   */
  async updateTodoStatus(agentId, operation, result, todoId = null) {
    const activeTodos = await this.todoService.getActiveTodos(agentId);
    const targetTodo = todoId
      ? activeTodos.find((t) => t.id === todoId)
      : this.findRelevantTodos(operation, activeTodos, {})[0];

    if (targetTodo) {
      if (result.success) {
        await this.todoService.completeTodo(targetTodo.id, agentId, {
          result: result,
          notes: result.message || "Operation completed successfully",
        });
        console.log(`✅ Completed todo ${targetTodo.id}`);

        // If operation was successful and there are more todos, activate next one
        await this.activateNextTodo(agentId);
      } else {
        // For failed operations, we could add a comment instead of completing
        await this.todoService.addComment(
          targetTodo.id,
          agentId,
          `Operation failed: ${result.error || "Unknown error"}`,
        );
        console.log(`💬 Added failure comment to todo ${targetTodo.id}`);
      }

      return { updated: true, todoId: targetTodo.id, success: result.success };
    }

    return { updated: false };
  }

  /**
   * Activate the next pending todo for an agent
   */
  async activateNextTodo(agentId) {
    const pendingTodos = await this.todoService.getPendingTodos(agentId);

    if (pendingTodos.length > 0) {
      const nextTodo = pendingTodos[0]; // Get highest priority pending todo
      await this.todoService.startTodo(nextTodo.id, agentId);
      console.log(
        `▶️ Activated next todo for agent ${agentId}: ${nextTodo.title}`,
      );
      return nextTodo;
    }

    return null;
  }

  /**
   * Get todo compliance metrics
   */
  async getComplianceMetrics() {
    const allAgents = await this.getAllAgents();
    const metrics = {
      totalAgents: allAgents.length,
      agentsWithActiveTodos: 0,
      totalActiveTodos: 0,
      complianceRate: 0,
    };

    for (const agentId of allAgents) {
      const activeTodos = await this.todoService.getActiveTodos(agentId);
      if (activeTodos.length > 0) {
        metrics.agentsWithActiveTodos++;
        metrics.totalActiveTodos += activeTodos.length;
      }
    }

    metrics.complianceRate =
      metrics.totalAgents > 0
        ? Math.round(
            (metrics.agentsWithActiveTodos / metrics.totalAgents) * 100,
          )
        : 0;

    return metrics;
  }

  /**
   * Get all available agents
   */
  async getAllAgents() {
    const agents = [];

    try {
      const agentFiles = fs.readdirSync(this.agentsPath);
      for (const file of agentFiles) {
        if (file.endsWith(".json")) {
          const agentId = path.basename(file, ".json");
          agents.push(agentId);
        }
      }
    } catch (error) {
      console.warn("Could not read agents directory:", error.message);
    }

    return agents;
  }

  /**
   * Run todo enforcement check
   */
  async run(operation, agentId, context = {}) {
    try {
      console.log("🔧 Running Todo Enforcement Hook...");

      // Initialize session if needed
      await this.initializeAgentSession(agentId, operation);

      // Validate todo exists
      const validation = await this.validateTodoForOperation(
        operation,
        agentId,
        context,
      );

      if (!validation.valid) {
        throw new Error("Todo validation failed");
      }

      return {
        success: true,
        validation,
        metrics: await this.getComplianceMetrics(),
      };
    } catch (error) {
      console.error("❌ Todo enforcement failed:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

/**
 * Todo Service for managing shared todos
 */
class TodoService {
  constructor(sharedKnowledgePath) {
    this.todosPath = path.join(
      sharedKnowledgePath,
      "tasks",
      "shared_tasks.json",
    );
    this.ensureTodosDirectory();
  }

  ensureTodosDirectory() {
    const dir = path.dirname(this.todosPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async loadTodos() {
    try {
      if (fs.existsSync(this.todosPath)) {
        const data = fs.readFileSync(this.todosPath, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn("Could not load todos:", error.message);
    }

    return [];
  }

  async saveTodos(todos) {
    try {
      fs.writeFileSync(this.todosPath, JSON.stringify(todos, null, 2));
    } catch (error) {
      console.error("Could not save todos:", error.message);
      throw error;
    }
  }

  async createTodo(todo) {
    const todos = await this.loadTodos();
    todos.push(todo);
    await this.saveTodos(todos);
    return todo;
  }

  async updateTodoStatus(todoId, newStatus) {
    const todos = await this.loadTodos();
    const todoIndex = todos.findIndex((t) => t.id === todoId);

    if (todoIndex !== -1) {
      todos[todoIndex].status = newStatus;
      todos[todoIndex].updatedAt = new Date().toISOString();
      await this.saveTodos(todos);
      return todos[todoIndex];
    }

    throw new Error(`Todo ${todoId} not found`);
  }

  async getActiveTodos(agentId = null) {
    const todos = await this.loadTodos();
    return todos.filter(
      (todo) =>
        todo.status === "in_progress" && (!agentId || todo.agentId === agentId),
    );
  }

  async getPendingTodos(agentId = null) {
    const todos = await this.loadTodos();
    return todos
      .filter(
        (todo) =>
          todo.status === "pending" && (!agentId || todo.agentId === agentId),
      )
      .sort((a, b) => {
        // Sort by priority (high > medium > low)
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (
          (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
        );
      });
  }
}

// CLI interface
const args = process.argv.slice(2);
const operation = args[0] || "unknown";
const agentId = args[1] || "unknown-agent";

const hook = new TodoEnforcementHook();
hook
  .run(operation, agentId)
  .then((result) => {
    if (result.success) {
      console.log("✅ Todo enforcement completed successfully");
      process.exit(0);
    } else {
      console.error("❌ Todo enforcement failed:", result.error);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ Todo enforcement error:", error.message);
    process.exit(1);
  });

export default TodoEnforcementHook;
