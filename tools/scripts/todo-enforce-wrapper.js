#!/usr/bin/env node

/**
 * Universal Todo Enforcement Wrapper
 *
 * This script wraps any command with todo enforcement, ensuring that
 * all operations require active todos before execution.
 *
 * Usage: node tools/scripts/todo-enforce-wrapper.js <agent-id> <operation> -- <command> [args...]
 *
 * Example: node tools/scripts/todo-enforce-wrapper.js qwen-agent "run tests" -- npm test
 */

import { spawn } from "child_process";
import TodoEnforcementHook from "./todo-enforcement-hook.js";

// Load environment variables from .env.todo if it exists
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), "config", ".env.todo");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const envLines = envContent
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"));

  envLines.forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

class TodoEnforcementWrapper {
  constructor() {
    this.enforcementHook = new TodoEnforcementHook({
      strictMode: process.env.TODO_ENFORCEMENT_STRICT === "true",
    });
  }

  async run() {
    const args = process.argv.slice(2);

    // Parse arguments: agent-id operation -- command [args...]
    const separatorIndex = args.indexOf("--");
    if (separatorIndex === -1) {
      console.error(
        "❌ Usage: node tools/scripts/todo-enforce-wrapper.js <agent-id> <operation> -- <command> [args...]",
      );
      console.error(
        "Example: node tools/scripts/todo-enforce-wrapper.js qwen-agent 'run tests' -- npm test",
      );
      process.exit(1);
    }

    const [agentId, operation] = args.slice(0, separatorIndex);
    const commandArgs = args.slice(separatorIndex + 1);

    if (!agentId || !operation || commandArgs.length === 0) {
      console.error("❌ Missing required arguments");
      console.error(
        "Usage: node tools/scripts/todo-enforce-wrapper.js <agent-id> <operation> -- <command> [args...]",
      );
      process.exit(1);
    }

    try {
      console.log(
        `🔍 Enforcing todo for agent ${agentId}, operation: ${operation}`,
      );

      // Validate todo exists
      const validation = await this.enforcementHook.validateTodoForOperation(
        operation,
        agentId,
        { command: commandArgs.join(" ") },
      );

      if (!validation.valid) {
        console.error(`❌ Todo enforcement failed: ${validation.error}`);
        process.exit(1);
      }

      console.log(`✅ Todo validation passed. Executing command...`);

      // Execute the command
      const result = await this.executeCommand(commandArgs);

      // Update todo status
      await this.enforcementHook.updateTodoStatus(agentId, operation, {
        success: result.success,
        exitCode: result.exitCode,
        executionTime: result.executionTime,
      });

      if (result.success) {
        console.log(
          `✅ Command completed successfully in ${result.executionTime}ms`,
        );
      } else {
        console.log(`❌ Command failed with exit code ${result.exitCode}`);
      }

      process.exit(result.exitCode);
    } catch (error) {
      console.error(`❌ Todo enforcement error: ${error.message}`);

      // Update todo status on error
      try {
        await this.enforcementHook.updateTodoStatus(agentId, operation, {
          success: false,
          error: error.message,
        });
      } catch (updateError) {
        console.error(
          `❌ Failed to update todo status: ${updateError.message}`,
        );
      }

      process.exit(1);
    }
  }

  async executeCommand(args) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const [command, ...commandArgs] = args;

      console.log(`▶️ Running: ${command} ${commandArgs.join(" ")}`);

      const child = spawn(command, commandArgs, {
        stdio: "inherit",
        cwd: process.cwd(),
      });

      child.on("close", (code) => {
        const executionTime = Date.now() - startTime;
        resolve({
          success: code === 0,
          exitCode: code,
          executionTime,
        });
      });

      child.on("error", (error) => {
        const executionTime = Date.now() - startTime;
        console.error(`❌ Command execution error: ${error.message}`);
        resolve({
          success: false,
          exitCode: 1,
          executionTime,
          error: error.message,
        });
      });
    });
  }
}

// Run the wrapper
const wrapper = new TodoEnforcementWrapper();
wrapper.run().catch((error) => {
  console.error(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});
