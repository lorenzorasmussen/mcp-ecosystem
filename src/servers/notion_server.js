#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Client } from '@notionhq/client';

class NotionServer {
  constructor() {
    this.server = new Server(
      {
        name: 'notion-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize Notion client
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error('NOTION_API_KEY environment variable is required');
    }

    this.notion = new Client({ auth: apiKey });
    this.setupTools();
  }

  setupTools() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'notion_search_pages',
            description: 'Search pages in Notion database',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query',
                },
                filter: {
                  type: 'object',
                  description: 'Filter properties for search',
                },
                page_size: {
                  type: 'number',
                  description: 'Number of results to return',
                  default: 10,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'notion_get_page',
            description: 'Get a specific page from Notion',
            inputSchema: {
              type: 'object',
              properties: {
                page_id: {
                  type: 'string',
                  description: 'Notion page ID',
                },
              },
              required: ['page_id'],
            },
          },
          {
            name: 'notion_create_page',
            description: 'Create a new page in Notion',
            inputSchema: {
              type: 'object',
              properties: {
                parent: {
                  type: 'object',
                  description: 'Parent database or page',
                  properties: {
                    database_id: { type: 'string' },
                    page_id: { type: 'string' },
                    type: { type: 'string', enum: ['database_id', 'page_id'] },
                  },
                },
                properties: {
                  type: 'object',
                  description: 'Page properties',
                },
                children: {
                  type: 'array',
                  description: 'Page content blocks',
                  items: { type: 'object' },
                },
              },
              required: ['parent', 'properties'],
            },
          },
          {
            name: 'notion_update_page',
            description: 'Update an existing page in Notion',
            inputSchema: {
              type: 'object',
              properties: {
                page_id: {
                  type: 'string',
                  description: 'Notion page ID',
                },
                properties: {
                  type: 'object',
                  description: 'Page properties to update',
                },
                archived: {
                  type: 'boolean',
                  description: 'Whether to archive the page',
                },
              },
              required: ['page_id'],
            },
          },
          {
            name: 'notion_query_database',
            description: 'Query a Notion database',
            inputSchema: {
              type: 'object',
              properties: {
                database_id: {
                  type: 'string',
                  description: 'Notion database ID',
                },
                filter: {
                  type: 'object',
                  description: 'Database filter',
                },
                sorts: {
                  type: 'array',
                  description: 'Sort configuration',
                  items: { type: 'object' },
                },
                page_size: {
                  type: 'number',
                  description: 'Number of results to return',
                  default: 10,
                },
              },
              required: ['database_id'],
            },
          },
          {
            name: 'notion_get_database',
            description: 'Get database information from Notion',
            inputSchema: {
              type: 'object',
              properties: {
                database_id: {
                  type: 'string',
                  description: 'Notion database ID',
                },
              },
              required: ['database_id'],
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
          case 'notion_search_pages':
            return await this.searchPages(args);
          case 'notion_get_page':
            return await this.getPage(args);
          case 'notion_create_page':
            return await this.createPage(args);
          case 'notion_update_page':
            return await this.updatePage(args);
          case 'notion_query_database':
            return await this.queryDatabase(args);
          case 'notion_get_database':
            return await this.getDatabase(args);
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

  async searchPages(args) {
    const { query, filter, page_size = 10 } = args;

    try {
      const response = await this.notion.search({
        query,
        filter,
        page_size,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Found ${response.results.length} pages:\n\n${JSON.stringify(response.results, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to search pages: ${error.message}`);
    }
  }

  async getPage(args) {
    const { page_id } = args;

    try {
      const page = await this.notion.pages.retrieve({ page_id });

      return {
        content: [
          {
            type: 'text',
            text: `Page retrieved:\n\n${JSON.stringify(page, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get page: ${error.message}`);
    }
  }

  async createPage(args) {
    const { parent, properties, children } = args;

    try {
      const pageData = { parent, properties };
      if (children) {
        pageData.children = children;
      }

      const page = await this.notion.pages.create(pageData);

      return {
        content: [
          {
            type: 'text',
            text: `Page created successfully:\n\n${JSON.stringify(page, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to create page: ${error.message}`);
    }
  }

  async updatePage(args) {
    const { page_id, properties, archived } = args;

    try {
      const updateData = { page_id };
      if (properties) {
        updateData.properties = properties;
      }
      if (archived !== undefined) {
        updateData.archived = archived;
      }

      const page = await this.notion.pages.update(updateData);

      return {
        content: [
          {
            type: 'text',
            text: `Page updated successfully:\n\n${JSON.stringify(page, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to update page: ${error.message}`);
    }
  }

  async queryDatabase(args) {
    const { database_id, filter, sorts, page_size = 10 } = args;

    try {
      const queryData = { database_id, page_size };
      if (filter) {
        queryData.filter = filter;
      }
      if (sorts) {
        queryData.sorts = sorts;
      }

      const response = await this.notion.databases.query(queryData);

      return {
        content: [
          {
            type: 'text',
            text: `Database query returned ${response.results.length} results:\n\n${JSON.stringify(response, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to query database: ${error.message}`);
    }
  }

  async getDatabase(args) {
    const { database_id } = args;

    try {
      const database = await this.notion.databases.retrieve({ database_id });

      return {
        content: [
          {
            type: 'text',
            text: `Database retrieved:\n\n${JSON.stringify(database, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get database: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Notion MCP server running on stdio');
  }
}

// Start the server
const server = new NotionServer();
server.run().catch(console.error);
