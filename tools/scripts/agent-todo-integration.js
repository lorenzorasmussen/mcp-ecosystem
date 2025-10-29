#!/usr/bin/env node

/**
 * Agent Todo Integration System
 *
 * This script integrates todo enforcement into the agent execution workflow,
 * ensuring all agents must use todos before proceeding with any operation.
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import TodoEnforcementHook from "./todo-enforcement-hook.js";
import SharedTodoService from "./shared-todo-service.js";

class AgentTodoIntegration {
  constructor() {
    this.repositoryPath = process.cwd();
    this.enforcementHook = new TodoEnforcementHook({
      repositoryPath: this.repositoryPath,
      strictMode: process.env.TODO_ENFORCEMENT_STRICT === "true",
    });
    this.sharedTodoService = new SharedTodoService(
      path.join(
        this.repositoryPath,
        "data",
        "shared-knowledge",
        ".mcp-shared-knowledge",
      ),
    );
    this.agentsPath = path.join(this.repositoryPath, ".qwen", "agents");
  }

  /**
   * Wrap agent execution with todo validation
   */
  async executeWithTodoValidation(agentId, operation, args = []) {
    console.log(
      `🤖 Executing agent ${agentId} with todo validation for operation: ${operation}`,
    );

    try {
      // Step 1: Validate todo exists for this operation
      const context = this.buildContext(operation, args);
      const validation = await this.enforcementHook.validateTodoForOperation(
        operation,
        agentId,
        context,
      );

      if (!validation.valid) {
        throw new Error(`Todo validation failed: ${validation.error}`);
      }

      // Step 2: Execute the agent operation
      console.log(`▶️ Executing operation: ${operation}`);
      const result = await this.executeAgentOperation(agentId, operation, args);

      // Step 3: Update todo status based on result
      await this.enforcementHook.updateTodoStatus(agentId, operation, result);

      // Step 4: Return result with todo information
      return {
        ...result,
        todoValidation: validation,
        agentId: agentId,
        operation: operation,
      };
    } catch (error) {
      console.error(`❌ Agent execution failed:`, error.message);

      // Update todo status to cancelled on failure
      await this.enforcementHook.updateTodoStatus(agentId, operation, {
        success: false,
      });

      throw error;
    }
  }

  /**
   * Build context for todo validation
   */
  buildContext(operation, args) {
    const context = {
      operation: operation,
      timestamp: new Date().toISOString(),
    };

    // Extract file information from args
    if (args.some((arg) => arg.includes("--file") || arg.includes("-f"))) {
      const fileIndex = args.findIndex(
        (arg) => arg.includes("--file") || arg.includes("-f"),
      );
      if (fileIndex !== -1 && args[fileIndex + 1]) {
        context.file = args[fileIndex + 1];
      }
    }

    // Extract feature information
    if (args.some((arg) => arg.includes("--feature"))) {
      const featureIndex = args.findIndex((arg) => arg.includes("--feature"));
      if (featureIndex !== -1 && args[featureIndex + 1]) {
        context.feature = args[featureIndex + 1];
      }
    }

    return context;
  }

  /**
   * Execute the actual agent operation
   */
  async executeAgentOperation(agentId, operation, args) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      // Find the agent script or command
      const agentCommand = this.getAgentCommand(agentId, operation);

      if (!agentCommand) {
        reject(
          new Error(`Unknown operation ${operation} for agent ${agentId}`),
        );
        return;
      }

      console.log(`🔧 Running command: ${agentCommand} ${args.join(" ")}`);

      const child = spawn(agentCommand, args, {
        stdio: "inherit",
        cwd: this.repositoryPath,
        env: {
          ...process.env,
          AGENT_ID: agentId,
          OPERATION: operation,
          TODO_ENFORCED: "true",
        },
      });

      child.on("close", (code) => {
        const executionTime = Date.now() - startTime;

        if (code === 0) {
          console.log(`✅ Agent operation completed in ${executionTime}ms`);
          resolve({
            success: true,
            exitCode: code,
            executionTime: executionTime,
            output: "Operation completed successfully",
          });
        } else {
          console.log(`❌ Agent operation failed with exit code ${code}`);
          resolve({
            success: false,
            exitCode: code,
            executionTime: executionTime,
            error: `Operation failed with exit code ${code}`,
          });
        }
      });

      child.on("error", (error) => {
        console.error(`❌ Agent execution error:`, error);
        reject(error);
      });
    });
  }

  /**
   * Get the command to execute for a specific agent and operation
   */
  getAgentCommand(agentId, operation) {
    // Map operations to commands
    const operationMap = {
      read: "node",
      write: "node",
      edit: "node",
      bash: "bash",
      task: "node",
      search: "node",
      webfetch: "node",
    };

    // Agent-specific command mappings
    const agentCommands = {
      "mcp-client-bridge": {
        start: "node mcp.ecosystem/mcp.clients/mcp.client-bridge/index.js",
        test: "npm test",
        build: "npm run build",
      },
      general: {
        read: "node",
        write: "node",
        edit: "node",
        bash: "bash",
        task: "node",
      },
    };

    // Try agent-specific commands first
    if (agentCommands[agentId] && agentCommands[agentId][operation]) {
      return agentCommands[agentId][operation];
    }

    // Fall back to general commands
    if (agentCommands.general && agentCommands.general[operation]) {
      return agentCommands.general[operation];
    }

    // Default to operation mapping
    return operationMap[operation] || operation;
  }

  /**
   * Initialize todo system for all agents
   */
  async initializeAllAgents() {
    console.log("🚀 Initializing todo system for all agents...");

    const agents = await this.getAllAgents();
    const results = [];

    for (const agentId of agents) {
      try {
        await this.enforcementHook.initializeAgentSession(
          agentId,
          "initialization",
        );
        results.push({ agentId, success: true });
      } catch (error) {
        results.push({ agentId, success: false, error: error.message });
      }
    }

    return results;
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
   * Monitor todo compliance across all agents
   */
  async monitorCompliance() {
    console.log("📊 Monitoring todo compliance...");

    // Get basic compliance metrics
    const basicMetrics = await this.enforcementHook.getComplianceMetrics();

    // Get detailed shared todo statistics
    const systemStats = await this.sharedTodoService.getSystemStats();
    const allAgents = await this.sharedTodoService.getAllAgents();

    // Combine metrics
    const metrics = {
      ...basicMetrics,
      systemStats: systemStats,
      agentDetails: allAgents,
      topPerformers: this.getTopPerformers(allAgents),
      recentActivity: systemStats.recentActivity?.slice(0, 5) || [],
    };

    console.log(`
📈 Todo Compliance Metrics:
  Total Agents: ${metrics.totalAgents}
  Agents with Active Todos: ${metrics.agentsWithActiveTodos}
  Total Active Todos: ${metrics.totalActiveTodos}
  Compliance Rate: ${metrics.complianceRate}%

📊 System Statistics:
  Total Todos: ${systemStats.metadata?.totalTasks || 0}
  Active Todos: ${systemStats.metadata?.activeTasks || 0}
  Completed Todos: ${systemStats.metadata?.completedTasks || 0}
  Agent Count: ${systemStats.agentCount || 0}

🏆 Top Performers:
${this.formatTopPerformers(metrics.topPerformers)}

📝 Recent Activity:
${this.formatRecentActivity(metrics.recentActivity)}
    `);

    if (metrics.complianceRate < 80) {
      console.warn(
        "⚠️ Low compliance rate detected. Consider enabling strict mode.",
      );
    }

    return metrics;
  }

  /**
   * Get top performing agents
   */
  getTopPerformers(agents) {
    return Object.entries(agents)
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => (b.completionRate || 0) - (a.completionRate || 0))
      .slice(0, 5);
  }

  /**
   * Format top performers for display
   */
  formatTopPerformers(performers) {
    return performers
      .map(
        (agent, index) =>
          `  ${index + 1}. ${agent.id}: ${agent.totalCompleted}/${agent.totalAssigned} (${agent.completionRate?.toFixed(1) || 0}%)`,
      )
      .join("\n");
  }

  /**
   * Format recent activity for display
   */
  formatRecentActivity(activities) {
    return activities
      .map(
        (activity) =>
          `  ${new Date(activity.timestamp).toLocaleString()}: ${activity.action} by ${activity.agentId}`,
      )
      .join("\n");
  }

  /**
   * Run the integration system
   */
  async run(agentId, operation, args = []) {
    try {
      console.log("🔧 Starting Agent Todo Integration...");

      // If no specific agent/operation, show compliance metrics
      if (!agentId || agentId === "monitor") {
        return await this.monitorCompliance();
      }

      // If initializing all agents
      if (operation === "init-all") {
        return await this.initializeAllAgents();
      }

      // Execute specific operation with todo validation
      return await this.executeWithTodoValidation(agentId, operation, args);
    } catch (error) {
      console.error("❌ Agent Todo Integration failed:", error.message);
      process.exit(1);
    }
  }
}

// CLI interface
const args = process.argv.slice(2);
const agentId = args[0];
const operation = args[1];
const operationArgs = args.slice(2);

const integration = new AgentTodoIntegration();
integration
  .run(agentId, operation, operationArgs)
  .then((result) => {
    console.log("✅ Agent Todo Integration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Agent Todo Integration failed:", error.message);
    process.exit(1);
  });

export default AgentTodoIntegration;
