#!/usr/bin/env node

/**
 * Unified LLM Coordinator with Integrated Todo Management
 *
 * This is the central authority for all LLM coordination and todo management.
 * It absorbs all todo CLI functionality and enforces todo requirements for all operations.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

class UnifiedLLMCoordinator {
  constructor(repositoryPath = process.cwd()) {
    this.repositoryPath = repositoryPath;
    this.lockFile = path.join(repositoryPath, ".llm-coordination.json");
    this.sessionId = this.generateSessionId();
    this.currentUser = this.getCurrentUser();
    this.currentSession = null;

    // Todo system integration
    this.sharedKnowledgePath = path.join(
      repositoryPath,
      "data",
      "shared-knowledge",
      ".mcp-shared-knowledge",
    );
    this.todoService = this.initializeTodoService();

    // Enforcement settings
    this.strictMode = process.env.TODO_ENFORCEMENT_STRICT === "true";
    this.enforcementEnabled = process.env.TODO_ENFORCEMENT_ENABLED !== "false";
  }

  /**
   * Initialize todo service (absorbed from shared-todo-service.js)
   */
  initializeTodoService() {
    const todosPath = path.join(
      this.sharedKnowledgePath,
      "tasks",
      "shared_tasks.json",
    );

    // Ensure directory exists
    const dir = path.dirname(todosPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return {
      todosPath,

      async loadData() {
        try {
          if (fs.existsSync(this.todosPath)) {
            const data = fs.readFileSync(this.todosPath, "utf8");
            return JSON.parse(data);
          }
        } catch (error) {
          console.warn("Could not load todos:", error.message);
        }
        return {
          tasks: [],
          audit: [],
          metadata: { totalTasks: 0, lastUpdated: Date.now() },
        };
      },

      async saveData(data) {
        try {
          data.metadata.lastUpdated = Date.now();
          fs.writeFileSync(this.todosPath, JSON.stringify(data, null, 2));
          return true;
        } catch (error) {
          console.error("Could not save todos:", error.message);
          return false;
        }
      },

      async createTodo(todoData, agentId) {
        const data = await this.loadData();
        const todo = {
          id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...todoData,
          createdBy: agentId,
          createdAt: new Date().toISOString(),
          status: todoData.status || "pending",
          priority: todoData.priority || "medium",
          category: todoData.category || "general",
        };

        data.tasks.push(todo);
        await this.saveData(data);
        return todo;
      },

      async getActiveTodos(agentId = null) {
        const data = await this.loadData();
        return data.tasks.filter(
          (todo) =>
            todo.status === "in_progress" &&
            (!agentId || todo.assignedTo === agentId),
        );
      },

      async getPendingTodos(agentId = null) {
        const data = await this.loadData();
        return data.tasks.filter(
          (todo) =>
            todo.status === "pending" &&
            (!agentId || todo.assignedTo === agentId),
        );
      },

      async startTodo(todoId, agentId) {
        const data = await this.loadData();
        const todo = data.tasks.find((t) => t.id === todoId);

        if (!todo) {
          throw new Error(`Todo ${todoId} not found`);
        }

        todo.status = "in_progress";
        todo.startedAt = new Date().toISOString();
        todo.assignedTo = agentId;
        todo.assignedAt = new Date().toISOString();

        await this.saveData(data);
        return todo;
      },

      async completeTodo(todoId, agentId, result = {}) {
        const data = await this.loadData();
        const todo = data.tasks.find((t) => t.id === todoId);

        if (!todo) {
          throw new Error(`Todo ${todoId} not found`);
        }

        todo.status = "completed";
        todo.completedAt = new Date().toISOString();
        todo.completedBy = agentId;
        todo.result = result;

        await this.saveData(data);
        return todo;
      },

      async getAllAgents() {
        const data = await this.loadData();
        const agents = new Set();

        data.tasks.forEach((todo) => {
          if (todo.createdBy) agents.add(todo.createdBy);
          if (todo.assignedTo) agents.add(todo.assignedTo);
        });

        return Array.from(agents);
      },

      async getSystemStats() {
        const data = await this.loadData();
        const agents = await this.getAllAgents();

        return {
          totalTasks: data.tasks.length,
          activeTasks: data.tasks.filter((t) => t.status === "in_progress")
            .length,
          completedTasks: data.tasks.filter((t) => t.status === "completed")
            .length,
          pendingTasks: data.tasks.filter((t) => t.status === "pending").length,
          agentCount: agents.length,
          metadata: data.metadata,
        };
      },
    };
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId() {
    return `llm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current user information
   */
  getCurrentUser() {
    try {
      const name = execSync("git config user.name", {
        encoding: "utf8",
      }).trim();
      const email = execSync("git config user.email", {
        encoding: "utf8",
      }).trim();
      return { name, email };
    } catch (error) {
      return {
        name: process.env.USER || process.env.USERNAME || "Unknown",
        email: "unknown@example.com",
      };
    }
  }

  /**
   * Load coordination data
   */
  loadCoordinationData() {
    try {
      if (fs.existsSync(this.lockFile)) {
        const data = fs.readFileSync(this.lockFile, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn("⚠️  Could not load coordination data:", error.message);
    }
    return { sessions: {}, branches: {}, todoCompliance: {} };
  }

  /**
   * Save coordination data
   */
  saveCoordinationData(data) {
    try {
      fs.writeFileSync(this.lockFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("❌ Could not save coordination data:", error.message);
    }
  }

  // ========================================
  // TODO MANAGEMENT METHODS (absorbed from CLI)
  // ========================================

  /**
   * Create a new todo
   */
  async createTodo(agentId, title, options = {}) {
    console.log(`📝 Creating todo for agent ${agentId}: ${title}`);

    const todo = await this.todoService.createTodo(
      {
        title,
        description: options.description || title,
        priority: options.priority || "medium",
        category: options.category || "general",
        context: options.context || {},
        ...options,
      },
      agentId,
    );

    console.log(`✅ Created todo: ${title}`);
    console.log(`   ID: ${todo.id}`);
    console.log(`   Priority: ${todo.priority}`);
    console.log(`   Status: ${todo.status}`);

    return todo;
  }

  /**
   * Start working on a todo
   */
  async startTodo(agentId, todoId) {
    console.log(`▶️ Starting work on todo ${todoId} by ${agentId}`);

    try {
      const todo = await this.todoService.startTodo(todoId, agentId);
      console.log(`✅ Started working on: ${todo.title}`);
      console.log(
        `   Started at: ${new Date(todo.startedAt).toLocaleString()}`,
      );
      return todo;
    } catch (error) {
      console.error(`❌ Failed to start todo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Complete a todo
   */
  async completeTodo(agentId, todoId, result = {}) {
    console.log(`🏁 Completing todo ${todoId} by ${agentId}`);

    try {
      const todo = await this.todoService.completeTodo(todoId, agentId, result);
      console.log(`✅ Completed: ${todo.title}`);
      console.log(
        `   Completed at: ${new Date(todo.completedAt).toLocaleString()}`,
      );
      return todo;
    } catch (error) {
      console.error(`❌ Failed to complete todo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Show todo status
   */
  async showTodoStatus(agentId = null) {
    console.log("📊 Todo System Status\n");

    const systemStats = await this.todoService.getSystemStats();
    const allAgents = await this.todoService.getAllAgents();

    console.log(`System Overview:`);
    console.log(`  Total Todos: ${systemStats.totalTasks}`);
    console.log(`  Active Todos: ${systemStats.activeTasks}`);
    console.log(`  Pending Todos: ${systemStats.pendingTasks}`);
    console.log(`  Completed Todos: ${systemStats.completedTasks}`);
    console.log(`  Total Agents: ${allAgents.length}`);
    console.log(
      `  Last Updated: ${new Date(systemStats.metadata.lastUpdated).toLocaleString()}\n`,
    );

    // Show todos by status
    const data = await this.todoService.loadData();

    if (agentId) {
      console.log(`🤖 Todos for ${agentId}:`);
      const agentTodos = data.tasks.filter(
        (t) => t.assignedTo === agentId || t.createdBy === agentId,
      );

      if (agentTodos.length === 0) {
        console.log("  No todos found for this agent");
      } else {
        agentTodos.forEach((todo) => {
          const status =
            todo.status === "completed"
              ? "✅"
              : todo.status === "in_progress"
                ? "🔄"
                : "⏳";
          console.log(`  ${status} ${todo.title} (${todo.id})`);
          console.log(
            `     Priority: ${todo.priority} | Category: ${todo.category}`,
          );
        });
      }
    } else {
      // Show all active todos
      console.log("🔄 Active Todos:");
      const activeTodos = data.tasks.filter((t) => t.status === "in_progress");
      if (activeTodos.length === 0) {
        console.log("  No active todos");
      } else {
        activeTodos.forEach((todo) => {
          console.log(`  🔄 ${todo.title} (${todo.id})`);
          console.log(`     Assigned to: ${todo.assignedTo || "Unassigned"}`);
          console.log(
            `     Started: ${new Date(todo.startedAt).toLocaleString()}`,
          );
        });
      }
    }
  }

  // ========================================
  // TODO ENFORCEMENT METHODS
  // ========================================

  /**
   * Validate that a todo exists for the current operation
   */
  async validateTodoForOperation(operation, agentId, context = {}) {
    if (!this.enforcementEnabled) {
      return { valid: true, reason: "enforcement-disabled" };
    }

    console.log(
      `🔍 Validating todo for operation: ${operation} by agent: ${agentId}`,
    );

    // Check if agent has active todos
    const activeTodos = await this.todoService.getActiveTodos(agentId);

    if (activeTodos.length === 0) {
      if (this.strictMode) {
        throw new Error(
          this.buildTodoErrorMessage(
            "no_active_todos",
            agentId,
            operation,
            context,
          ),
        );
      } else {
        console.warn(`⚠️ Warning: No active todos for ${agentId}`);
        return { valid: true, warning: true, reason: "no_active_todos" };
      }
    }

    // Check if current operation aligns with active todos
    const relevantTodos = this.findRelevantTodos(
      operation,
      activeTodos,
      context,
    );

    if (relevantTodos.length === 0) {
      if (this.strictMode) {
        throw new Error(
          this.buildTodoErrorMessage(
            "no_relevant_todos",
            agentId,
            operation,
            context,
            activeTodos,
          ),
        );
      } else {
        console.warn(
          `⚠️ Warning: No relevant todos for operation '${operation}'`,
        );
        return { valid: true, warning: true, reason: "no_relevant_todos" };
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
  buildTodoErrorMessage(
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
        solution: `Create a todo first using: node llm-coordinator-unified.js create ${agentId} "${operation}"`,
      },
      no_relevant_todos: {
        reason: `No relevant todos found for operation '${operation}'`,
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
    message += `   • Source: Unified LLM Coordinator\n\n`;

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
    message += `   node llm-coordinator-unified.js create ${agentId} "${operation}"\n\n`;

    message += `📊 CHECK STATUS:\n`;
    message += `   node llm-coordinator-unified.js status\n\n`;

    message += `⚙️ IF THIS IS A FALSE POSITIVE:\n`;
    message += `   Set environment variable: TODO_ENFORCEMENT_STRICT=false\n\n`;

    message += `🚨 This operation has been BLOCKED to maintain system accountability.`;

    return message;
  }

  /**
   * Find todos relevant to the current operation
   */
  findRelevantTodos(operation, todos, context) {
    return todos.filter((todo) => {
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

      return false;
    });
  }

  // ========================================
  // COORDINATION METHODS
  // ========================================

  /**
   * Register current LLM session with todo validation
   */
  async registerSession(project, branch, activity = "working") {
    console.log(`🤖 Registering LLM session with unified todo enforcement...`);

    // Validate todos for session registration
    await this.validateTodoForOperation(
      `session-registration: ${activity}`,
      this.sessionId,
      {
        project,
        branch,
        operation: "register",
      },
    );

    const data = this.loadCoordinationData();
    this.cleanupExpiredSessions(data);

    // Register current session
    this.currentSession = {
      user: this.currentUser,
      project: project,
      branch: branch,
      activity: activity,
      startTime: Date.now(),
      lastActivity: Date.now(),
    };

    data.sessions[this.sessionId] = this.currentSession;

    // Track branch usage
    if (!data.branches[branch]) {
      data.branches[branch] = [];
    }

    // Remove this session from other branches
    Object.keys(data.branches).forEach((br) => {
      data.branches[br] = data.branches[br].filter(
        (id) => id !== this.sessionId,
      );
    });

    // Add to current branch
    if (!data.branches[branch].includes(this.sessionId)) {
      data.branches[branch].push(this.sessionId);
    }

    this.saveCoordinationData(data);
    console.log(
      `✅ Registered LLM session: ${this.currentUser.name} working on ${project}/${branch}`,
    );

    return { sessionId: this.sessionId };
  }

  /**
   * Execute coordinated operation with todo validation
   */
  async executeOperation(operation, context = {}) {
    console.log(`🚀 Executing coordinated operation: ${operation}`);

    // Step 1: Todo validation
    await this.validateTodoForOperation(operation, this.sessionId, {
      ...context,
      operation: "execute",
    });

    // Step 2: Check coordination conflicts
    const data = this.loadCoordinationData();
    this.cleanupExpiredSessions(data);

    const currentSession = this.currentSession || data.sessions[this.sessionId];
    if (!currentSession) {
      throw new Error("No active session found. Register session first.");
    }

    // Step 3: Update session activity
    currentSession.activity = `executing: ${operation}`;
    currentSession.lastActivity = Date.now();
    this.currentSession = currentSession;
    data.sessions[this.sessionId] = currentSession;
    this.saveCoordinationData(data);

    console.log(`✅ Operation validated and coordinated`);
    return {
      success: true,
      sessionId: this.sessionId,
      operation,
      context,
    };
  }

  /**
   * Complete operation and update todos
   */
  async completeOperation(operation, result = {}) {
    console.log(`🏁 Completing coordinated operation: ${operation}`);

    // Update session activity
    const data = this.loadCoordinationData();
    if (data.sessions[this.sessionId]) {
      data.sessions[this.sessionId].activity = "completed: " + operation;
      data.sessions[this.sessionId].lastActivity = Date.now();
      this.saveCoordinationData(data);
    }

    // Find and complete relevant todo
    const activeTodos = await this.todoService.getActiveTodos(this.sessionId);
    const relevantTodo = this.findRelevantTodos(operation, activeTodos, {})[0];

    if (relevantTodo) {
      await this.completeTodo(this.sessionId, relevantTodo.id, {
        operation,
        result,
        completedAt: new Date().toISOString(),
      });
    }

    console.log(`✅ Operation completed`);
    return { success: true, operation, result };
  }

  /**
   * Get current git branch
   */
  getCurrentBranch() {
    try {
      return execSync("git branch --show-current", { encoding: "utf8" }).trim();
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * Check if session is still active
   */
  isSessionActive(session, timeoutMinutes = 120) {
    const now = Date.now();
    const lastActivity = session.lastActivity || session.startTime;
    const minutesSinceActivity = (now - lastActivity) / (1000 * 60);
    return minutesSinceActivity < timeoutMinutes;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(data) {
    const expiredIds = [];

    Object.entries(data.sessions).forEach(([id, session]) => {
      if (!this.isSessionActive(session)) {
        expiredIds.push(id);
      }
    });

    // Remove expired sessions
    expiredIds.forEach((id) => {
      delete data.sessions[id];

      // Remove from branches
      Object.keys(data.branches).forEach((branch) => {
        data.branches[branch] = data.branches[branch].filter(
          (sessionId) => sessionId !== id,
        );
        if (data.branches[branch].length === 0) {
          delete data.branches[branch];
        }
      });
    });

    if (expiredIds.length > 0) {
      console.log(`🧹 Cleaned up ${expiredIds.length} expired LLM sessions`);
    }
  }

  /**
   * Get comprehensive status
   */
  async getStatus() {
    console.log("\n🤖 Unified LLM Coordinator Status");
    console.log("=".repeat(60));

    const data = this.loadCoordinationData();
    this.cleanupExpiredSessions(data);

    // Current session
    if (data.sessions[this.sessionId]) {
      const session = data.sessions[this.sessionId];
      console.log(`\n📍 Your Session:`);
      console.log(`   User: ${session.user.name} <${session.user.email}>`);
      console.log(`   Project: ${session.project}`);
      console.log(`   Branch: ${session.branch}`);
      console.log(`   Activity: ${session.activity}`);
      console.log(
        `   Started: ${new Date(session.startTime).toLocaleString()}`,
      );
    }

    // Active sessions by branch
    console.log(`\n🌿 Branch Activity:`);
    const activeBranches = Object.keys(data.branches).filter((branch) =>
      data.branches[branch].some(
        (id) => data.sessions[id] && this.isSessionActive(data.sessions[id]),
      ),
    );

    if (activeBranches.length === 0) {
      console.log(`   No active LLM sessions on any branches`);
    } else {
      activeBranches.forEach((branch) => {
        const activeSessions = data.branches[branch].filter(
          (id) => data.sessions[id] && this.isSessionActive(data.sessions[id]),
        );

        console.log(`   ${branch}: ${activeSessions.length} active session(s)`);
        activeSessions.forEach((id) => {
          const session = data.sessions[id];
          const isCurrent = id === this.sessionId;
          const marker = isCurrent ? "👤" : "🤖";
          console.log(
            `     ${marker} ${session.user.name} - ${session.activity}`,
          );
        });
      });
    }

    // Todo status
    await this.showTodoStatus();

    console.log("\n" + "=".repeat(60));
  }

  /**
   * Unregister session
   */
  async unregisterSession() {
    console.log(`👋 Unregistering LLM session...`);

    const data = this.loadCoordinationData();

    // Remove from sessions
    delete data.sessions[this.sessionId];

    // Remove from branches
    Object.keys(data.branches).forEach((branch) => {
      data.branches[branch] = data.branches[branch].filter(
        (id) => id !== this.sessionId,
      );
      if (data.branches[branch].length === 0) {
        delete data.branches[branch];
      }
    });

    this.saveCoordinationData(data);
    console.log(`👋 Unregistered LLM session: ${this.currentUser.name}`);
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const coordinator = new UnifiedLLMCoordinator();
  const args = process.argv.slice(2);
  const command = args[0];

  const runCommand = async () => {
    try {
      switch (command) {
        // Todo Management Commands
        case "create":
          const agentId = args[1] || "unknown-agent";
          const title = args[2] || "Untitled todo";
          const options = {};
          if (args.includes("--high")) options.priority = "high";
          if (args.includes("--low")) options.priority = "low";
          await coordinator.createTodo(agentId, title, options);
          break;

        case "start":
          const startAgentId = args[1] || "unknown-agent";
          const todoId = args[2];
          if (!todoId) {
            console.error("❌ Usage: start <agent-id> <todo-id>");
            process.exit(1);
          }
          await coordinator.startTodo(startAgentId, todoId);
          break;

        case "complete":
          const completeAgentId = args[1] || "unknown-agent";
          const completeTodoId = args[2];
          if (!completeTodoId) {
            console.error("❌ Usage: complete <agent-id> <todo-id>");
            process.exit(1);
          }
          await coordinator.completeTodo(completeAgentId, completeTodoId);
          break;

        case "todos":
        case "todo-status":
          const statusAgentId = args[1];
          await coordinator.showTodoStatus(statusAgentId);
          break;

        // Coordination Commands
        case "register":
          const project = args[1] || "mcp-ecosystem";
          const branch = args[2] || coordinator.getCurrentBranch();
          const activity = args[3] || "working";
          await coordinator.registerSession(project, branch, activity);
          break;

        case "execute":
          const operation = args[1];
          if (!operation) {
            console.error("❌ Usage: execute <operation>");
            process.exit(1);
          }
          const context = {};
          if (args[2]) {
            try {
              Object.assign(context, JSON.parse(args[2]));
            } catch (e) {
              console.error("❌ Invalid JSON context");
              process.exit(1);
            }
          }
          await coordinator.executeOperation(operation, context);
          break;

        case "complete-op":
          const completedOperation = args[1];
          if (!completedOperation) {
            console.error("❌ Usage: complete-op <operation>");
            process.exit(1);
          }
          await coordinator.completeOperation(completedOperation);
          break;

        case "status":
          await coordinator.getStatus();
          break;

        case "unregister":
          await coordinator.unregisterSession();
          break;

        default:
          console.log("🤖 Unified LLM Coordinator");
          console.log("");
          console.log("TODO MANAGEMENT:");
          console.log(
            "  create <agent-id> <title> [options]  - Create new todo",
          );
          console.log(
            "  start <agent-id> <todo-id>           - Start working on todo",
          );
          console.log("  complete <agent-id> <todo-id>        - Complete todo");
          console.log(
            "  todo-status [agent-id]                - Show todo status",
          );
          console.log("");
          console.log("COORDINATION:");
          console.log(
            "  register [project] [branch] [activity] - Register session",
          );
          console.log(
            "  execute <operation> [context]         - Execute coordinated operation",
          );
          console.log(
            "  complete-op <operation>                - Complete operation",
          );
          console.log(
            "  status                                 - Show comprehensive status",
          );
          console.log(
            "  unregister                             - Unregister session",
          );
          console.log("");
          console.log("EXAMPLES:");
          console.log('  create my-agent "Implement user auth" --high');
          console.log("  start my-agent todo-12345");
          console.log('  register my-project develop "working on auth"');
          console.log('  execute "implement-auth" \'{"file": "auth.js"}\'');
          console.log("  complete-op implement-auth");
          break;
      }
    } catch (error) {
      console.error("❌ Command failed:", error.message);
      process.exit(1);
    }
  };

  runCommand();
}

export default UnifiedLLMCoordinator;
