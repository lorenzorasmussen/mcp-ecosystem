#!/usr/bin/env node

/**
 * MCP Coordination Server
 *
 * Standalone coordination service that integrates with the MCP ecosystem.
 * Provides REST API for coordination operations and health monitoring.
 */

import express from "express";
import cors from "cors";
import path from "path";
import CoordinationEnforcer from "../../../tools/scripts/coordination-enforcer.js";
import LLMCoordinator from "../../../tools/scripts/llm-coordination.js";
import SharedTodoService from "../../../tools/scripts/shared-todo-service.js";

const app = express();
const PORT = process.env.PORT || 3109;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize coordination services
const repositoryPath = process.env.REPOSITORY_PATH || process.cwd();
const sharedKnowledgePath = path.join(
  repositoryPath,
  "data",
  "shared-knowledge",
  ".mcp-shared-knowledge",
);

const enforcer = new CoordinationEnforcer(repositoryPath);
const llmCoordinator = new LLMCoordinator(repositoryPath);
const todoService = new SharedTodoService(sharedKnowledgePath);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "mcp-coordination-server",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Get comprehensive coordination status
app.get("/api/status", async (req, res) => {
  try {
    const coordinationData = enforcer.loadCoordinationData();
    const activeSessions = Object.values(coordinationData.sessions).filter(
      (session) => enforcer.isSessionActive(session),
    );

    // Get todo statistics
    let todoStats = { total: 0, active: 0, completed: 0, agents: 0 };
    try {
      const todos = await todoService.getAllTodos();
      const agents = await todoService.getAllAgents();

      todoStats = {
        total: todos.length,
        active: todos.filter((t) => !t.completed).length,
        completed: todos.filter((t) => t.completed).length,
        agents: agents.length,
      };
    } catch (error) {
      console.warn("Could not load todo statistics:", error.message);
    }

    res.json({
      success: true,
      data: {
        sessions: {
          total: Object.keys(coordinationData.sessions).length,
          active: activeSessions.length,
          branches: Object.keys(coordinationData.branches).length,
        },
        todos: todoStats,
        enforcement: {
          rules_loaded: true,
          hooks_installed: true, // Assume installed if server is running
          violations: enforcer.detectViolations(coordinationData).length,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get coordination status",
      details: error.message,
    });
  }
});

// Branch switching permission check
app.post("/api/enforcement/check-branch", (req, res) => {
  try {
    const { branch, force = false } = req.body;

    if (!branch) {
      return res.status(400).json({
        success: false,
        error: "Branch name required",
      });
    }

    const result = enforcer.canSwitchBranch(branch, force);
    res.json({
      success: true,
      allowed: result.allowed,
      reason: result.reason,
      conflicts: result.conflicts || [],
      branch,
      force,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Branch check failed",
      details: error.message,
    });
  }
});

// Git operation permission check
app.post("/api/enforcement/check-git", (req, res) => {
  try {
    const { operation, options = {} } = req.body;

    if (!operation) {
      return res.status(400).json({
        success: false,
        error: "Operation required",
      });
    }

    const result = enforcer.canPerformGitOperation(operation, options);
    res.json({
      success: true,
      allowed: result.allowed,
      reason: result.reason,
      operation,
      options,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Git operation check failed",
      details: error.message,
    });
  }
});

// Todo operation permission check
app.post("/api/enforcement/check-todo", (req, res) => {
  try {
    const { operation, todoId, agentId, options = {} } = req.body;

    if (!operation || !todoId) {
      return res.status(400).json({
        success: false,
        error: "Operation and todoId required",
      });
    }

    const result = enforcer.canPerformTodoOperation(
      operation,
      todoId,
      agentId,
      options,
    );
    res.json({
      success: true,
      allowed: result.allowed,
      reason: result.reason,
      operation,
      todoId,
      agentId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Todo operation check failed",
      details: error.message,
    });
  }
});

// Get enforcement report
app.get("/api/enforcement/report", (req, res) => {
  try {
    // Capture console output from generateEnforcementReport
    let reportOutput = "";
    const originalLog = console.log;
    console.log = (...args) => {
      reportOutput += args.join(" ") + "\n";
    };

    enforcer.generateEnforcementReport();

    // Restore console.log
    console.log = originalLog;

    res.json({
      success: true,
      report: reportOutput.trim(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Report generation failed",
      details: error.message,
    });
  }
});

// Enforce session limits
app.post("/api/admin/enforce-limits", (req, res) => {
  try {
    enforcer.enforceSessionLimits();
    res.json({
      success: true,
      message: "Session limits enforced",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Session limit enforcement failed",
      details: error.message,
    });
  }
});

// Get coordination data (read-only)
app.get("/api/data", (req, res) => {
  try {
    const data = enforcer.loadCoordinationData();
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to load coordination data",
      details: error.message,
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Coordination server error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    details: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
    method: req.method,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MCP Coordination Server running on http://localhost:${PORT}`);
  console.log(`   Repository: ${repositoryPath}`);
  console.log(`   Knowledge path: ${sharedKnowledgePath}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down MCP Coordination Server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down MCP Coordination Server...");
  process.exit(0);
});

export default app;
