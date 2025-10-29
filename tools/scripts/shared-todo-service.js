#!/usr/bin/env node

/**
 * Shared Todo Service with Identity Tracking
 *
 * This service manages a shared todo knowledge base that all LLMs can see and follow.
 * Each todo has identity tracking for creation, assignment, completion, and ownership.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SharedTodoService {
  constructor(sharedKnowledgePath) {
    this.sharedKnowledgePath =
      sharedKnowledgePath ||
      path.join(
        process.cwd(),
        "data",
        "shared-knowledge",
        ".mcp-shared-knowledge",
      );
    this.tasksPath = path.join(
      this.sharedKnowledgePath,
      "tasks",
      "shared_tasks.json",
    );
    this.ensureDirectories();
    this.data = null;
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    const tasksDir = path.dirname(this.tasksPath);
    if (!fs.existsSync(tasksDir)) {
      fs.mkdirSync(tasksDir, { recursive: true });
    }
  }

  /**
   * Load shared todo data
   */
  async loadData() {
    try {
      if (fs.existsSync(this.tasksPath)) {
        const rawData = fs.readFileSync(this.tasksPath, "utf8");
        this.data = JSON.parse(rawData);
      } else {
        // Initialize with default structure
        this.data = {
          metadata: {
            version: "2.0",
            lastUpdated: new Date().toISOString(),
            totalTasks: 0,
            activeTasks: 0,
            completedTasks: 0,
            agents: {},
            categories: {},
          },
          tasks: [],
          agents: {},
          workflows: {},
          auditLog: [],
        };
        await this.saveData();
      }
      return this.data;
    } catch (error) {
      console.error("Failed to load shared todo data:", error);
      throw error;
    }
  }

  /**
   * Save shared todo data
   */
  async saveData() {
    try {
      this.data.metadata.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.tasksPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error("Failed to save shared todo data:", error);
      throw error;
    }
  }

  /**
   * Create a new todo with full identity tracking
   */
  async createTodo(todoData, creatorAgentId) {
    await this.loadData();

    const todo = {
      id: this.generateTodoId(),
      title: todoData.title || todoData.content,
      description: todoData.description || todoData.content,
      status: todoData.status || "pending",
      priority: todoData.priority || "medium",
      category: todoData.category || "general",
      tags: todoData.tags || [],

      // Identity tracking
      createdBy: creatorAgentId,
      createdAt: new Date().toISOString(),
      assignedTo: todoData.assignedTo || null,
      assignedAt: todoData.assignedTo ? new Date().toISOString() : null,
      assignedBy: todoData.assignedTo ? creatorAgentId : null,

      // Progress tracking
      startedAt: null,
      completedAt: null,
      completedBy: null,
      estimatedTime: todoData.estimatedTime || null,
      actualTime: null,

      // Context and metadata
      context: todoData.context || {},
      dependencies: todoData.dependencies || [],
      subtasks: todoData.subtasks || [],
      comments: [],

      // Workflow tracking
      workflowId: todoData.workflowId || null,
      parentTaskId: todoData.parentTaskId || null,
      childTaskIds: [],

      // Audit trail
      history: [
        {
          action: "created",
          agentId: creatorAgentId,
          timestamp: new Date().toISOString(),
          details: { initialData: todoData },
        },
      ],
    };

    this.data.tasks.push(todo);
    await this.updateMetadata();
    await this.addAuditEntry("todo_created", creatorAgentId, {
      todoId: todo.id,
      title: todo.title,
    });

    // Update agent statistics
    await this.updateAgentStats(creatorAgentId, "created", todo);

    console.log(
      `✅ Created shared todo: ${todo.title} (ID: ${todo.id}) by ${creatorAgentId}`,
    );
    return todo;
  }

  /**
   * Assign a todo to an agent
   */
  async assignTodo(todoId, assigneeAgentId, assignerAgentId) {
    await this.loadData();

    const todo = this.data.tasks.find((t) => t.id === todoId);
    if (!todo) {
      throw new Error(`Todo ${todoId} not found`);
    }

    const oldAssignee = todo.assignedTo;
    todo.assignedTo = assigneeAgentId;
    todo.assignedAt = new Date().toISOString();
    todo.assignedBy = assignerAgentId;

    // Add to history
    todo.history.push({
      action: "assigned",
      agentId: assignerAgentId,
      timestamp: new Date().toISOString(),
      details: {
        oldAssignee: oldAssignee,
        newAssignee: assigneeAgentId,
      },
    });

    await this.saveData();
    await this.addAuditEntry("todo_assigned", assignerAgentId, {
      todoId: todoId,
      assignee: assigneeAgentId,
      title: todo.title,
    });

    // Update agent statistics
    if (oldAssignee) {
      await this.updateAgentStats(oldAssignee, "unassigned", todo);
    }
    await this.updateAgentStats(assigneeAgentId, "assigned", todo);

    console.log(
      `👤 Assigned todo ${todoId} to ${assigneeAgentId} by ${assignerAgentId}`,
    );
    return todo;
  }

  /**
   * Start working on a todo
   */
  async startTodo(todoId, agentId) {
    await this.loadData();

    const todo = this.data.tasks.find((t) => t.id === todoId);
    if (!todo) {
      throw new Error(`Todo ${todoId} not found`);
    }

    if (todo.assignedTo && todo.assignedTo !== agentId) {
      throw new Error(
        `Todo ${todoId} is assigned to ${todo.assignedTo}, not ${agentId}`,
      );
    }

    todo.status = "in_progress";
    todo.startedAt = new Date().toISOString();

    // Auto-assign if not assigned
    if (!todo.assignedTo) {
      todo.assignedTo = agentId;
      todo.assignedAt = new Date().toISOString();
      todo.assignedBy = agentId;
    }

    // Add to history
    todo.history.push({
      action: "started",
      agentId: agentId,
      timestamp: new Date().toISOString(),
      details: {},
    });

    await this.saveData();
    await this.addAuditEntry("todo_started", agentId, {
      todoId: todoId,
      title: todo.title,
    });

    // Update agent statistics
    await this.updateAgentStats(agentId, "started", todo);

    console.log(`▶️ Started working on todo ${todoId} by ${agentId}`);
    return todo;
  }

  /**
   * Complete a todo
   */
  async completeTodo(todoId, agentId, completionData = {}) {
    await this.loadData();

    const todo = this.data.tasks.find((t) => t.id === todoId);
    if (!todo) {
      throw new Error(`Todo ${todoId} not found`);
    }

    if (todo.assignedTo && todo.assignedTo !== agentId) {
      throw new Error(
        `Todo ${todoId} is assigned to ${todo.assignedTo}, not ${agentId}`,
      );
    }

    const oldStatus = todo.status;
    todo.status = "completed";
    todo.completedAt = new Date().toISOString();
    todo.completedBy = agentId;
    todo.actualTime = completionData.actualTime || null;

    // Add completion details
    if (completionData.result) {
      todo.result = completionData.result;
    }
    if (completionData.notes) {
      todo.completionNotes = completionData.notes;
    }

    // Add to history
    todo.history.push({
      action: "completed",
      agentId: agentId,
      timestamp: new Date().toISOString(),
      details: completionData,
    });

    await this.saveData();
    await this.updateMetadata();
    await this.addAuditEntry("todo_completed", agentId, {
      todoId: todoId,
      title: todo.title,
      oldStatus: oldStatus,
    });

    // Update agent statistics
    await this.updateAgentStats(agentId, "completed", todo);

    console.log(`✅ Completed todo ${todoId} by ${agentId}`);
    return todo;
  }

  /**
   * Add a comment to a todo
   */
  async addComment(todoId, agentId, comment) {
    await this.loadData();

    const todo = this.data.tasks.find((t) => t.id === todoId);
    if (!todo) {
      throw new Error(`Todo ${todoId} not found`);
    }

    const commentObj = {
      id: this.generateCommentId(),
      agentId: agentId,
      content: comment,
      timestamp: new Date().toISOString(),
    };

    todo.comments.push(commentObj);

    // Add to history
    todo.history.push({
      action: "commented",
      agentId: agentId,
      timestamp: new Date().toISOString(),
      details: { commentId: commentObj.id },
    });

    await this.saveData();
    await this.addAuditEntry("todo_commented", agentId, {
      todoId: todoId,
      commentId: commentObj.id,
    });

    console.log(`💬 Added comment to todo ${todoId} by ${agentId}`);
    return commentObj;
  }

  /**
   * Get all todos visible to an agent
   */
  async getTodosForAgent(agentId, filters = {}) {
    await this.loadData();

    let todos = [...this.data.tasks];

    // Apply filters
    if (filters.status) {
      todos = todos.filter((t) => t.status === filters.status);
    }
    if (filters.category) {
      todos = todos.filter((t) => t.category === filters.category);
    }
    if (filters.priority) {
      todos = todos.filter((t) => t.priority === filters.priority);
    }
    if (filters.assignedTo) {
      todos = todos.filter((t) => t.assignedTo === filters.assignedTo);
    }
    if (filters.createdBy) {
      todos = todos.filter((t) => t.createdBy === filters.createdBy);
    }

    // Sort by priority and creation date
    todos.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return todos;
  }

  /**
   * Get todos assigned to a specific agent
   */
  async getAssignedTodos(agentId) {
    return await this.getTodosForAgent(agentId, { assignedTo: agentId });
  }

  /**
   * Get todos created by a specific agent
   */
  async getCreatedTodos(agentId) {
    return await this.getTodosForAgent(agentId, { createdBy: agentId });
  }

  /**
   * Get active todos (in progress)
   */
  async getActiveTodos(agentId = null) {
    const filters = { status: "in_progress" };
    if (agentId) {
      filters.assignedTo = agentId;
    }
    return await this.getTodosForAgent(agentId, filters);
  }

  /**
   * Get pending todos
   */
  async getPendingTodos(agentId = null) {
    const filters = { status: "pending" };
    if (agentId) {
      filters.assignedTo = agentId;
    }
    return await this.getTodosForAgent(agentId, filters);
  }

  /**
   * Get agent statistics
   */
  async getAgentStats(agentId) {
    await this.loadData();
    return (
      this.data.agents[agentId] || {
        totalCreated: 0,
        totalAssigned: 0,
        totalCompleted: 0,
        activeTasks: 0,
        completionRate: 0,
        averageCompletionTime: 0,
        lastActivity: null,
      }
    );
  }

  /**
   * Get all agents and their statistics
   */
  async getAllAgents() {
    await this.loadData();
    return this.data.agents;
  }

  /**
   * Get system-wide statistics
   */
  async getSystemStats() {
    await this.loadData();
    return {
      metadata: this.data.metadata,
      agentCount: Object.keys(this.data.agents).length,
      categoryBreakdown: this.data.metadata.categories,
      recentActivity: this.data.auditLog.slice(-10),
    };
  }

  /**
   * Search todos by query
   */
  async searchTodos(query, agentId = null) {
    await this.loadData();

    const lowerQuery = query.toLowerCase();
    let todos = this.data.tasks.filter(
      (todo) =>
        todo.title.toLowerCase().includes(lowerQuery) ||
        todo.description.toLowerCase().includes(lowerQuery) ||
        todo.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
        todo.category.toLowerCase().includes(lowerQuery),
    );

    // If agent specified, filter by visibility
    if (agentId) {
      // Agents can see todos they created, are assigned to, or public todos
      todos = todos.filter(
        (todo) =>
          todo.createdBy === agentId ||
          todo.assignedTo === agentId ||
          todo.status === "public",
      );
    }

    return todos;
  }

  /**
   * Create a workflow (group of related todos)
   */
  async createWorkflow(workflowData, creatorAgentId) {
    await this.loadData();

    const workflow = {
      id: this.generateWorkflowId(),
      name: workflowData.name,
      description: workflowData.description,
      status: "active",
      createdBy: creatorAgentId,
      createdAt: new Date().toISOString(),
      taskIds: workflowData.taskIds || [],
      metadata: workflowData.metadata || {},
    };

    this.data.workflows[workflow.id] = workflow;
    await this.saveData();
    await this.addAuditEntry("workflow_created", creatorAgentId, {
      workflowId: workflow.id,
      name: workflow.name,
    });

    console.log(
      `📋 Created workflow: ${workflow.name} (ID: ${workflow.id}) by ${creatorAgentId}`,
    );
    return workflow;
  }

  /**
   * Get workflow details
   */
  async getWorkflow(workflowId) {
    await this.loadData();
    return this.data.workflows[workflowId] || null;
  }

  /**
   * Update metadata counters
   */
  async updateMetadata() {
    this.data.metadata.totalTasks = this.data.tasks.length;
    this.data.metadata.activeTasks = this.data.tasks.filter(
      (t) => t.status === "in_progress",
    ).length;
    this.data.metadata.completedTasks = this.data.tasks.filter(
      (t) => t.status === "completed",
    ).length;

    // Update category breakdown
    this.data.metadata.categories = {};
    this.data.tasks.forEach((todo) => {
      this.data.metadata.categories[todo.category] =
        (this.data.metadata.categories[todo.category] || 0) + 1;
    });
  }

  /**
   * Update agent statistics
   */
  async updateAgentStats(agentId, action, todo) {
    if (!this.data.agents[agentId]) {
      this.data.agents[agentId] = {
        totalCreated: 0,
        totalAssigned: 0,
        totalCompleted: 0,
        activeTasks: 0,
        completionRate: 0,
        averageCompletionTime: 0,
        lastActivity: null,
        skills: [],
        preferences: {},
      };
    }

    const agent = this.data.agents[agentId];

    switch (action) {
      case "created":
        agent.totalCreated++;
        break;
      case "assigned":
        agent.totalAssigned++;
        break;
      case "started":
        agent.activeTasks++;
        break;
      case "completed":
        agent.totalCompleted++;
        agent.activeTasks = Math.max(0, agent.activeTasks - 1);
        if (agent.totalAssigned > 0) {
          agent.completionRate =
            (agent.totalCompleted / agent.totalAssigned) * 100;
        }
        break;
      case "unassigned":
        agent.activeTasks = Math.max(0, agent.activeTasks - 1);
        break;
    }

    agent.lastActivity = new Date().toISOString();
  }

  /**
   * Add audit log entry
   */
  async addAuditEntry(action, agentId, details) {
    const entry = {
      id: this.generateAuditId(),
      action: action,
      agentId: agentId,
      timestamp: new Date().toISOString(),
      details: details,
    };

    this.data.auditLog.push(entry);

    // Keep only last 1000 entries
    if (this.data.auditLog.length > 1000) {
      this.data.auditLog = this.data.auditLog.slice(-1000);
    }
  }

  /**
   * Generate unique IDs
   */
  generateTodoId() {
    return `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateCommentId() {
    return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateWorkflowId() {
    return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateAuditId() {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export data for backup or analysis
   */
  async exportData() {
    await this.loadData();
    return {
      exportDate: new Date().toISOString(),
      version: this.data.metadata.version,
      data: this.data,
    };
  }

  /**
   * Import data from backup
   */
  async importData(importData) {
    if (!importData.data) {
      throw new Error("Invalid import data format");
    }

    this.data = importData.data;
    await this.saveData();
    console.log("✅ Imported shared todo data");
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

const service = new SharedTodoService();

switch (command) {
  case "stats":
    service.getSystemStats().then((stats) => {
      console.log("📊 Shared Todo System Statistics:");
      console.log(JSON.stringify(stats, null, 2));
    });
    break;

  case "list":
    const agentId = args[1];
    service.getTodosForAgent(agentId).then((todos) => {
      console.log(`📋 Todos for agent ${agentId || "all"}:`);
      todos.forEach((todo) => {
        console.log(
          `- ${todo.id}: ${todo.title} [${todo.status}] (${todo.assignedTo || "unassigned"})`,
        );
      });
    });
    break;

  case "create":
    const creator = args[1];
    const title = args[2];
    if (!creator || !title) {
      console.error(
        "Usage: node shared-todo-service.js create <agentId> <title> [description]",
      );
      process.exit(1);
    }
    const description = args.slice(3).join(" ");
    service
      .createTodo(
        {
          title: title,
          description: description || title,
          priority: "medium",
        },
        creator,
      )
      .then((todo) => {
        console.log(`✅ Created todo: ${todo.id}`);
      });
    break;

  case "assign":
    const assigner = args[1];
    const todoId = args[2];
    const assignee = args[3];
    if (!assigner || !todoId || !assignee) {
      console.error(
        "Usage: node shared-todo-service.js assign <assigner> <todoId> <assignee>",
      );
      process.exit(1);
    }
    service.assignTodo(todoId, assignee, assigner).then(() => {
      console.log(`✅ Assigned todo ${todoId} to ${assignee}`);
    });
    break;

  case "start":
    const starter = args[1];
    const startTodoId = args[2];
    if (!starter || !startTodoId) {
      console.error(
        "Usage: node shared-todo-service.js start <agentId> <todoId>",
      );
      process.exit(1);
    }
    service.startTodo(startTodoId, starter).then(() => {
      console.log(`▶️ Started todo ${startTodoId}`);
    });
    break;

  case "complete":
    const completer = args[1];
    const completeTodoId = args[2];
    if (!completer || !completeTodoId) {
      console.error(
        "Usage: node shared-todo-service.js complete <agentId> <todoId>",
      );
      process.exit(1);
    }
    service.completeTodo(completeTodoId, completer).then(() => {
      console.log(`✅ Completed todo ${completeTodoId}`);
    });
    break;

  case "agents":
    service.getAllAgents().then((agents) => {
      console.log("🤖 Agent Statistics:");
      Object.entries(agents).forEach(([id, stats]) => {
        console.log(
          `${id}: ${stats.totalCompleted}/${stats.totalAssigned} completed (${stats.completionRate.toFixed(1)}%)`,
        );
      });
    });
    break;

  default:
    console.log(`
Usage: node shared-todo-service.js <command> [options]

Commands:
  stats                    Show system statistics
  list [agentId]           List todos for agent (or all)
  create <agent> <title>   Create a new todo
  assign <assigner> <todoId> <assignee>  Assign todo to agent
  start <agent> <todoId>   Start working on todo
  complete <agent> <todoId> Complete todo
  agents                   Show all agent statistics

Examples:
  node shared-todo-service.js stats
  node shared-todo-service.js list mcp-client-bridge
  node shared-todo-service.js create qwen-agent "Implement new feature"
  node shared-todo-service.js assign admin todo-123 qwen-agent
  node shared-todo-service.js start qwen-agent todo-123
  node shared-todo-service.js complete qwen-agent todo-123
    `);
}

export default SharedTodoService;
