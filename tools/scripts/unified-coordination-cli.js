#!/usr/bin/env node

/**
 * Unified Coordination CLI - LLM Session & Todo Management
 *
 * This CLI combines LLM coordination (session tracking and conflict prevention)
 * with shared todo management to provide comprehensive development coordination.
 *
 * Features:
 * - LLM session tracking and branch conflict prevention
 * - Shared todo management with agent assignment
 * - Integrated status showing both sessions and todos
 * - Smart conflict detection considering both sessions and assignments
 */

import fs from "fs";
import path from "path";
import LLMCoordinator from "./llm-coordination.js";
import SharedTodoService from "./shared-todo-service.js";
import CoordinationEnforcer from "./coordination-enforcer.js";

class UnifiedCoordinationCLI {
  constructor() {
    this.repositoryPath = process.cwd();
    this.sharedKnowledgePath = path.join(
      this.repositoryPath,
      "data",
      "shared-knowledge",
      ".mcp-shared-knowledge",
    );

    // Initialize both services
    this.llmCoordinator = new LLMCoordinator(this.repositoryPath);
    this.todoService = new SharedTodoService(this.sharedKnowledgePath);
    this.enforcer = new CoordinationEnforcer(this.repositoryPath);

    // Get current user info
    this.currentUser = this.getCurrentUser();
    this.currentAgentId = this.currentUser.name
      .toLowerCase()
      .replace(/\s+/g, "-");
  }

  /**
   * Get current user information
   */
  getCurrentUser() {
    try {
      const name = process.env.USER || process.env.USERNAME || "Unknown";
      const email = `${name.toLowerCase()}@local`;
      return { name, email };
    } catch (error) {
      return { name: "Unknown", email: "unknown@local" };
    }
  }

  /**
   * Show comprehensive coordination status
   */
  async showStatus(agentId = null) {
    console.log("🤖 Unified Coordination System Status\n");
    console.log("=".repeat(60));

    // LLM Coordination Status
    console.log("\n🧠 LLM Coordination:");
    const llmData = this.llmCoordinator.loadCoordinationData();
    this.llmCoordinator.cleanupExpiredSessions(llmData);

    const activeSessions = Object.values(llmData.sessions).filter((session) =>
      this.llmCoordinator.isSessionActive(session),
    );

    if (activeSessions.length === 0) {
      console.log("  No active LLM sessions");
    } else {
      activeSessions.forEach((session) => {
        const isCurrent = session.user.name === this.currentUser.name;
        const marker = isCurrent ? "👤" : "🤖";
        console.log(
          `  ${marker} ${session.user.name}: ${session.activity} on ${session.branch}`,
        );
      });
    }

    // Branch Activity
    console.log("\n🌿 Branch Activity:");
    const activeBranches = Object.keys(llmData.branches).filter((branch) =>
      llmData.branches[branch].some(
        (id) =>
          llmData.sessions[id] &&
          this.llmCoordinator.isSessionActive(llmData.sessions[id]),
      ),
    );

    if (activeBranches.length === 0) {
      console.log("  No active branches");
    } else {
      activeBranches.forEach((branch) => {
        const sessionCount = llmData.branches[branch].filter(
          (id) =>
            llmData.sessions[id] &&
            this.llmCoordinator.isSessionActive(llmData.sessions[id]),
        ).length;
        console.log(`  ${branch}: ${sessionCount} active session(s)`);
      });
    }

    // Todo System Status
    console.log("\n📋 Todo System:");
    const systemStats = await this.todoService.getSystemStats();
    const allAgents = await this.todoService.getAllAgents();

    console.log(`  Total Todos: ${systemStats.metadata?.totalTasks || 0}`);
    console.log(`  Active Todos: ${systemStats.metadata?.activeTasks || 0}`);
    console.log(
      `  Completed Todos: ${systemStats.metadata?.completedTasks || 0}`,
    );
    console.log(`  Total Agents: ${systemStats.agentCount || 0}`);

    // Agent Status
    console.log("\n👥 Agent Status:");
    if (Object.keys(allAgents).length === 0) {
      console.log("  No agents registered yet");
    } else {
      for (const [id, stats] of Object.entries(allAgents)) {
        const session = activeSessions.find(
          (s) => s.user.name.toLowerCase().replace(/\s+/g, "-") === id,
        );
        const sessionStatus = session ? ` (${session.activity})` : "";
        const status = stats.activeTasks > 0 ? "🟢 Active" : "⚪ Idle";
        console.log(
          `  ${id}: ${status}${sessionStatus} (${stats.totalCompleted}/${stats.totalAssigned} completed)`,
        );
      }
    }

    // Current Agent Focus
    if (agentId) {
      console.log(`\n🎯 Agent ${agentId} Focus:`);
      const agentStats = await this.todoService.getAgentStats(agentId);
      const assignedTodos = await this.todoService.getAssignedTodos(agentId);

      console.log(`  Active Tasks: ${agentStats.activeTasks}`);
      console.log(
        `  Completion Rate: ${agentStats.completionRate?.toFixed(1) || 0}%`,
      );

      if (assignedTodos.length > 0) {
        console.log("  Current Work:");
        assignedTodos.slice(0, 3).forEach((todo) => {
          const priority =
            todo.priority === "high"
              ? "🔴"
              : todo.priority === "medium"
                ? "🟡"
                : "🟢";
          console.log(`    ${priority} ${todo.title}`);
        });
      }
    }

    // Active Todos
    const activeTodos = agentId
      ? await this.todoService.getActiveTodos(agentId)
      : await this.todoService.getTodosForAgent(null, {
          status: "in_progress",
        });

    if (activeTodos.length > 0) {
      console.log(`\n📝 Active Todos${agentId ? ` for ${agentId}` : ""}:`);
      activeTodos.slice(0, 5).forEach((todo) => {
        const assigned = todo.assignedTo ? ` 👤 ${todo.assignedTo}` : "";
        const priority =
          todo.priority === "high"
            ? "🔴"
            : todo.priority === "medium"
              ? "🟡"
              : "🟢";
        console.log(`  ${priority} ${todo.id}: ${todo.title}${assigned}`);
      });
      if (activeTodos.length > 5) {
        console.log(`  ... and ${activeTodos.length - 5} more`);
      }
    }

    console.log("\n" + "=".repeat(60));
  }

