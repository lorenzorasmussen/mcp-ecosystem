#!/usr/bin/env node

/**
 * Coordination Enforcement System
 *
 * This system enforces LLM coordination rules by:
 * - Blocking dangerous operations without coordination
 * - Validating branch switches against active sessions
 * - Ensuring todo assignments are respected
 * - Providing clear conflict resolution paths
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

class CoordinationEnforcer {
  constructor(repositoryPath = process.cwd()) {
    this.repositoryPath = repositoryPath;
    this.coordinationFile = path.join(repositoryPath, ".llm-coordination.json");
    this.enforcementRules = this.loadEnforcementRules();
  }

  /**
   * Load enforcement rules
   */
  loadEnforcementRules() {
    const rulesPath = path.join(
      this.repositoryPath,
      "config",
      "coordination-rules.json",
    );

    if (fs.existsSync(rulesPath)) {
      return JSON.parse(fs.readFileSync(rulesPath, "utf8"));
    }

    // Default enforcement rules
    return {
      branchSwitching: {
        requireCoordination: true,
        blockActiveBranches: true,
        requireTodoCleanup: false,
      },
      todoManagement: {
        requireAssignment: true,
        preventDuplicateWork: true,
        enforcePriority: false,
      },
      gitOperations: {
        requireStatusCheck: true,
        blockForcePush: true,
        requireCleanWorkingDir: true,
      },
      sessionManagement: {
        maxSessionsPerBranch: 3,
        sessionTimeout: 120, // minutes
        requireActivityUpdate: true,
      },
    };
  }

  /**
   * Load coordination data
   */
  loadCoordinationData() {
    try {
      if (fs.existsSync(this.coordinationFile)) {
        return JSON.parse(fs.readFileSync(this.coordinationFile, "utf8"));
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
      fs.writeFileSync(this.coordinationFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("❌ Could not save coordination data:", error.message);
    }
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
   * Get current git status
   */
  getGitStatus() {
    try {
      const status = execSync("git status --porcelain", { encoding: "utf8" });
      return {
        hasChanges: status.trim().length > 0,
        hasUncommittedChanges: status.includes("M ") || status.includes("??"),
        hasStagedChanges: status.includes("A ") || status.includes("M "),
      };
    } catch (error) {
      return {
        hasChanges: false,
        hasUncommittedChanges: false,
        hasStagedChanges: false,
      };
    }
  }

  /**
   * Check if branch switch is allowed
   */
  canSwitchBranch(targetBranch, force = false) {
    console.log(`🔍 Checking branch switch permissions for: ${targetBranch}`);

    const data = this.loadCoordinationData();
    const currentBranch = this.getCurrentBranch();

    // Rule 1: Check if target branch has active sessions
    if (this.enforcementRules.branchSwitching.blockActiveBranches && !force) {
      const targetSessions = data.branches[targetBranch] || [];
      const activeTargetSessions = targetSessions.filter((id) => {
        const session = data.sessions[id];
        return session && this.isSessionActive(session);
      });

      if (activeTargetSessions.length > 0) {
        const conflictingUsers = activeTargetSessions.map(
          (id) => data.sessions[id].user.name,
        );
        console.log(`🚫 Branch switch BLOCKED by enforcement rules:`);
        console.log(
          `   Target branch '${targetBranch}' has ${activeTargetSessions.length} active session(s):`,
        );
        conflictingUsers.forEach((user) => console.log(`   • ${user}`));
        console.log(`   Use --force to override (not recommended)`);
        return {
          allowed: false,
          reason: "active_sessions",
          conflicts: conflictingUsers,
        };
      }
    }

    // Rule 2: Check current branch cleanup requirements
    if (this.enforcementRules.branchSwitching.requireTodoCleanup && !force) {
      const currentSessions = data.branches[currentBranch] || [];
      const activeCurrentSessions = currentSessions.filter((id) => {
        const session = data.sessions[id];
        return session && this.isSessionActive(session);
      });

      if (activeCurrentSessions.length > 0) {
        console.log(
          `⚠️  Warning: Current branch '${currentBranch}' has active sessions:`,
        );
        activeCurrentSessions.forEach((id) => {
          const session = data.sessions[id];
          console.log(`   • ${session.user.name}: ${session.activity}`);
        });
        console.log(
          `   Consider ending work sessions before switching branches.`,
        );
      }
    }

    console.log(`✅ Branch switch to '${targetBranch}' is ALLOWED`);
    return { allowed: true, reason: "clear" };
  }

  /**
   * Check if git operation is allowed
   */
  canPerformGitOperation(operation, options = {}) {
    console.log(`🔍 Checking git operation permissions: ${operation}`);

    const data = this.loadCoordinationData();
    const currentBranch = this.getCurrentBranch();
    const gitStatus = this.getGitStatus();

    // Rule 1: Require clean working directory for certain operations
    if (
      this.enforcementRules.gitOperations.requireCleanWorkingDir &&
      !options.force
    ) {
      const requiresCleanDir = ["push", "merge", "rebase"].includes(operation);
      if (requiresCleanDir && gitStatus.hasUncommittedChanges) {
        console.log(`🚫 Git operation BLOCKED:`);
        console.log(
          `   Operation '${operation}' requires clean working directory`,
        );
        console.log(
          `   Current status: ${gitStatus.hasChanges ? "has changes" : "clean"}`,
        );
        console.log(
          `   Commit or stash changes first, or use --force to override`,
        );
        return { allowed: false, reason: "unclean_working_dir" };
      }
    }

    // Rule 2: Block force push on protected branches
    if (
      this.enforcementRules.gitOperations.blockForcePush &&
      operation === "push" &&
      options.force
    ) {
      const protectedBranches = ["main", "master", "develop"];
      if (protectedBranches.includes(currentBranch)) {
        console.log(`🚫 Force push BLOCKED:`);
        console.log(
          `   Force push not allowed on protected branch '${currentBranch}'`,
        );
        console.log(`   Protected branches: ${protectedBranches.join(", ")}`);
        console.log(`   Use --force-override to bypass (emergency only)`);
        return { allowed: false, reason: "protected_branch_force_push" };
      }
    }

    // Rule 3: Check for coordination conflicts
    if (this.enforcementRules.gitOperations.requireStatusCheck) {
      const branchSessions = data.branches[currentBranch] || [];
      const activeSessions = branchSessions.filter((id) => {
        const session = data.sessions[id];
        return session && this.isSessionActive(session);
      });

      if (activeSessions.length > 1 && !options.force) {
        console.log(
          `⚠️  Warning: Multiple active sessions on branch '${currentBranch}':`,
        );
        activeSessions.forEach((id) => {
          const session = data.sessions[id];
          console.log(`   • ${session.user.name}: ${session.activity}`);
        });
        console.log(
          `   Consider coordination before proceeding with '${operation}'`,
        );
      }
    }

    console.log(`✅ Git operation '${operation}' is ALLOWED`);
    return { allowed: true, reason: "clear" };
  }

  /**
   * Check if todo operation is allowed
   */
  canPerformTodoOperation(operation, todoId, agentId, options = {}) {
    console.log(
      `🔍 Checking todo operation permissions: ${operation} on ${todoId}`,
    );

    const data = this.loadCoordinationData();

    // Rule 1: Require assignment for certain operations
    if (this.enforcementRules.todoManagement.requireAssignment) {
      const requiresAssignment = ["start", "complete"].includes(operation);
      if (requiresAssignment && !agentId) {
        console.log(`🚫 Todo operation BLOCKED:`);
        console.log(`   Operation '${operation}' requires agent assignment`);
        console.log(`   Please specify agent ID or assign todo first`);
        return { allowed: false, reason: "assignment_required" };
      }
    }

    // Rule 2: Prevent duplicate work
    if (
      this.enforcementRules.todoManagement.preventDuplicateWork &&
      !options.force
    ) {
      const currentBranch = this.getCurrentBranch();
      const branchSessions = data.branches[currentBranch] || [];
      const activeSessions = branchSessions.filter((id) => {
        const session = data.sessions[id];
        return session && this.isSessionActive(session);
      });

      if (activeSessions.length > 1) {
        console.log(
          `⚠️  Warning: Multiple active sessions might cause duplicate work`,
        );
        console.log(`   Consider coordination to avoid conflicts`);
      }
    }

    console.log(`✅ Todo operation '${operation}' is ALLOWED`);
    return { allowed: true, reason: "clear" };
  }

  /**
   * Check if session is still active
   */
  isSessionActive(session, timeoutMinutes = null) {
    const timeout =
      timeoutMinutes || this.enforcementRules.sessionManagement.sessionTimeout;
    const now = Date.now();
    const lastActivity = session.lastActivity || session.startTime;
    const minutesSinceActivity = (now - lastActivity) / (1000 * 60);
    return minutesSinceActivity < timeout;
  }

  /**
   * Enforce session limits
   */
  enforceSessionLimits() {
    console.log(`🔍 Enforcing session limits...`);

    const data = this.loadCoordinationData();
    const maxSessions =
      this.enforcementRules.sessionManagement.maxSessionsPerBranch;

    Object.entries(data.branches).forEach(([branch, sessionIds]) => {
      const activeSessions = sessionIds.filter((id) => {
        const session = data.sessions[id];
        return session && this.isSessionActive(session);
      });

      if (activeSessions.length > maxSessions) {
        console.log(`⚠️  Branch '${branch}' exceeds session limit:`);
        console.log(
          `   Active sessions: ${activeSessions.length} (limit: ${maxSessions})`,
        );

        // Remove oldest sessions to enforce limit
        const sessionsByAge = activeSessions
          .map((id) => ({
            id,
            session: data.sessions[id],
            lastActivity:
              data.sessions[id].lastActivity || data.sessions[id].startTime,
          }))
          .sort((a, b) => a.lastActivity - b.lastActivity);

        const sessionsToRemove = sessionsByAge.slice(
          0,
          activeSessions.length - maxSessions,
        );
        sessionsToRemove.forEach(({ id, session }) => {
          console.log(`   Removing oldest session: ${session.user.name}`);
          delete data.sessions[id];

          // Remove from branch
          data.branches[branch] = data.branches[branch].filter(
            (sid) => sid !== id,
          );
          if (data.branches[branch].length === 0) {
            delete data.branches[branch];
          }
        });
      }
    });

    this.saveCoordinationData(data);
    console.log(`✅ Session limits enforced`);
  }

  /**
   * Generate enforcement report
   */
  generateEnforcementReport() {
    console.log("\n📊 Coordination Enforcement Report");
    console.log("=".repeat(60));

    const data = this.loadCoordinationData();
    const currentBranch = this.getCurrentBranch();

    console.log("\n🔧 Enforcement Rules:");
    console.log(
      `  Branch Switching: ${this.enforcementRules.branchSwitching.requireCoordination ? "Required" : "Optional"}`,
    );
    console.log(
      `  Todo Management: ${this.enforcementRules.todoManagement.requireAssignment ? "Assignment Required" : "Flexible"}`,
    );
    console.log(
      `  Git Operations: ${this.enforcementRules.gitOperations.requireStatusCheck ? "Status Check Required" : "No Check"}`,
    );
    console.log(
      `  Session Timeout: ${this.enforcementRules.sessionManagement.sessionTimeout} minutes`,
    );

    console.log("\n🌿 Branch Status:");
    Object.entries(data.branches).forEach(([branch, sessionIds]) => {
      const activeCount = sessionIds.filter((id) => {
        const session = data.sessions[id];
        return session && this.isSessionActive(session);
      }).length;
      const status = activeCount > 0 ? "🟢 Active" : "⚪ Inactive";
      const current = branch === currentBranch ? " (current)" : "";
      console.log(`  ${branch}: ${status} ${activeCount} sessions${current}`);
    });

    console.log("\n🤖 Active Sessions:");
    const activeSessions = Object.values(data.sessions).filter((session) =>
      this.isSessionActive(session),
    );
    if (activeSessions.length === 0) {
      console.log("  No active sessions");
    } else {
      activeSessions.forEach((session) => {
        const age = Math.round(
          (Date.now() - (session.lastActivity || session.startTime)) /
            (1000 * 60),
        );
        const status =
          age < 30 ? "🟢 Fresh" : age < 60 ? "🟡 Active" : "🟠 Stale";
        console.log(
          `  ${status} ${session.user.name}: ${session.activity} (${age}m ago)`,
        );
      });
    }

    console.log("\n⚠️  Violations:");
    const violations = this.detectViolations(data);
    if (violations.length === 0) {
      console.log("  No violations detected");
    } else {
      violations.forEach((violation, index) => {
        const severity = violation.severity === "high" ? "🔴" : "🟡";
        console.log(
          `  ${index + 1}. ${severity} ${violation.type}: ${violation.message}`,
        );
      });
    }

    console.log("\n" + "=".repeat(60));
  }

  /**
   * Detect coordination violations
   */
  detectViolations(data) {
    const violations = [];

    // Check for stale sessions
    Object.values(data.sessions).forEach((session) => {
      if (!this.isSessionActive(session)) {
        violations.push({
          type: "stale_session",
          severity: "medium",
          message: `Session for ${session.user.name} is stale (${Math.round((Date.now() - (session.lastActivity || session.startTime)) / (1000 * 60))}m old)`,
          session: session,
        });
      }
    });

    // Check for branch conflicts
    Object.entries(data.branches).forEach(([branch, sessionIds]) => {
      const activeSessions = sessionIds.filter((id) => {
        const session = data.sessions[id];
        return session && this.isSessionActive(session);
      });

      if (
        activeSessions.length >
        this.enforcementRules.sessionManagement.maxSessionsPerBranch
      ) {
        violations.push({
          type: "session_limit_exceeded",
          severity: "high",
          message: `Branch '${branch}' has ${activeSessions.length} active sessions (limit: ${this.enforcementRules.sessionManagement.maxSessionsPerBranch})`,
          branch: branch,
          count: activeSessions.length,
        });
      }
    });

    return violations;
  }

  /**
   * Create enforcement hooks
   */
  createEnforcementHooks() {
    console.log("🔧 Creating enforcement hooks...");

    const hooksDir = path.join(this.repositoryPath, ".git", "hooks");
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    // Pre-checkout hook for branch switching
    const preCheckoutHook =
      "#!/bin/bash\n" +
      "# Coordination enforcement pre-checkout hook\n" +
      'BRANCH_NAME="$2"\n' +
      'if [ -n "$BRANCH_NAME" ]; then\n' +
      '  node "$(dirname "$0")/../../tools/scripts/coordination-enforcer.js" check-branch-switch "$BRANCH_NAME"\n' +
      "  if [ $? -ne 0 ]; then\n" +
      '    echo "❌ Branch switch blocked by coordination enforcement"\n' +
      "    exit 1\n" +
      "  fi\n" +
      "fi\n" +
      "exit 0\n";

    // Pre-push hook for git operations
    const prePushHook =
      "#!/bin/bash\n" +
      "# Coordination enforcement pre-push hook\n" +
      'REMOTE="$1"\n' +
      'URL="$2"\n' +
      "\n" +
      "# Check if push is to protected branch\n" +
      "CURRENT_BRANCH=$(git branch --show-current)\n" +
      'PROTECTED_BRANCHES=("main" "master" "develop")\n' +
      "\n" +
      'for PROTECTED_BRANCH in "${PROTECTED_BRANCHES[@]}"; do\n' +
      '  if [ "$CURRENT_BRANCH" = "$PROTECTED_BRANCH" ] && [[ "$*" == *"--force"* ]]; then\n' +
      '    echo "❌ Force push to protected branch blocked by coordination enforcement"\n' +
      "    exit 1\n" +
      "  fi\n" +
      "done\n" +
      "\n" +
      "# Check coordination status\n" +
      'node "$(dirname "$0")/../../tools/scripts/coordination-enforcer.js" check-git-status push\n' +
      "if [ $? -ne 0 ]; then\n" +
      '  echo "❌ Git push blocked by coordination enforcement"\n' +
      "  exit 1\n" +
      "fi\n" +
      "\n" +
      "exit 0\n";

    // Write hooks
    fs.writeFileSync(path.join(hooksDir, "pre-checkout"), preCheckoutHook);
    fs.writeFileSync(path.join(hooksDir, "pre-push"), prePushHook);

    // Make hooks executable
    fs.chmodSync(path.join(hooksDir, "pre-checkout"), "755");
    fs.chmodSync(path.join(hooksDir, "pre-push"), "755");

    console.log("✅ Enforcement hooks created");
  }
}

// CLI interface
const enforcer = new CoordinationEnforcer();
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "check-branch-switch":
    const targetBranch = args[1];
    if (!targetBranch) {
      console.error(
        "❌ Usage: coordination-enforcer.js check-branch-switch <target-branch>",
      );
      process.exit(1);
    }
    const force = args.includes("--force");
    const result = enforcer.canSwitchBranch(targetBranch, force);
    process.exit(result.allowed ? 0 : 1);
    break;

  case "check-git-status":
    const operation = args[1] || "status";
    const options = {};
    if (args.includes("--force")) options.force = true;
    const gitResult = enforcer.canPerformGitOperation(operation, options);
    process.exit(gitResult.allowed ? 0 : 1);
    break;

  case "check-todo":
    const todoOperation = args[1];
    const todoId = args[2];
    const agentId = args[3];
    if (!todoOperation || !todoId) {
      console.error(
        "❌ Usage: coordination-enforcer.js check-todo <operation> <todoId> [agentId]",
      );
      process.exit(1);
    }
    const todoOptions = {};
    if (args.includes("--force")) todoOptions.force = true;
    const todoResult = enforcer.canPerformTodoOperation(
      todoOperation,
      todoId,
      agentId,
      todoOptions,
    );
    process.exit(todoResult.allowed ? 0 : 1);
    break;

  case "enforce-limits":
    enforcer.enforceSessionLimits();
    break;

  case "report":
    enforcer.generateEnforcementReport();
    break;

  case "install-hooks":
    enforcer.createEnforcementHooks();
    break;

  default:
    console.log("🔧 Coordination Enforcement System");
    console.log("");
    console.log("Usage:");
    console.log(
      "  check-branch-switch <branch> [--force]  - Check if branch switch is allowed",
    );
    console.log(
      "  check-git-status <operation> [--force]   - Check if git operation is allowed",
    );
    console.log(
      "  check-todo <operation> <todoId> [agentId] - Check if todo operation is allowed",
    );
    console.log(
      "  enforce-limits                           - Enforce session limits",
    );
    console.log(
      "  report                                    - Generate enforcement report",
    );
    console.log(
      "  install-hooks                             - Install enforcement git hooks",
    );
    console.log("");
    console.log("Examples:");
    console.log(
      "  coordination-enforcer.js check-branch-switch feature/new-ui",
    );
    console.log("  coordination-enforcer.js check-git-status push --force");
    console.log(
      "  coordination-enforcer.js check-todo start todo-123 dev-agent",
    );
    console.log("  coordination-enforcer.js report");
    break;
}

export default CoordinationEnforcer;
