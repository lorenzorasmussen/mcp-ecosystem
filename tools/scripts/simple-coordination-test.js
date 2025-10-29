#!/usr/bin/env node

/**
 * Simple Coordination and Todo Integration Test
 *
 * This script demonstrates the integration between LLM coordination and todo enforcement
 * with a simplified, working implementation.
 */

import EnhancedLLMCoordinator from "./llm-coordination-with-todos.js";
import SharedTodoService from "./shared-todo-service.js";
import path from "path";

class SimpleCoordinationTest {
  constructor() {
    this.coordinator = new EnhancedLLMCoordinator();
    this.todoService = new SharedTodoService(
      path.join(
        process.cwd(),
        "data",
        "shared-knowledge",
        ".mcp-shared-knowledge",
      ),
    );
  }

  async runTest() {
    console.log("🧪 Starting Simple Coordination Test");
    console.log("=".repeat(50));

    try {
      // Step 1: Register session
      console.log("\n1️⃣ Registering coordination session...");
      await this.coordinator.registerSession(
        "test-project",
        "test-branch",
        "testing coordination integration",
      );

      // Step 2: Create a todo for our test operation
      console.log("\n2️⃣ Creating todo for test operation...");
      const agentId = this.coordinator.sessionId;
      const testTodo = await this.todoService.createTodo(
        {
          title: "Test MCP Integration Operation",
          description:
            "Testing the integration between LLM coordination and todo enforcement",
          status: "pending",
          priority: "high",
          category: "testing",
          context: { operation: "test-mcp-operation" },
        },
        agentId,
      );

      console.log(`✅ Created todo: ${testTodo.id}`);

      // Step 3: Start the todo
      console.log("\n3️⃣ Starting todo...");
      await this.todoService.startTodo(testTodo.id, agentId);
      console.log(`✅ Started todo: ${testTodo.id}`);

      // Step 4: Execute coordinated operation
      console.log("\n4️⃣ Executing coordinated operation...");
      const operationResult =
        await this.coordinator.executeCoordinatedOperation(
          "test-mcp-operation",
          {
            todoId: testTodo.id,
            agentId: agentId,
            operation: "test",
          },
        );

      if (operationResult.success) {
        console.log("✅ Coordinated operation executed successfully");
        console.log(
          `   Todo compliance: ${operationResult.todoValidation.metrics.complianceRate}%`,
        );
      } else {
        console.log("❌ Coordinated operation failed");
        console.log(`   Reason: ${operationResult.reason}`);
      }

      // Step 5: Complete the todo
      console.log("\n5️⃣ Completing todo...");
      await this.todoService.completeTodo(testTodo.id, agentId, {
        result: "Test completed successfully",
        notes: "Integration test passed",
      });
      console.log(`✅ Completed todo: ${testTodo.id}`);

      // Step 6: Complete operation
      console.log("\n6️⃣ Completing coordinated operation...");
      await this.coordinator.completeOperation("test-mcp-operation", {
        testResult: "success",
        todoId: testTodo.id,
      });

      // Step 7: Show final status
      console.log("\n7️⃣ Final status:");
      await this.coordinator.getStatus();

      // Step 8: Cleanup
      console.log("\n8️⃣ Cleaning up...");
      await this.coordinator.unregisterSession();

      console.log("\n✅ Simple Coordination Test Completed Successfully!");
      return { success: true };
    } catch (error) {
      console.error("\n❌ Test failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  async demonstrateRealWorkflow() {
    console.log("\n🔄 Demonstrating Real MCP Workflow");
    console.log("=".repeat(50));

    try {
      // Register session for real workflow
      await this.coordinator.registerSession(
        "mcp-ecosystem",
        "develop",
        "implementing new feature",
      );

      const agentId = this.coordinator.sessionId;

      // Create todos for a typical workflow
      const todos = [
        {
          title: "Connect to MCP server",
          description:
            "Establish connection to the MCP server for tool execution",
          priority: "high",
          category: "infrastructure",
        },
        {
          title: "Execute MCP tool",
          description:
            "Run a tool on the MCP server to perform required operation",
          priority: "high",
          category: "development",
        },
        {
          title: "Process results",
          description: "Process and store the results from MCP tool execution",
          priority: "medium",
          category: "data",
        },
      ];

      const createdTodos = [];
      for (const todoData of todos) {
        const todo = await this.todoService.createTodo(
          {
            ...todoData,
            status: "pending",
            context: { workflow: "mcp-integration-demo" },
          },
          agentId,
        );

        createdTodos.push(todo);
        console.log(`📝 Created todo: ${todo.title}`);
      }

      // Execute workflow step by step
      for (let i = 0; i < createdTodos.length; i++) {
        const todo = createdTodos[i];

        console.log(`\n▶️ Step ${i + 1}: ${todo.title}`);

        // Start todo
        await this.todoService.startTodo(todo.id, agentId);

        // Execute coordinated operation
        const operationResult =
          await this.coordinator.executeCoordinatedOperation(
            `workflow-step-${i + 1}`,
            {
              todoId: todo.id,
              step: i + 1,
              totalSteps: createdTodos.length,
            },
          );

        if (operationResult.success) {
          // Simulate work
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Complete todo
          await this.todoService.completeTodo(todo.id, agentId, {
            step: i + 1,
            result: "completed successfully",
          });

          // Complete operation
          await this.coordinator.completeOperation(`workflow-step-${i + 1}`, {
            step: i + 1,
            todoId: todo.id,
          });

          console.log(`✅ Step ${i + 1} completed`);
        } else {
          console.log(`❌ Step ${i + 1} failed: ${operationResult.reason}`);
          break;
        }
      }

      // Show final status
      console.log("\n📊 Final Workflow Status:");
      await this.coordinator.getStatus();

      // Cleanup
      await this.coordinator.unregisterSession();

      console.log("\n✅ Real MCP Workflow Demo Completed!");
      return { success: true };
    } catch (error) {
      console.error("\n❌ Workflow demo failed:", error.message);
      return { success: false, error: error.message };
    }
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0] || "test";

const test = new SimpleCoordinationTest();

const runCommand = async () => {
  try {
    switch (command) {
      case "test":
        await test.runTest();
        break;

      case "demo":
        await test.demonstrateRealWorkflow();
        break;

      default:
        console.log("🧪 Simple Coordination Test");
        console.log("");
        console.log("Usage:");
        console.log(
          "  node simple-coordination-test.js test    - Run basic integration test",
        );
        console.log(
          "  node simple-coordination-test.js demo    - Demonstrate real workflow",
        );
        console.log("");
        break;
    }
  } catch (error) {
    console.error("❌ Command failed:", error.message);
    process.exit(1);
  }
};

runCommand();

export default SimpleCoordinationTest;