  /**
   * Start coordinated work session
   */
  async startWork(agentId, taskDescription, options = {}) {
    console.log(`🚀 Starting coordinated work session for ${agentId}`);
    console.log(`   Task: ${taskDescription}`);

    const project = options.project || "mcp-ecosystem";
    const branch = options.branch || this.llmCoordinator.getCurrentBranch();

    // Register LLM session
    this.llmCoordinator.registerSession(
      project,
      branch,
      `working on: ${taskDescription}`,
    );

    // Create todo if requested
    if (options.createTodo) {
      const todoTitle = options.todoTitle || taskDescription;
      const todoOptions = {
        description: options.description || taskDescription,
        priority: options.priority || "medium",
        category: options.category || "development",
      };

      const todo = await this.createTodo(agentId, todoTitle, todoOptions);
      console.log(`📋 Created todo: ${todo.id}`);

      // Assign and start the todo
      await this.assignTodo(agentId, todo.id, agentId);
      await this.startTodo(agentId, todo.id);

      return { session: true, todo: todo };
    }

    console.log(`✅ Session registered for ${agentId} on branch ${branch}`);
    return { session: true, todo: null };
  }

  /**
   * End coordinated work session
   */
  async endWork(agentId, completionData = {}) {
    console.log(`🏁 Ending coordinated work session for ${agentId}`);

    // Complete active todos if requested
    if (completionData.completeTodos) {
      const assignedTodos = await this.todoService.getAssignedTodos(agentId);
      const activeTodos = assignedTodos.filter(
        (todo) => todo.status === "in_progress",
      );

      for (const todo of activeTodos) {
        await this.completeTodo(agentId, todo.id, completionData);
      }
    }

    // Unregister LLM session
    this.llmCoordinator.unregisterSession();

    console.log(`✅ Work session ended for ${agentId}`);
  }

