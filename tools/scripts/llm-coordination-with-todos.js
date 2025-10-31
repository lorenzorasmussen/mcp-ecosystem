#!/usr/bin/env node

/**
 * Enhanced LLM Coordination System with Todo Enforcement
 *
 * This system combines LLM session coordination with mandatory todo enforcement
 * to ensure all multi-agent workflows are properly tracked and accountable.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import TodoEnforcementHook from "./todo-enforcement-hook.js";

class EnhancedLLMCoordinator {
  constructor(repositoryPath = process.cwd()) {
    this.repositoryPath = repositoryPath;
    this.lockFile = path.join(repositoryPath, ".llm-coordination.json");
    this.sessionId = this.generateSessionId();
    this.currentUser = this.getCurrentUser();
    this.todoHook = new TodoEnforcementHook({ repositoryPath });
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
      // Try to get git user info
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

  /**
   * Register current LLM session with todo validation
   */
  async registerSession(project, branch, activity = "working") {
    console.log(`🤖 Registering LLM session with todo enforcement...`);

    // First validate todos for this operation
    const todoValidation = await this.todoHook.run(
      `session-registration: ${activity}`,
      this.sessionId,
      { project, branch, operation: "register" },
    );

    if (!todoValidation.success) {
      console.error("❌ Session registration blocked by todo enforcement:");
      console.error(todoValidation.error);
      throw new Error("Todo enforcement failed - cannot register session");
    }

    const data = this.loadCoordinationData();

    // Clean up expired sessions (older than 2 hours)
    this.cleanupExpiredSessions(data);

    // Register current session
    data.sessions[this.sessionId] = {
      user: this.currentUser,
      project: project,
      branch: branch,
      activity: activity,
      startTime: Date.now(),
      lastActivity: Date.now(),
      todoCompliance: todoValidation.metrics,
    };

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

    // Update todo compliance metrics
    data.todoCompliance[this.sessionId] = todoValidation.metrics;

    this.saveCoordinationData(data);
    console.log(
      `✅ Registered LLM session: ${this.currentUser.name} working on ${project}/${branch}`,
    );
    console.log(
      `📋 Todo compliance: ${todoValidation.metrics.complianceRate}% (${todoValidation.metrics.agentsWithActiveTodos}/${todoValidation.metrics.totalAgents} agents with active todos)`,
    );

    return { sessionId: this.sessionId, todoValidation };
  }

  /**
   * Check if branch switch is safe with todo validation
   */
  async checkBranchSwitch(targetBranch) {
    console.log(`🔍 Checking branch safety with todo enforcement...`);

    // Validate todos for branch switch operation
    const todoValidation = await this.todoHook.run(
      `branch-switch: ${targetBranch}`,
      this.sessionId,
      { targetBranch, operation: "branch-switch" },
    );

    if (!todoValidation.success) {
      console.error("❌ Branch switch blocked by todo enforcement:");
      console.error(todoValidation.error);
      return false;
    }

    const data = this.loadCoordinationData();
    const currentBranch = this.getCurrentBranch();

    // Clean up expired sessions
    this.cleanupExpiredSessions(data);

    // Check if target branch has active sessions
    const targetSessions = data.branches[targetBranch] || [];
    const activeTargetSessions = targetSessions.filter(
      (id) => data.sessions[id] && this.isSessionActive(data.sessions[id]),
    );

    if (activeTargetSessions.length > 0) {
      const conflictingUsers = activeTargetSessions.map(
        (id) => data.sessions[id].user.name,
      );
      console.log(`🚫 Branch switch blocked!`);
      console.log(
        `   Target branch '${targetBranch}' is currently being worked on by:`,
      );
      conflictingUsers.forEach((user) => console.log(`   • ${user}`));
      console.log(`   Please coordinate with them before switching branches.`);
      return false;
    }

    // Check if current branch has other active sessions
    const currentSessions = data.branches[currentBranch] || [];
    const otherActiveSessions = currentSessions.filter(
      (id) =>
        id !== this.sessionId &&
        data.sessions[id] &&
        this.isSessionActive(data.sessions[id]),
    );

    if (otherActiveSessions.length > 0) {
      console.log(
        `⚠️  Warning: Other LLMs are still working on current branch '${currentBranch}'`,
      );
      const otherUsers = otherActiveSessions.map(
        (id) => data.sessions[id].user.name,
      );
      otherUsers.forEach((user) => console.log(`   • ${user} is still active`));
      console.log(`   Consider notifying them before leaving the branch.`);
    }

    console.log(`✅ Branch switch validated: Todo compliance checked`);
    return true;
  }

  /**
   * Update session activity with todo validation
   */
  async updateActivity(activity = "working") {
    // Validate todos for activity update
    const todoValidation = await this.todoHook.run(
      `activity-update: ${activity}`,
      this.sessionId,
      { activity, operation: "update" },
    );

    if (!todoValidation.success) {
      console.error("❌ Activity update blocked by todo enforcement:");
      console.error(todoValidation.error);
      return false;
    }

    const data = this.loadCoordinationData();

    if (data.sessions[this.sessionId]) {
      data.sessions[this.sessionId].activity = activity;
      data.sessions[this.sessionId].lastActivity = Date.now();
      data.sessions[this.sessionId].todoCompliance = todoValidation.metrics;
      this.saveCoordinationData(data);
      console.log(`✅ Activity updated: ${activity}`);
      console.log(
        `📋 Todo compliance: ${todoValidation.metrics.complianceRate}%`,
      );
      return true;
    }

    return false;
  }

  /**
   * Execute coordinated operation with full todo validation
   */
  async executeCoordinatedOperation(operation, context = {}) {
    console.log(`🚀 Executing coordinated operation: ${operation}`);

    // Step 1: Todo validation
    const todoValidation = await this.todoHook.run(operation, this.sessionId, {
      ...context,
      operation: "execute",
    });

    if (!todoValidation.success) {
      console.error("❌ Operation blocked by todo enforcement:");
      console.error(todoValidation.error);
      return {
        success: false,
        reason: "todo-enforcement-failed",
        error: todoValidation.error,
      };
    }

    // Step 2: Check coordination conflicts
    const data = this.loadCoordinationData();
    this.cleanupExpiredSessions(data);

    const currentSession = data.sessions[this.sessionId];
    if (!currentSession) {
      return {
        success: false,
        reason: "no-session",
        error: "No active session found",
      };
    }

    // Step 3: Update session activity
    currentSession.activity = `executing: ${operation}`;
    currentSession.lastActivity = Date.now();
    currentSession.todoCompliance = todoValidation.metrics;
    this.saveCoordinationData(data);

    console.log(`✅ Operation validated and coordinated`);
    console.log(
      `📋 Todo compliance: ${todoValidation.metrics.complianceRate}%`,
    );

    return {
      success: true,
      sessionId: this.sessionId,
      todoValidation,
      coordination: {
        branch: currentSession.branch,
        project: currentSession.project,
        conflicts: false,
      },
    };
  }

  /**
   * Complete operation and update todos
   */
  async completeOperation(operation, result = {}) {
    console.log(`🏁 Completing coordinated operation: ${operation}`);

    // Update todo status based on operation result
    const todoUpdate = await this.todoHook.updateTodoStatus(
      this.sessionId,
      operation,
      { success: true, ...result },
    );

    // Update session activity
    const data = this.loadCoordinationData();
    if (data.sessions[this.sessionId]) {
      data.sessions[this.sessionId].activity = "completed: " + operation;
      data.sessions[this.sessionId].lastActivity = Date.now();
      this.saveCoordinationData(data);
    }

    console.log(`✅ Operation completed and todos updated`);
    return { success: true, todoUpdate };
  }

  /**
   * Unregister session with cleanup
   */
  async unregisterSession() {
    console.log(`👋 Unregistering LLM session with todo cleanup...`);

    // Complete any active todos
    const activeTodos = await this.todoHook.todoService.getActiveTodos(
      this.sessionId,
    );
    for (const todo of activeTodos) {
      await this.todoHook.todoService.addComment(
        todo.id,
        this.sessionId,
        "Session ended - todo automatically paused",
      );
    }

    const data = this.loadCoordinationData();

    // Remove from sessions
    delete data.sessions[this.sessionId];

    // Remove from branches
    Object.keys(data.branches).forEach((branch) => {
      data.branches[branch] = data.branches[branch].filter(
        (id) => id !== this.sessionId,
      );
      // Remove empty branch entries
      if (data.branches[branch].length === 0) {
        delete data.branches[branch];
      }
    });

    // Remove todo compliance data
    delete data.todoCompliance[this.sessionId];

    this.saveCoordinationData(data);
    console.log(`👋 Unregistered LLM session: ${this.currentUser.name}`);
    console.log(`📋 Cleaned up ${activeTodos.length} active todos`);
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
    const now = Date.now();
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

      // Remove todo compliance data
      delete data.todoCompliance[id];
    });

    if (expiredIds.length > 0) {
      console.log(`🧹 Cleaned up ${expiredIds.length} expired LLM sessions`);
    }
  }

  /**
   * Get enhanced coordination status with todo metrics
   */
  async getStatus() {
    const data = this.loadCoordinationData();
    this.cleanupExpiredSessions(data);

    console.log("\n🤖 Enhanced LLM Coordination Status");
    console.log("=".repeat(60));

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

      if (session.todoCompliance) {
        console.log(
          `   Todo Compliance: ${session.todoCompliance.complianceRate}%`,
        );
        console.log(
          `   Active Todos: ${session.todoCompliance.totalActiveTodos}`,
        );
      }
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
          const compliance = session.todoCompliance
            ? ` (${session.todoCompliance.complianceRate}% compliance)`
            : "";
          console.log(
            `     ${marker} ${session.user.name} - ${session.activity}${compliance}`,
          );
        });
      });
    }

    // Overall todo compliance
    console.log(`\n📋 Todo Compliance Overview:`);
    const allCompliance = data.todoCompliance
      ? Object.values(data.todoCompliance)
      : [];
    if (allCompliance.length > 0) {
      const avgCompliance = Math.round(
        allCompliance.reduce(
          (sum, metrics) => sum + (metrics.complianceRate || 0),
          0,
        ) / allCompliance.length,
      );
      const totalActiveTodos = allCompliance.reduce(
        (sum, metrics) => sum + (metrics.totalActiveTodos || 0),
        0,
      );
      console.log(`   Average Compliance: ${avgCompliance}%`);
      console.log(`   Total Active Todos: ${totalActiveTodos}`);
    } else {
      console.log(`   No compliance data available`);
    }

    console.log("\n" + "=".repeat(60));
  }

  /**
   * Force cleanup (admin function)
   */
  async forceCleanup() {
    // Clean up todos for all sessions
    const allAgents = await this.todoHook.getAllAgents();
    for (const agentId of allAgents) {
      const activeTodos =
        await this.todoHook.todoService.getActiveTodos(agentId);
      for (const todo of activeTodos) {
        await this.todoHook.todoService.addComment(
          todo.id,
          agentId,
          "Force cleanup - todo automatically paused",
        );
      }
    }

    const data = { sessions: {}, branches: {}, todoCompliance: {} };
    this.saveCoordinationData(data);
    console.log("🧹 Force cleaned all LLM coordination data and paused todos");
  }
}

