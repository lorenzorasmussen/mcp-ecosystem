#!/usr/bin/env node

/**
 * LLM Coordination System
 *
 * This system prevents conflicts when multiple LLMs are working on the same project
 * by tracking active sessions and blocking conflicting operations.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

class LLMCoordinator {
  constructor(repositoryPath = process.cwd()) {
    this.repositoryPath = repositoryPath;
    this.lockFile = path.join(repositoryPath, ".llm-coordination.json");
    this.sessionId = this.generateSessionId();
    this.currentUser = this.getCurrentUser();
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
    return { sessions: {}, branches: {} };
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
   * Register current LLM session
   */
  registerSession(project, branch, activity = "working") {
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

    this.saveCoordinationData(data);
    console.log(
      `✅ Registered LLM session: ${this.currentUser.name} working on ${project}/${branch}`,
    );
  }

  /**
   * Check if branch switch is safe
   */
  checkBranchSwitch(targetBranch) {
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

    return true;
  }

  /**
   * Update session activity
   */
  updateActivity(activity = "working") {
    const data = this.loadCoordinationData();

    if (data.sessions[this.sessionId]) {
      data.sessions[this.sessionId].activity = activity;
      data.sessions[this.sessionId].lastActivity = Date.now();
      this.saveCoordinationData(data);
    }
  }

  /**
   * Unregister session
   */
  unregisterSession() {
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

    this.saveCoordinationData(data);
    console.log(`👋 Unregistered LLM session: ${this.currentUser.name}`);
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
    });

    if (expiredIds.length > 0) {
      console.log(`🧹 Cleaned up ${expiredIds.length} expired LLM sessions`);
    }
  }

  /**
   * Get coordination status
   */
  getStatus() {
    const data = this.loadCoordinationData();
    this.cleanupExpiredSessions(data);

    console.log("\n🤖 LLM Coordination Status");
    console.log("=".repeat(50));

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

    console.log("\n" + "=".repeat(50));
  }

  /**
   * Force cleanup (admin function)
   */
  forceCleanup() {
    const data = { sessions: {}, branches: {} };
    this.saveCoordinationData(data);
    console.log("🧹 Force cleaned all LLM coordination data");
  }
}

// Only run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // CLI Interface
  const coordinator = new LLMCoordinator();
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "register":
      const project = args[1] || "mcp-ecosystem";
      const branch = args[2] || coordinator.getCurrentBranch();
      const activity = args[3] || "working";
      coordinator.registerSession(project, branch, activity);
      break;

    case "check-switch":
      const targetBranch = args[1];
      if (!targetBranch) {
        console.error(
          "❌ Usage: llm-coordination.js check-switch <target-branch>",
        );
        process.exit(1);
      }
      const canSwitch = coordinator.checkBranchSwitch(targetBranch);
      process.exit(canSwitch ? 0 : 1);
      break;

    case "update":
      const newActivity = args[1] || "working";
      coordinator.updateActivity(newActivity);
      break;

    case "unregister":
      coordinator.unregisterSession();
      break;

    case "status":
      coordinator.getStatus();
      break;

    case "cleanup":
      coordinator.forceCleanup();
      break;

    default:
      console.log("🤖 LLM Coordination System");
      console.log("");
      console.log("Usage:");
      console.log(
        "  register [project] [branch] [activity]  - Register current session",
      );
      console.log(
        "  check-switch <branch>                   - Check if branch switch is safe",
      );
      console.log(
        "  update [activity]                       - Update current activity",
      );
      console.log(
        "  unregister                              - Remove current session",
      );
      console.log(
        "  status                                  - Show coordination status",
      );
      console.log(
        "  cleanup                                 - Force cleanup all data (admin)",
      );
      console.log("");
      console.log("Examples:");
      console.log(
        '  node llm-coordination.js register mcp-ecosystem develop "working on docs"',
      );
      console.log(
        "  node llm-coordination.js check-switch feature/new-feature",
      );
      console.log('  node llm-coordination.js update "code review"');
      break;
  }
}

export default LLMCoordinator;