  /**
   * Check for coordination conflicts
   */
  async checkConflicts(targetBranch, agentId = null) {
    console.log(
      `🔍 Checking coordination conflicts for branch: ${targetBranch}`,
    );

    let conflicts = [];

    // Check LLM coordination conflicts
    const canSwitch = this.llmCoordinator.checkBranchSwitch(targetBranch);
    if (!canSwitch) {
      conflicts.push({
        type: "llm_session",
        message: `LLM session conflict on branch ${targetBranch}`,
        severity: "high",
      });
    }

    // Check todo assignment conflicts
    if (agentId) {
      const assignedTodos = await this.todoService.getAssignedTodos(agentId);
      const branchSpecificTodos = assignedTodos.filter(
        (todo) =>
          todo.metadata?.branch === targetBranch &&
          todo.status === "in_progress",
      );

      if (branchSpecificTodos.length > 0) {
        conflicts.push({
          type: "todo_assignment",
          message: `${branchSpecificTodos.length} active todos assigned to ${agentId} on branch ${targetBranch}`,
          severity: "medium",
          todos: branchSpecificTodos.map((t) => t.id),
        });
      }
    }

    // Check for other agents working on the same branch
    const llmData = this.llmCoordinator.loadCoordinationData();
    const branchSessions = llmData.branches[targetBranch] || [];
    const activeBranchSessions = branchSessions.filter(
      (id) =>
        llmData.sessions[id] &&
        this.llmCoordinator.isSessionActive(llmData.sessions[id]) &&
        llmData.sessions[id].user.name !== this.currentUser.name,
    );

    if (activeBranchSessions.length > 0) {
      conflicts.push({
        type: "branch_activity",
        message: `${activeBranchSessions.length} other LLM(s) actively working on branch ${targetBranch}`,
        severity: "medium",
        users: activeBranchSessions.map((id) => llmData.sessions[id].user.name),
      });
    }

    if (conflicts.length === 0) {
      console.log(
        `✅ No coordination conflicts found for branch ${targetBranch}`,
      );
      return { safe: true, conflicts: [] };
    }

    console.log(`⚠️ Found ${conflicts.length} coordination conflict(s):`);
    conflicts.forEach((conflict, index) => {
      const severity = conflict.severity === "high" ? "🔴" : "🟡";
      console.log(`  ${index + 1}. ${severity} ${conflict.message}`);
    });

    return { safe: false, conflicts };
  }

  /**
   * Create a new todo
   */
  async createTodo(agentId, title, options = {}) {
    console.log(`📝 Creating todo: ${title}`);

    const todo = await this.todoService.createTodo(agentId, {
      title: title,
      description: options.description || title,
      priority: options.priority || "medium",
      category: options.category || "development",
      tags: options.tags || [],
      metadata: {
        branch: this.llmCoordinator.getCurrentBranch(),
        sessionId: this.llmCoordinator.sessionId,
        ...options.metadata,
      },
    });

    console.log(`✅ Created todo: ${todo.id}`);
    return todo;
  }

  /**
   * Assign a todo to an agent
   */
  async assignTodo(assignerId, todoId, assigneeId) {
    console.log(`👤 Assigning todo ${todoId} to ${assigneeId}`);

    const todo = await this.todoService.assignTodo(
      todoId,
      assigneeId,
      assignerId,
    );
    console.log(`✅ Assigned todo: ${todo.title} to ${assigneeId}`);
    return todo;
  }

  /**
   * Start working on a todo
   */
  async startTodo(agentId, todoId) {
    console.log(`▶️ Starting work on todo ${todoId}`);

    const todo = await this.todoService.startTodo(todoId, agentId);
    console.log(`✅ Started working on: ${todo.title}`);

    // Update LLM activity
    this.llmCoordinator.updateActivity(`working on: ${todo.title}`);

    return todo;
  }

  /**
   * Complete a todo
   */
  async completeTodo(agentId, todoId, completionData = {}) {
    console.log(`✅ Completing todo ${todoId}`);

    const todo = await this.todoService.completeTodo(todoId, agentId, {
      result: completionData.result || "completed",
      notes: completionData.notes || "",
      actualTime: completionData.actualTime,
    });

    console.log(`✅ Completed todo: ${todo.title}`);

    // Update LLM activity
    this.llmCoordinator.updateActivity(`completed: ${todo.title}`);

    return todo;
  }