// Only run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // CLI Interface
  const coordinator = new EnhancedLLMCoordinator();
  const args = process.argv.slice(2);
  const command = args[0];

  const runCommand = async () => {
    try {
      switch (command) {
        case "register":
          const project = args[1] || "mcp-ecosystem";
          const branch = args[2] || coordinator.getCurrentBranch();
          const activity = args[3] || "working";
          await coordinator.registerSession(project, branch, activity);
          break;

        case "check-switch":
          const targetBranch = args[1];
          if (!targetBranch) {
            console.error(
              "❌ Usage: llm-coordination-with-todos.js check-switch <target-branch>",
            );
            process.exit(1);
          }
          const canSwitch = await coordinator.checkBranchSwitch(targetBranch);
          process.exit(canSwitch ? 0 : 1);
          break;

        case "update":
          const newActivity = args[1] || "working";
          const updated = await coordinator.updateActivity(newActivity);
          process.exit(updated ? 0 : 1);
          break;

        case "execute":
          const operation = args[1];
          if (!operation) {
            console.error(
              "❌ Usage: llm-coordination-with-todos.js execute <operation>",
            );
            process.exit(1);
          }
          const result =
            await coordinator.executeCoordinatedOperation(operation);
          console.log(JSON.stringify(result, null, 2));
          process.exit(result.success ? 0 : 1);
          break;

        case "complete":
          const completedOp = args[1];
          if (!completedOp) {
            console.error(
              "❌ Usage: llm-coordination-with-todos.js complete <operation>",
            );
            process.exit(1);
          }
          await coordinator.completeOperation(completedOp);
          break;

        case "unregister":
          await coordinator.unregisterSession();
          break;

        case "status":
          await coordinator.getStatus();
          break;

        case "cleanup":
          await coordinator.forceCleanup();
          break;

        default:
          console.log(
            "🤖 Enhanced LLM Coordination System with Todo Enforcement",
          );
          console.log("");
          console.log("Usage:");
          console.log(
            "  register [project] [branch] [activity]  - Register current session with todo validation",
          );
          console.log(
            "  check-switch <branch>                   - Check if branch switch is safe (with todos)",
          );
          console.log(
            "  update [activity]                       - Update current activity (with todo validation)",
          );
          console.log(
            "  execute <operation>                      - Execute coordinated operation with full validation",
          );
          console.log(
            "  complete <operation>                     - Complete operation and update todos",
          );
          console.log(
            "  unregister                              - Remove current session and cleanup todos",
          );
          console.log(
            "  status                                  - Show enhanced coordination status with todo metrics",
          );
          console.log(
            "  cleanup                                 - Force cleanup all data and pause todos (admin)",
          );
          console.log("");
          console.log("Examples:");
          console.log(
            '  node llm-coordination-with-todos.js register mcp-ecosystem develop "working on docs"',
          );
          console.log(
            "  node llm-coordination-with-todos.js execute implement-feature-x",
          );
          console.log(
            "  node llm-coordination-with-todos.js complete implement-feature-x",
          );
          break;
      }
    } catch (error) {
      console.error("❌ Command failed:", error.message);
      process.exit(1);
    }
  };

  runCommand();
}

export default EnhancedLLMCoordinator;
