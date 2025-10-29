#!/usr/bin/env node

/**
 * MCP Coordinator Bridge
 *
 * Bridges the Unified LLM Coordinator with the real MCP client infrastructure.
 * This replaces simulation with actual MCP server operations.
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MCPCoordinatorBridge {
  constructor(repositoryPath = process.cwd()) {
    this.repositoryPath = repositoryPath;
    this.mcpClientPath = path.join(
      repositoryPath,
      "src",
      "client",
      "multi_agent_client.js",
    );
    this.coordinatorPath = path.join(__dirname, "llm-coordinator-unified.js");
    this.activeProcesses = new Map();
    this.sessionData = new Map();
  }

  /**
   * Execute MCP operation through coordinator with todo enforcement
   */
  async executeWithCoordinator(agentId, operation, context = {}) {
    console.log(`🔗 MCP Bridge: Executing ${operation} for agent ${agentId}`);

    try {
      // Step 1: Validate operation through unified coordinator
      const validationResult = await this.validateOperation(
        agentId,
        operation,
        context,
      );
      if (!validationResult.valid) {
        throw new Error(
          `Operation validation failed: ${validationResult.error}`,
        );
      }

      // Step 2: Execute real MCP operation
      const mcpResult = await this.executeMCPOperation(operation, context);

      // Step 3: Record completion through coordinator
      await this.recordCompletion(agentId, operation, mcpResult);

      return {
        success: true,
        operation,
        agentId,
        mcpResult,
        validation: validationResult,
      };
    } catch (error) {
      console.error(`❌ MCP Bridge operation failed:`, error.message);
      throw error;
    }
  }

  /**
   * Validate operation through unified coordinator
   */
  async validateOperation(agentId, operation, context) {
    return new Promise((resolve, reject) => {
      const coordinator = spawn(
        "node",
        [this.coordinatorPath, "validate", agentId, operation],
        {
          cwd: this.repositoryPath,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );

      let output = "";
      let errorOutput = "";

      coordinator.stdout.on("data", (data) => {
        output += data.toString();
      });

      coordinator.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      coordinator.on("close", (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (parseError) {
            resolve({ valid: true, message: output });
          }
        } else {
          resolve({ valid: false, error: errorOutput });
        }
      });

      coordinator.on("error", reject);
    });
  }

  /**
   * Execute real MCP operation
   */
  async executeMCPOperation(operation, context) {
    console.log(`🚀 Executing real MCP operation: ${operation}`);

    try {
      // Use direct MCP tools instead of orchestrator
      const result = await this.executeDirectMCPOperation(operation, context);

      return {
        success: true,
        data: result,
        operation,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`❌ MCP operation failed:`, error.message);
      throw error;
    }
  }

  /**
   * Execute direct MCP operation using available tools
   */
  async executeDirectMCPOperation(operation, context) {
    switch (operation) {
      case "file-read":
        return await this.executeFileRead(context);
      case "file-write":
        return await this.executeFileWrite(context);
      case "search-code":
        return await this.executeSearchCode(context);
      case "list-servers":
        return await this.listMCPServers();
      case "execute-tool":
        return await this.executeMCPTool(context);
      default:
        throw new Error(`Unsupported MCP operation: ${operation}`);
    }
  }

  /**
   * Execute file read operation
   */
  async executeFileRead(context) {
    const fsPromises = await import("fs/promises");
    const pathPromises = await import("path");

    const filePath = pathPromises.join(
      this.repositoryPath,
      context.filePath || "",
    );

    try {
      const content = await fsPromises.readFile(filePath, "utf8");
      return {
        operation: "file-read",
        filePath,
        content,
        size: content.length,
      };
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Execute file write operation
   */
  async executeFileWrite(context) {
    const fsPromises = await import("fs/promises");
    const pathPromises = await import("path");

    const filePath = pathPromises.join(
      this.repositoryPath,
      context.filePath || "",
    );
    const content =
      typeof context.content === "string"
        ? context.content
        : JSON.stringify(context.content, null, 2);

    try {
      await fsPromises.writeFile(filePath, content, "utf8");
      return {
        operation: "file-write",
        filePath,
        size: content.length,
        success: true,
      };
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Execute code search operation
   */
  async executeSearchCode(context) {
    const pathPromises = await import("path");

    return new Promise((resolve, reject) => {
      const searchPattern = context.pattern || "";
      const searchPath = pathPromises.join(
        this.repositoryPath,
        context.path || ".",
      );

      const rg = spawn("rg", [searchPattern, "--json", searchPath], {
        cwd: this.repositoryPath,
      });

      let output = "";
      let errorOutput = "";

      rg.stdout.on("data", (data) => {
        output += data.toString();
      });

      rg.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      rg.on("close", (code) => {
        if (code === 0 || code === 1) {
          // rg returns 1 when no matches found
          try {
            const results = output
              .split("\n")
              .filter((line) => line.trim())
              .map((line) => JSON.parse(line));

            resolve({
              operation: "search-code",
              pattern: searchPattern,
              path: searchPath,
              results,
              count: results.length,
            });
          } catch (parseError) {
            resolve({
              operation: "search-code",
              pattern: searchPattern,
              path: searchPath,
              results: [],
              count: 0,
              rawOutput: output,
            });
          }
        } else {
          reject(new Error(`Search failed with code ${code}: ${errorOutput}`));
        }
      });

      rg.on("error", reject);
    });
  }

  /**
   * List available MCP servers
   */
  async listMCPServers() {
    const fsPromises = await import("fs/promises");
    const pathPromises = await import("path");

    const serversPath = pathPromises.join(
      this.repositoryPath,
      "src",
      "mcp-ecosystem",
      "servers",
    );

    try {
      const entries = await fsPromises.readdir(serversPath, {
        withFileTypes: true,
      });
      const servers = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

      return {
        operation: "list-servers",
        servers,
        count: servers.length,
        path: serversPath,
      };
    } catch (error) {
      throw new Error(`Failed to list MCP servers: ${error.message}`);
    }
  }

  /**
   * Execute MCP tool operation
   */
  async executeMCPTool(context) {
    const toolName = context.toolName;
    const params = context.params || {};

    // Map to available MCP tools
    const toolMap = {
      "mcp-connect": () => this.executeMCPConnect(params),
      "mcp-manager": () => this.executeMCPManager(params),
      "mcp-monitor": () => this.executeMCPMonitor(params),
      "mcp-rest-api": () => this.executeMCPRestAPI(params),
    };

    const executor = toolMap[toolName];
    if (!executor) {
      throw new Error(`Unknown MCP tool: ${toolName}`);
    }

    return await executor();
  }

  /**
   * Execute MCP Connect tool
   */
  async executeMCPConnect(params) {
    const pathPromises = await import("path");

    return new Promise((resolve, reject) => {
      const connectScript = pathPromises.join(
        this.repositoryPath,
        "tools",
        "mcp-connect.sh",
      );
      const args = params.serverName ? [params.serverName] : [];

      const process = spawn("bash", [connectScript, ...args], {
        cwd: this.repositoryPath,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let output = "";
      let errorOutput = "";

      process.stdout.on("data", (data) => {
        output += data.toString();
      });

      process.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      process.on("close", (code) => {
        resolve({
          operation: "mcp-connect",
          tool: "mcp-connect",
          params,
          exitCode: code,
          output,
          error: errorOutput,
        });
      });

      process.on("error", reject);
    });
  }

  /**
   * Execute MCP Manager tool
   */
  async executeMCPManager(params) {
    const pathPromises = await import("path");

    return new Promise((resolve, reject) => {
      const managerScript = pathPromises.join(
        this.repositoryPath,
        "tools",
        "mcp-manager.sh",
      );
      const args = params.action ? [params.action] : [];

      const process = spawn("bash", [managerScript, ...args], {
        cwd: this.repositoryPath,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let output = "";
      let errorOutput = "";

      process.stdout.on("data", (data) => {
        output += data.toString();
      });

      process.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      process.on("close", (code) => {
        resolve({
          operation: "mcp-manager",
          tool: "mcp-manager",
          params,
          exitCode: code,
          output,
          error: errorOutput,
        });
      });

      process.on("error", reject);
    });
  }

  /**
   * Execute MCP Monitor tool
   */
  async executeMCPMonitor(params) {
    const pathPromises = await import("path");

    return new Promise((resolve, reject) => {
      const monitorScript = pathPromises.join(
        this.repositoryPath,
        "tools",
        "mcp-monitor.js",
      );
      const args = params.action ? [params.action] : [];

      const process = spawn("node", [monitorScript, ...args], {
        cwd: this.repositoryPath,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let output = "";
      let errorOutput = "";

      process.stdout.on("data", (data) => {
        output += data.toString();
      });

      process.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      process.on("close", (code) => {
        resolve({
          operation: "mcp-monitor",
          tool: "mcp-monitor",
          params,
          exitCode: code,
          output,
          error: errorOutput,
        });
      });

      process.on("error", reject);
    });
  }

  /**
   * Execute MCP REST API tool
   */
  async executeMCPRestAPI(params) {
    const pathPromises = await import("path");

    return new Promise((resolve, reject) => {
      const restApiScript = pathPromises.join(
        this.repositoryPath,
        "tools",
        "mcp-rest-api.js",
      );
      const args = params.endpoint ? [params.endpoint] : [];

      const process = spawn("node", [restApiScript, ...args], {
        cwd: this.repositoryPath,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let output = "";
      let errorOutput = "";

      process.stdout.on("data", (data) => {
        output += data.toString();
      });

      process.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      process.on("close", (code) => {
        resolve({
          operation: "mcp-rest-api",
          tool: "mcp-rest-api",
          params,
          exitCode: code,
          output,
          error: errorOutput,
        });
      });

      process.on("error", reject);
    });
  }

  /**
   * Record operation completion through coordinator
   */
  async recordCompletion(agentId, operation, result) {
    return new Promise((resolve, reject) => {
      const coordinator = spawn(
        "node",
        [
          this.coordinatorPath,
          "complete-op",
          agentId,
          operation,
          JSON.stringify(result),
        ],
        {
          cwd: this.repositoryPath,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );

      coordinator.on("close", (code) => {
        if (code === 0) {
          console.log(`✅ Operation ${operation} completed and recorded`);
          resolve({ success: true });
        } else {
          console.error(`⚠️ Failed to record operation completion`);
          resolve({ success: false, error: "Recording failed" });
        }
      });

      coordinator.on("error", reject);
    });
  }

  /**
   * Start coordinated session with MCP bridge
   */
  async startCoordinatedSession(agentId, todoTitle, options = {}) {
    console.log(
      `🎯 Starting coordinated MCP session for ${agentId}: ${todoTitle}`,
    );

    try {
      // Create todo through coordinator
      const todoResult = await this.createTodoThroughCoordinator(
        agentId,
        todoTitle,
        options,
      );

      // Initialize MCP client connection (simplified)
      const mcpConnection = await this.initializeMCPConnection(agentId);

      // Register coordinated session
      const sessionResult = await this.registerCoordinatedSession(
        agentId,
        todoTitle,
        {
          mcpConnected: true,
          connectionId: mcpConnection.id,
          ...options,
        },
      );

      return {
        success: true,
        sessionId: sessionResult.sessionId,
        todoId: todoResult.todoId,
        mcpConnection: mcpConnection,
        agentId,
        todoTitle,
      };
    } catch (error) {
      console.error(`❌ Failed to start coordinated session:`, error.message);
      throw error;
    }
  }

  /**
   * Create todo through unified coordinator
   */
  async createTodoThroughCoordinator(agentId, todoTitle, options) {
    return new Promise((resolve, reject) => {
      const args = [this.coordinatorPath, "create", agentId, todoTitle];

      if (options.priority) {
        args.push(`--${options.priority}`);
      }
      if (options.category) {
        args.push("--category", options.category);
      }

      const coordinator = spawn("node", args, {
        cwd: this.repositoryPath,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let output = "";
      let errorOutput = "";

      coordinator.stdout.on("data", (data) => {
        output += data.toString();
      });

      coordinator.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      coordinator.on("close", (code) => {
        if (code === 0) {
          const todoId = this.extractTodoId(output);
          resolve({ success: true, todoId, output });
        } else {
          reject(new Error(`Todo creation failed: ${errorOutput}`));
        }
      });

      coordinator.on("error", reject);
    });
  }

  /**
   * Initialize MCP connection for agent (simplified)
   */
  async initializeMCPConnection(agentId) {
    const connectionId = `mcp-${agentId}-${Date.now()}`;

    console.log(
      `🔌 Initializing MCP connection ${connectionId} for ${agentId}`,
    );

    // Store connection reference (simplified - no actual process)
    this.sessionData.set(connectionId, {
      agentId,
      startTime: Date.now(),
      status: "connected",
    });

    return {
      id: connectionId,
      agentId,
      status: "connected",
      startTime: new Date().toISOString(),
    };
  }

  /**
   * Register coordinated session
   */
  async registerCoordinatedSession(agentId, activity, context) {
    return new Promise((resolve, reject) => {
      const coordinator = spawn(
        "node",
        [this.coordinatorPath, "register", "mcp-ecosystem", "main", activity],
        {
          cwd: this.repositoryPath,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );

      coordinator.on("close", (code) => {
        if (code === 0) {
          resolve({
            success: true,
            sessionId: `session-${agentId}-${Date.now()}`,
          });
        } else {
          reject(new Error("Session registration failed"));
        }
      });

      coordinator.on("error", reject);
    });
  }

  /**
   * Extract todo ID from coordinator output
   */
  extractTodoId(output) {
    const match = output.match(/Todo ID: ([a-f0-9-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get bridge status
   */
  getStatus() {
    const activeSessions = Array.from(this.sessionData.entries()).map(
      ([id, data]) => ({
        connectionId: id,
        agentId: data.agentId,
        status: data.status,
        startTime: new Date(data.startTime).toISOString(),
      }),
    );

    const activeProcesses = Array.from(this.activeProcesses.entries()).map(
      ([operation, process]) => ({
        operation,
        pid: process.pid,
        active: !process.killed,
      }),
    );

    return {
      bridgeStatus: "active",
      activeConnections: activeSessions.length,
      activeOperations: activeProcesses.length,
      sessions: activeSessions,
      processes: activeProcesses,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Cleanup connections and processes
   */
  async cleanup() {
    console.log("🧹 Cleaning up MCP bridge connections...");

    // Kill all active processes
    for (const [operation, process] of this.activeProcesses) {
      if (!process.killed) {
        process.kill("SIGTERM");
        console.log(`🛑 Terminated process for operation: ${operation}`);
      }
    }

    // Clear session data
    this.sessionData.clear();
    this.activeProcesses.clear();

    console.log("✅ MCP bridge cleanup complete");
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const bridge = new MCPCoordinatorBridge();
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case "execute":
      const [agentId, operation] = args;
      const context = {};

      // Parse additional context from command line
      for (let i = 2; i < args.length; i += 2) {
        if (args[i] && args[i + 1]) {
          context[args[i].replace("--", "")] = args[i + 1];
        }
      }

      bridge
        .executeWithCoordinator(agentId, operation, context)
        .then((result) => {
          console.log(
            "✅ Operation completed:",
            JSON.stringify(result, null, 2),
          );
          process.exit(0);
        })
        .catch((error) => {
          console.error("❌ Operation failed:", error.message);
          process.exit(1);
        });
      break;

    case "start-session":
      const [sessionAgentId, todoTitle] = args;
      const options = {};

      // Parse options
      for (let i = 2; i < args.length; i++) {
        if (args[i].startsWith("--")) {
          const key = args[i].replace("--", "");
          const value = args[i + 1];
          if (value && !value.startsWith("--")) {
            options[key] = value;
            i++;
          } else {
            options[key] = true;
          }
        }
      }

      bridge
        .startCoordinatedSession(sessionAgentId, todoTitle, options)
        .then((result) => {
          console.log("✅ Session started:", JSON.stringify(result, null, 2));
          process.exit(0);
        })
        .catch((error) => {
          console.error("❌ Session start failed:", error.message);
          process.exit(1);
        });
      break;

    case "status":
      console.log("📊 MCP Bridge Status:");
      console.log(JSON.stringify(bridge.getStatus(), null, 2));
      break;

    case "cleanup":
      bridge
        .cleanup()
        .then(() => {
          console.log("✅ Cleanup completed");
          process.exit(0);
        })
        .catch((error) => {
          console.error("❌ Cleanup failed:", error.message);
          process.exit(1);
        });
      break;

    default:
      console.log(`
MCP Coordinator Bridge

Usage:
  node mcp-coordinator-bridge.js <command> [options]

Commands:
  execute <agentId> <operation> [--context value]    Execute MCP operation with coordination
  start-session <agentId> <todoTitle> [--options]   Start coordinated session
  status                                           Show bridge status
  cleanup                                          Clean up connections

Examples:
  node mcp-coordinator-bridge.js execute my-agent file-read --filePath ./src/app.js
  node mcp-coordinator-bridge.js start-session my-agent "Implement authentication" --high
  node mcp-coordinator-bridge.js status
      `);
      break;
  }
}

export default MCPCoordinatorBridge;