  /**
   * Show detailed coordination information
   */
  async showDetails(agentId = null) {
    console.log("📊 Detailed Coordination Information\n");
    console.log("=".repeat(60));

    // LLM Session Details
    console.log("\n🧠 LLM Session Details:");
    const llmData = this.llmCoordinator.loadCoordinationData();
    this.llmCoordinator.cleanupExpiredSessions(llmData);

    const allSessions = Object.values(llmData.sessions);
    if (allSessions.length === 0) {
      console.log("  No LLM sessions recorded");
    } else {
      allSessions.forEach((session) => {
        const isActive = this.llmCoordinator.isSessionActive(session);
        const status = isActive ? "🟢 Active" : "⚪ Inactive";
        const lastActivity = new Date(
          session.lastActivity || session.startTime,
        ).toLocaleString();
        console.log(
          `  ${status} ${session.user.name}: ${session.activity} (${lastActivity})`,
        );
      });
    }

    // Branch Details
    console.log("\n🌿 Branch Details:");
    Object.entries(llmData.branches).forEach(([branch, sessionIds]) => {
      const activeCount = sessionIds.filter(
        (id) =>
          llmData.sessions[id] &&
          this.llmCoordinator.isSessionActive(llmData.sessions[id]),
      ).length;
      console.log(
        `  ${branch}: ${activeCount}/${sessionIds.length} active sessions`,
      );
    });

    // Todo Details
    if (agentId) {
      console.log(`\n📋 Todo Details for ${agentId}:`);
      const agentStats = await this.todoService.getAgentStats(agentId);
      const assignedTodos = await this.todoService.getAssignedTodos(agentId);

      console.log(
        `  Statistics: ${agentStats.totalCompleted}/${agentStats.totalAssigned} completed`,
      );
      console.log(`  Active Tasks: ${agentStats.activeTasks}`);

      if (assignedTodos.length > 0) {
        console.log("  Assigned Todos:");
        assignedTodos.forEach((todo) => {
          const status =
            todo.status === "completed"
              ? "✅"
              : todo.status === "in_progress"
                ? "▶️"
                : "📝";
          console.log(
            `    ${status} ${todo.id}: ${todo.title} (${todo.priority})`,
          );
        });
      }
    }

    console.log("\n" + "=".repeat(60));
  }

  /**
   * Parse command line options
   */
  parseOptions(args) {
    const options = {};
    args.forEach((arg) => {
      if (arg.startsWith("--")) {
        const [key, value] = arg.substring(2).split("=");
        if (value) {
          options[key] = value;
        } else {
          options[key] = true;
        }
      }
    });
    return options;
  }

