#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TaskServer {
  constructor() {
    this.server = new Server(
      {
        name: 'task-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tasksDir = process.env.TASKS_DIR || path.join(__dirname, '../../data/tasks');
    this.tasksFile = path.join(this.tasksDir, 'tasks.json');
    this.setupTools();
    this.ensureTasksDir();
  }

  async ensureTasksDir() {
    try {
      await fs.mkdir(this.tasksDir, { recursive: true });

      // Initialize tasks file if it doesn't exist
      try {
        await fs.access(this.tasksFile);
      } catch {
        await fs.writeFile(this.tasksFile, JSON.stringify({ tasks: [] }, null, 2));
      }
    } catch (error) {
      console.error('Failed to create tasks directory:', error);
    }
  }

  setupTools() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'task_create',
            description: 'Create a new task',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Task title',
                },
                description: {
                  type: 'string',
                  description: 'Task description',
                },
                priority: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical'],
                  description: 'Task priority',
                  default: 'medium',
                },
                assignee: {
                  type: 'string',
                  description: 'Task assignee',
                },
                tags: {
                  type: 'array',
                  description: 'Task tags',
                  items: { type: 'string' },
                },
                dueDate: {
                  type: 'string',
                  description: 'Due date (ISO format)',
                },
                project: {
                  type: 'string',
                  description: 'Project name',
                },
              },
              required: ['title'],
            },
          },
          {
            name: 'task_list',
            description: 'List tasks with optional filtering',
            inputSchema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['pending', 'in_progress', 'completed', 'cancelled'],
                  description: 'Filter by status',
                },
                priority: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical'],
                  description: 'Filter by priority',
                },
                assignee: {
                  type: 'string',
                  description: 'Filter by assignee',
                },
                project: {
                  type: 'string',
                  description: 'Filter by project',
                },
                tags: {
                  type: 'array',
                  description: 'Filter by tags',
                  items: { type: 'string' },
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of tasks to return',
                  default: 50,
                },
              },
            },
          },
          {
            name: 'task_update',
            description: 'Update an existing task',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Task ID',
                },
                title: {
                  type: 'string',
                  description: 'Updated task title',
                },
                description: {
                  type: 'string',
                  description: 'Updated task description',
                },
                status: {
                  type: 'string',
                  enum: ['pending', 'in_progress', 'completed', 'cancelled'],
                  description: 'Updated task status',
                },
                priority: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical'],
                  description: 'Updated task priority',
                },
                assignee: {
                  type: 'string',
                  description: 'Updated task assignee',
                },
                tags: {
                  type: 'array',
                  description: 'Updated task tags',
                  items: { type: 'string' },
                },
                dueDate: {
                  type: 'string',
                  description: 'Updated due date (ISO format)',
                },
                project: {
                  type: 'string',
                  description: 'Updated project name',
                },
              },
              required: ['id'],
            },
          },
          {
            name: 'task_delete',
            description: 'Delete a task',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Task ID to delete',
                },
              },
              required: ['id'],
            },
          },
          {
            name: 'task_get',
            description: 'Get a specific task by ID',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Task ID',
                },
              },
              required: ['id'],
            },
          },
          {
            name: 'task_search',
            description: 'Search tasks by text query',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query',
                },
                fields: {
                  type: 'array',
                  description: 'Fields to search in',
                  items: {
                    type: 'string',
                    enum: ['title', 'description', 'tags', 'project', 'assignee'],
                  },
                  default: ['title', 'description'],
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results',
                  default: 20,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'task_stats',
            description: 'Get task statistics',
            inputSchema: {
              type: 'object',
              properties: {
                groupBy: {
                  type: 'string',
                  enum: ['status', 'priority', 'assignee', 'project'],
                  description: 'Group statistics by field',
                  default: 'status',
                },
              },
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'task_create':
            return await this.createTask(args);
          case 'task_list':
            return await this.listTasks(args);
          case 'task_update':
            return await this.updateTask(args);
          case 'task_delete':
            return await this.deleteTask(args);
          case 'task_get':
            return await this.getTask(args);
          case 'task_search':
            return await this.searchTasks(args);
          case 'task_stats':
            return await this.getTaskStats(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async loadTasks() {
    try {
      const data = await fs.readFile(this.tasksFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return { tasks: [] };
    }
  }

  async saveTasks(tasksData) {
    await fs.writeFile(this.tasksFile, JSON.stringify(tasksData, null, 2));
  }

  generateId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async createTask(args) {
    const { title, description, priority = 'medium', assignee, tags, dueDate, project } = args;

    const tasksData = await this.loadTasks();

    const newTask = {
      id: this.generateId(),
      title,
      description: description || '',
      status: 'pending',
      priority,
      assignee: assignee || null,
      tags: tags || [],
      dueDate: dueDate || null,
      project: project || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tasksData.tasks.push(newTask);
    await this.saveTasks(tasksData);

    return {
      content: [
        {
          type: 'text',
          text: `Task created successfully:\n\n${JSON.stringify(newTask, null, 2)}`,
        },
      ],
    };
  }

  async listTasks(args) {
    const { status, priority, assignee, project, tags, limit = 50 } = args;

    const tasksData = await this.loadTasks();
    let filteredTasks = tasksData.tasks;

    // Apply filters
    if (status) {
      filteredTasks = filteredTasks.filter(task => task.status === status);
    }
    if (priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === priority);
    }
    if (assignee) {
      filteredTasks = filteredTasks.filter(task => task.assignee === assignee);
    }
    if (project) {
      filteredTasks = filteredTasks.filter(task => task.project === project);
    }
    if (tags && tags.length > 0) {
      filteredTasks = filteredTasks.filter(task => tags.some(tag => task.tags.includes(tag)));
    }

    // Sort by creation date (newest first) and limit
    filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    filteredTasks = filteredTasks.slice(0, limit);

    return {
      content: [
        {
          type: 'text',
          text: `Found ${filteredTasks.length} tasks:\n\n${JSON.stringify(filteredTasks, null, 2)}`,
        },
      ],
    };
  }

  async updateTask(args) {
    const { id, ...updates } = args;

    const tasksData = await this.loadTasks();
    const taskIndex = tasksData.tasks.findIndex(task => task.id === id);

    if (taskIndex === -1) {
      throw new Error(`Task with ID ${id} not found`);
    }

    // Update task
    const updatedTask = {
      ...tasksData.tasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    tasksData.tasks[taskIndex] = updatedTask;
    await this.saveTasks(tasksData);

    return {
      content: [
        {
          type: 'text',
          text: `Task updated successfully:\n\n${JSON.stringify(updatedTask, null, 2)}`,
        },
      ],
    };
  }

  async deleteTask(args) {
    const { id } = args;

    const tasksData = await this.loadTasks();
    const taskIndex = tasksData.tasks.findIndex(task => task.id === id);

    if (taskIndex === -1) {
      throw new Error(`Task with ID ${id} not found`);
    }

    const deletedTask = tasksData.tasks.splice(taskIndex, 1)[0];
    await this.saveTasks(tasksData);

    return {
      content: [
        {
          type: 'text',
          text: `Task deleted successfully:\n\n${JSON.stringify(deletedTask, null, 2)}`,
        },
      ],
    };
  }

  async getTask(args) {
    const { id } = args;

    const tasksData = await this.loadTasks();
    const task = tasksData.tasks.find(task => task.id === id);

    if (!task) {
      throw new Error(`Task with ID ${id} not found`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Task details:\n\n${JSON.stringify(task, null, 2)}`,
        },
      ],
    };
  }

  async searchTasks(args) {
    const { query, fields = ['title', 'description'], limit = 20 } = args;

    const tasksData = await this.loadTasks();
    const queryLower = query.toLowerCase();

    const matchingTasks = tasksData.tasks.filter(task => {
      return fields.some(field => {
        const value = task[field];
        if (Array.isArray(value)) {
          return value.some(item => item.toLowerCase().includes(queryLower));
        }
        return value && value.toLowerCase().includes(queryLower);
      });
    });

    // Sort by relevance (exact matches first) and limit
    matchingTasks.sort((a, b) => {
      const aExact = fields.some(field => {
        const value = a[field];
        if (Array.isArray(value)) {
          return value.some(item => item.toLowerCase() === queryLower);
        }
        return value && value.toLowerCase() === queryLower;
      });

      const bExact = fields.some(field => {
        const value = b[field];
        if (Array.isArray(value)) {
          return value.some(item => item.toLowerCase() === queryLower);
        }
        return value && value.toLowerCase() === queryLower;
      });

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    });

    const results = matchingTasks.slice(0, limit);

    return {
      content: [
        {
          type: 'text',
          text: `Found ${results.length} matching tasks:\n\n${JSON.stringify(results, null, 2)}`,
        },
      ],
    };
  }

  async getTaskStats(args) {
    const { groupBy = 'status' } = args;

    const tasksData = await this.loadTasks();
    const stats = {};

    tasksData.tasks.forEach(task => {
      const key = task[groupBy] || 'unknown';
      stats[key] = (stats[key] || 0) + 1;
    });

    return {
      content: [
        {
          type: 'text',
          text: `Task statistics (grouped by ${groupBy}):\n\n${JSON.stringify(stats, null, 2)}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Task MCP server running on stdio');
  }
}

// Start the server
const server = new TaskServer();
server.run().catch(console.error);
