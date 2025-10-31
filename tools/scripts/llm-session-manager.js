#!/usr/bin/env node

/**
 * LLM Session Manager
 *
 * Manages persistent LLM coordinator sessions across multiple commands.
 * This maintains session state so todo enforcement works properly.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import UnifiedLLMCoordinator from "./llm-coordinator-unified.js";

class LLMSessionManager {
  constructor() {
    this.repositoryPath = process.cwd();
    this.sessionFile = path.join(this.repositoryPath, ".llm-session.json");
    this.coordinator = null;
    this.sessionData = this.loadSessionData();
  }

  /**
   * Load existing session data
   */
  loadSessionData() {
    try {
      if (fs.existsSync(this.sessionFile)) {
        const data = fs.readFileSync(this.sessionFile, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn("Could not load session data:", error.message);
    }
    return { activeSession: null, lastCommand: null };
  }

  /**
   * Save session data
   */
  saveSessionData(data) {
    try {
      fs.writeFileSync(this.sessionFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Could not save session data:", error.message);
    }
  }

  /**
   * Get or create coordinator instance
   */
  getCoordinator() {
    if (!this.coordinator) {
      this.coordinator = new UnifiedLLMCoordinator(this.repositoryPath);

      // Restore session if exists
      if (this.sessionData.activeSession) {
        this.coordinator.sessionId = this.sessionData.activeSession.sessionId;
        this.coordinator.currentSession =
          this.sessionData.activeSession.sessionData;
      }
    }
    return this.coordinator;
  }

  /**
   * Start a new session
   */
  async startSession(agentId, todoTitle, options = {}) {
    console.log("🚀 Starting new LLM session...");

    const coordinator = this.getCoordinator();

    // Create todo first
    const todo = await coordinator.createTodo(agentId, todoTitle, options);

    // Start the todo
    await coordinator.startTodo(agentId, todo.id);

    // Register coordination session
    await coordinator.registerSession(
      options.project || "mcp-ecosystem",
      options.branch || this.getCurrentBranch(),
      options.activity || "working",
    );

    // Save session data
    this.sessionData.activeSession = {
      sessionId: coordinator.sessionId,
      sessionData: coordinator.currentSession,
      agentId,
      activeTodoId: todo.id,
      startedAt: new Date().toISOString(),
    };
    this.saveSessionData(this.sessionData);

    console.log(`✅ Session started successfully`);
    console.log(`   Agent: ${agentId}`);
    console.log(`   Todo: ${todo.title}`);
    console.log(`   Session ID: ${coordinator.sessionId}`);

    return { session: this.sessionData.activeSession, todo };
  }

  /**
   * Execute operation in current session
   */
  async executeOperation(operation, context = {}) {
    console.log(`🔧 Executing operation in current session...`);

    if (!this.sessionData.activeSession) {
      console.error("❌ No active session. Start a session first.");
      console.log("   Use: start-session <agent-id> <todo-title>");
      process.exit(1);
    }

    const coordinator = this.getCoordinator();

    try {
      const result = await coordinator.executeOperation(operation, context);

      // Update session data
      this.sessionData.lastCommand = {
        operation,
        context,
        timestamp: new Date().toISOString(),
        result: "success",
      };
      this.saveSessionData(this.sessionData);

      return result;
    } catch (error) {
      this.sessionData.lastCommand = {
        operation,
        context,
        timestamp: new Date().toISOString(),
        result: "error",
        error: error.message,
      };
      this.saveSessionData(this.sessionData);
      throw error;
    }
  }

  /**
   * Complete operation in current session
   */
  async completeOperation(operation, result = {}) {
    console.log(`🏁 Completing operation in current session...`);

    if (!this.sessionData.activeSession) {
      console.error("❌ No active session.");
      process.exit(1);
    }

    const coordinator = this.getCoordinator();
    const completionResult = await coordinator.completeOperation(
      operation,
      result,
    );

    // Update session data
    this.sessionData.lastCommand = {
      operation,
      result: "completed",
      timestamp: new Date().toISOString(),
    };
    this.saveSessionData(this.sessionData);

    return completionResult;
  }

  /**
   * Show session status
   */
  async showStatus() {
    console.log("📊 LLM Session Manager Status\n");

    if (this.sessionData.activeSession) {
      const session = this.sessionData.activeSession;
      console.log("📍 Active Session:");
      console.log(`   Session ID: ${session.sessionId}`);
      console.log(`   Agent: ${session.agentId}`);
      console.log(`   Active Todo ID: ${session.activeTodoId}`);
      console.log(
        `   Started: ${new Date(session.startedAt).toLocaleString()}`,
      );

      if (this.sessionData.lastCommand) {
        console.log(
          `   Last Command: ${this.sessionData.lastCommand.operation}`,
        );
        console.log(`   Last Result: ${this.sessionData.lastCommand.result}`);
        console.log(
          `   Last Timestamp: ${new Date(this.sessionData.lastCommand.timestamp).toLocaleString()}`,
        );
      }
    } else {
      console.log("❌ No active session");
      console.log(
        "   Start a session with: start-session <agent-id> <todo-title>",
      );
    }

    // Show coordinator status
    const coordinator = this.getCoordinator();
    await coordinator.getStatus();
  }

  /**
   * End current session
   */
  async endSession() {
    console.log("👋 Ending current LLM session...");

    if (!this.sessionData.activeSession) {
      console.log("ℹ️ No active session to end.");
      return;
    }

    const coordinator = this.getCoordinator();
    await coordinator.unregisterSession();

    // Clear session data
    this.sessionData = { activeSession: null, lastCommand: null };
    this.saveSessionData(this.sessionData);

    console.log("✅ Session ended successfully");
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
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new LLMSessionManager();
  const args = process.argv.slice(2);
  const command = args[0];

  const runCommand = async () => {
    try {
      switch (command) {
        case "start-session":
          const agentId = args[1];
          const todoTitle = args[2];
          if (!agentId || !todoTitle) {
            console.error(
              "❌ Usage: start-session <agent-id> <todo-title> [options]",
            );
            process.exit(1);
          }

          const options = {};
          if (args.includes("--high")) options.priority = "high";
          if (args.includes("--low")) options.priority = "low";
          if (args.includes("--project")) {
            const projectIndex = args.indexOf("--project");
            options.project = args[projectIndex + 1];
          }
          if (args.includes("--branch")) {
            const branchIndex = args.indexOf("--branch");
            options.branch = args[branchIndex + 1];
          }

          await manager.startSession(agentId, todoTitle, options);
          break;

        case "execute":
          const operation = args[1];
          if (!operation) {
            console.error("❌ Usage: execute <operation> [context-json]");
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

          await manager.executeOperation(operation, context);
          break;

        case "complete":
          const completedOperation = args[1];
          if (!completedOperation) {
            console.error("❌ Usage: complete <operation>");
            process.exit(1);
          }

          const result = {};
          if (args[2]) {
            try {
              Object.assign(result, JSON.parse(args[2]));
            } catch (e) {
              console.error("❌ Invalid JSON result");
              process.exit(1);
            }
          }

          await manager.completeOperation(completedOperation, result);
          break;

        case "status":
          await manager.showStatus();
          break;

        case "end-session":
          await manager.endSession();
          break;

        default:
          console.log("🤖 LLM Session Manager");
          console.log("");
          console.log("Commands:");
          console.log(
            "  start-session <agent-id> <todo-title> [options]  - Start new session with todo",
          );
          console.log(
            "  execute <operation> [context]                    - Execute operation in current session",
          );
          console.log(
            "  complete <operation> [result]                   - Complete operation in current session",
          );
          console.log(
            "  status                                          - Show session status",
          );
          console.log(
            "  end-session                                     - End current session",
          );
          console.log("");
          console.log("Options:");
          console.log(
            "  --high                                           - High priority todo",
          );
          console.log(
            "  --low                                            - Low priority todo",
          );
          console.log(
            "  --project <name>                                - Project name",
          );
          console.log(
            "  --branch <name>                                  - Branch name",
          );
          console.log("");
          console.log("Examples:");
          console.log(
            '  start-session my-agent "Implement user auth" --high --project my-project',
          );
          console.log('  execute "implement-auth" \'{"file": "auth.js"}\'');
          console.log(
            '  complete "implement-auth" \'{"success": true, "files": ["auth.js"]}\'',
          );
          console.log("  status");
          console.log("  end-session");
          break;
      }
    } catch (error) {
      console.error("❌ Command failed:", error.message);
      process.exit(1);
    }
  };

  runCommand();
}

export default LLMSessionManager;