  /**
   * Run the CLI
   */
  async run() {
    const args = process.argv.slice(2);
    const command = args[0];
    const agentId = args[1] || this.currentAgentId;

    try {
      switch (command) {
        case "status":
          await this.showStatus(agentId);
          break;

        case "details":
          await this.showDetails(agentId);
          break;

        case "start-work":
          if (!args[2]) {
            console.error(
              "Usage: node unified-coordination-cli.js start-work <agentId> <taskDescription> [--create-todo] [--priority=high] [--category=...]",
            );
            process.exit(1);
          }
          const taskDescription = args[2];
          const options = this.parseOptions(args.slice(3));
          await this.startWork(agentId, taskDescription, options);
          break;

        case "end-work":
          const endOptions = this.parseOptions(args.slice(2));
          await this.endWork(agentId, endOptions);
          break;

        case "check-conflicts":
          const targetBranch = args[2];
          if (!targetBranch) {
            console.error(
              "Usage: node unified-coordination-cli.js check-conflicts <agentId> <targetBranch>",
            );
            process.exit(1);
          }
          await this.checkConflicts(targetBranch, agentId);
          break;

        case "create-todo":
          if (!args[2]) {
            console.error(
              'Usage: node unified-coordination-cli.js create-todo <agentId> <title> [--description="..."] [--priority=high|medium|low] [--category=...]',
            );
            process.exit(1);
          }
          const title = args[2];
          const todoOptions = this.parseOptions(args.slice(3));
          await this.createTodo(agentId, title, todoOptions);
          break;

        case "assign-todo":
          if (!args[2] || !args[3]) {
            console.error(
              "Usage: node unified-coordination-cli.js assign-todo <assignerId> <todoId> <assigneeId>",
            );
            process.exit(1);
          }
          await this.assignTodo(agentId, args[2], args[3]);
          break;

        case "start-todo":
          if (!args[2]) {
            console.error(
              "Usage: node unified-coordination-cli.js start-todo <agentId> <todoId>",
            );
            process.exit(1);
          }
          await this.startTodo(agentId, args[2]);
          break;

        case "complete-todo":
          if (!args[2]) {
            console.error(
              'Usage: node unified-coordination-cli.js complete-todo <agentId> <todoId> [--notes="..."] [--result="..."]',
            );
            process.exit(1);
          }
          const completeOptions = this.parseOptions(args.slice(3));
          await this.completeTodo(agentId, args[2], completeOptions);
          break;

        case "enforce-report":
          this.enforcer.generateEnforcementReport();
          break;

        case "check-branch":
          if (!args[1]) {
            console.error(
              "Usage: node unified-coordination-cli.js check-branch <branch> [--force]",
            );
            process.exit(1);
          }
          const force = args.includes("--force");
          const branchResult = this.enforcer.canSwitchBranch(args[1], force);
          if (!branchResult.allowed) {
            process.exit(1);
          }
          break;

        case "install-hooks":
          this.enforcer.createEnforcementHooks();
          break;

        default:
          console.log("🤖 Unified Coordination CLI");
          console.log("");
          console.log("COMMANDS:");
          console.log(
            "  status [agentId]                    - Show coordination status",
          );
          console.log(
            "  details [agentId]                   - Show detailed coordination info",
          );
          console.log(
            "  start-work <agentId> <task> [opts]  - Start coordinated work session",
          );
          console.log(
            "  end-work <agentId> [opts]           - End work session",
          );
          console.log(
            "  check-conflicts <agentId> <branch>  - Check for coordination conflicts",
          );
          console.log(
            "  create-todo <agentId> <title> [opts]- Create a new todo",
          );
          console.log(
            "  assign-todo <assigner> <todoId> <assignee> - Assign todo",
          );
          console.log(
            "  start-todo <agentId> <todoId>       - Start working on todo",
          );
          console.log(
            "  complete-todo <agentId> <todoId> [opts] - Complete todo",
          );
          console.log("");
          console.log("ENFORCEMENT:");
          console.log(
            "  enforce-report                     - Show enforcement status",
          );
          console.log(
            "  check-branch <branch> [--force]    - Check branch switch permissions",
          );
          console.log(
            "  install-hooks                      - Install enforcement git hooks",
          );
          console.log("");
          console.log("OPTIONS:");
          console.log(
            "  --create-todo                       - Create todo when starting work",
          );
          console.log("  --priority=high|medium|low          - Todo priority");
          console.log("  --category=string                   - Todo category");
          console.log(
            '  --description="text"                - Todo description',
          );
          console.log(
            '  --notes="text"                      - Completion notes',
          );
          console.log(
            "  --complete-todos                    - Complete active todos when ending work",
          );
          console.log("");
          console.log("EXAMPLES:");
          console.log("  node unified-coordination-cli.js status");
          console.log(
            '  node unified-coordination-cli.js start-work dev-agent "Fix login bug" --create-todo --priority=high',
          );
          console.log(
            "  node unified-coordination-cli.js check-conflicts dev-agent feature/new-ui",
          );
          console.log(
            '  node unified-coordination-cli.js create-todo dev-agent "Add error handling" --priority=medium',
          );
          break;
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  }
}

// CLI execution
const cli = new UnifiedCoordinationCLI();
cli.run().catch(console.error);

export default UnifiedCoordinationCLI;
