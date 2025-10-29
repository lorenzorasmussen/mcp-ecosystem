// src/services/TodoEnforcementService.js
const fs = require("fs").promises;
const path = require("path");
const logger = require("../utils/logger");

class TodoEnforcementService {
  constructor() {
    this.sharedKnowledgePath = path.join(
      process.cwd(),
      ".mcp-shared-knowledge",
    );
    this.todosPath = path.join(
      this.sharedKnowledgePath,
      "tasks",
      "shared_tasks.json",
    );
    this.strictMode = process.env.TODO_ENFORCEMENT_STRICT === "true";
  }

  /**
   * Validate that todos exist for MCP bridge operations
   */
  async validateTodosForOperation(operation, context = {}) {
    logger.info(`Validating todos for MCP operation: ${operation}`);

    try {
      const todos = await this.loadTodos();
      const activeTodos = todos.filter((todo) => todo.status === "in_progress");

      if (activeTodos.length === 0) {
        if (this.strictMode) {
          throw new Error(
            `Todo Enforcement: MCP Bridge must have active todos before executing ${operation}`,
          );
        } else {
          logger.warn(`Warning: No active todos for operation ${operation}`);
          return { valid: true, warning: true };
        }
      }

      // Find todos relevant to this operation
      const relevantTodos = this.findRelevantTodos(
        operation,
        activeTodos,
        context,
      );

      if (relevantTodos.length === 0) {
        if (this.strictMode) {
          throw new Error(
            `Todo Enforcement: No relevant todos found for operation ${operation}`,
          );
        } else {
          logger.warn(`Warning: No relevant todos for ${operation}`);
          return { valid: true, warning: true };
        }
      }

      logger.info(
        `Todo validation passed: Found ${relevantTodos.length} relevant todos`,
      );
      return { valid: true, relevantTodos, warning: false };
    } catch (error) {
      logger.error("Todo validation failed:", error);
      throw error;
    }
  }

  /**
   * Create a todo for MCP bridge operations
   */
  async createTodoForOperation(operation, details = {}) {
    const todo = {
      id: `mcp-bridge-${Date.now()}`,
      content: `MCP Bridge: ${operation} - ${details.description || operation}`,
      status: "in_progress",
      priority: details.priority || "medium",
      agentId: "mcp-client-bridge",
      operation: operation,
      details: details,
      createdAt: new Date().toISOString(),
    };

    const todos = await this.loadTodos();
    todos.push(todo);
    await this.saveTodos(todos);

    logger.info(`Created todo for MCP operation: ${todo.content}`);
    return todo;
  }

  /**
   * Update todo status after operation completion
   */
  async updateTodoStatus(operation, result, todoId = null) {
    const todos = await this.loadTodos();
    const targetTodo = todoId
      ? todos.find((t) => t.id === todoId)
      : todos.find(
          (t) => t.operation === operation && t.status === "in_progress",
        );

    if (targetTodo) {
      targetTodo.status = result.success ? "completed" : "cancelled";
      targetTodo.updatedAt = new Date().toISOString();
      targetTodo.result = result;

      await this.saveTodos(todos);
      logger.info(
        `Updated todo ${targetTodo.id} status to: ${targetTodo.status}`,
      );

      return targetTodo;
    }

    return null;
  }

  /**
   * Find todos relevant to an operation
   */
  findRelevantTodos(operation, todos, context) {
    return todos.filter((todo) => {
      const operationLower = operation.toLowerCase();
      const todoContent = (todo.content || "").toLowerCase();

      // Direct operation match
      if (todoContent.includes(operationLower)) {
        return true;
      }

      // Context-based matching
      if (
        context.serverId &&
        todoContent.includes(context.serverId.toLowerCase())
      ) {
        return true;
      }

      if (
        context.toolName &&
        todoContent.includes(context.toolName.toLowerCase())
      ) {
        return true;
      }

      // MCP-specific matching
      if (operationLower.includes("mcp") && todoContent.includes("mcp")) {
        return true;
      }

      return false;
    });
  }

  /**
   * Load todos from shared storage
   */
  async loadTodos() {
    try {
      if (await this.fileExists(this.todosPath)) {
        const data = await fs.readFile(this.todosPath, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      logger.warn("Could not load todos:", error.message);
    }

    return [];
  }

  /**
   * Save todos to shared storage
   */
  async saveTodos(todos) {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.todosPath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(this.todosPath, JSON.stringify(todos, null, 2));
    } catch (error) {
      logger.error("Could not save todos:", error);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get compliance metrics for MCP bridge
   */
  async getComplianceMetrics() {
    const todos = await this.loadTodos();
    const bridgeTodos = todos.filter(
      (todo) => todo.agentId === "mcp-client-bridge",
    );

    const activeTodos = bridgeTodos.filter(
      (todo) => todo.status === "in_progress",
    );
    const completedTodos = bridgeTodos.filter(
      (todo) => todo.status === "completed",
    );

    return {
      totalTodos: bridgeTodos.length,
      activeTodos: activeTodos.length,
      completedTodos: completedTodos.length,
      complianceRate:
        bridgeTodos.length > 0
          ? Math.round((completedTodos.length / bridgeTodos.length) * 100)
          : 0,
    };
  }
}

module.exports = TodoEnforcementService;
