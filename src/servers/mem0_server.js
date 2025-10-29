#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

class Mem0Server {
  constructor() {
    this.server = new Server(
      {
        name: 'mem0-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.mem0Url = process.env.MEM0_URL || 'http://localhost:8000';
    this.setupTools();
  }

  setupTools() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'mem0_search',
            description: 'Search memories in Mem0 database',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for memories',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  default: 10,
                },
                user_id: {
                  type: 'string',
                  description: 'User ID to filter memories',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'mem0_add',
            description: 'Add a new memory to Mem0 database',
            inputSchema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Memory content to add',
                },
                user_id: {
                  type: 'string',
                  description: 'User ID for the memory',
                },
                metadata: {
                  type: 'object',
                  description: 'Additional metadata for the memory',
                },
              },
              required: ['message'],
            },
          },
          {
            name: 'mem0_delete',
            description: 'Delete a memory from Mem0 database',
            inputSchema: {
              type: 'object',
              properties: {
                memory_id: {
                  type: 'string',
                  description: 'ID of the memory to delete',
                },
              },
              required: ['memory_id'],
            },
          },
          {
            name: 'mem0_update',
            description: 'Update an existing memory in Mem0 database',
            inputSchema: {
              type: 'object',
              properties: {
                memory_id: {
                  type: 'string',
                  description: 'ID of the memory to update',
                },
                message: {
                  type: 'string',
                  description: 'Updated memory content',
                },
              },
              required: ['memory_id', 'message'],
            },
          },
          {
            name: 'mem0_get_all',
            description: 'Get all memories for a user',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: {
                  type: 'string',
                  description: 'User ID to get memories for',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of memories to return',
                  default: 100,
                },
              },
              required: ['user_id'],
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
          case 'mem0_search':
            return await this.searchMemories(args);
          case 'mem0_add':
            return await this.addMemory(args);
          case 'mem0_delete':
            return await this.deleteMemory(args);
          case 'mem0_update':
            return await this.updateMemory(args);
          case 'mem0_get_all':
            return await this.getAllMemories(args);
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

  async searchMemories(args) {
    const { query, limit = 10, user_id } = args;

    try {
      const response = await fetch(`${this.mem0Url}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit,
          user_id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Mem0 search failed: ${response.statusText}`);
      }

      const results = await response.json();

      return {
        content: [
          {
            type: 'text',
            text: `Found ${results.length} memories:\n\n${JSON.stringify(results, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to search memories: ${error.message}`);
    }
  }

  async addMemory(args) {
    const { message, user_id, metadata } = args;

    try {
      const response = await fetch(`${this.mem0Url}/memories/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          user_id,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`Mem0 add failed: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        content: [
          {
            type: 'text',
            text: `Memory added successfully:\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to add memory: ${error.message}`);
    }
  }

  async deleteMemory(args) {
    const { memory_id } = args;

    try {
      const response = await fetch(`${this.mem0Url}/memories/${memory_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Mem0 delete failed: ${response.statusText}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Memory ${memory_id} deleted successfully`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to delete memory: ${error.message}`);
    }
  }

  async updateMemory(args) {
    const { memory_id, message } = args;

    try {
      const response = await fetch(`${this.mem0Url}/memories/${memory_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Mem0 update failed: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        content: [
          {
            type: 'text',
            text: `Memory updated successfully:\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to update memory: ${error.message}`);
    }
  }

  async getAllMemories(args) {
    const { user_id, limit = 100 } = args;

    try {
      const response = await fetch(`${this.mem0Url}/memories/?user_id=${user_id}&limit=${limit}`);

      if (!response.ok) {
        throw new Error(`Mem0 get all failed: ${response.statusText}`);
      }

      const memories = await response.json();

      return {
        content: [
          {
            type: 'text',
            text: `Retrieved ${memories.length} memories:\n\n${JSON.stringify(memories, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get memories: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Mem0 MCP server running on stdio');
  }
}

// Start the server
const server = new Mem0Server();
server.run().catch(console.error);
