#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LAZY_LOADER_URL = process.env.LAZY_LOADER_URL || "http://localhost:3007";

// Server configurations for lazy loading
const SERVER_CONFIGS = {
  mem0: { script: "src/servers/mem0_server.js", port: 3100 },
  notion: { script: "src/servers/notion_server.js", port: 3105 },
  browsertools: { script: "src/servers/browsertools_server.js", port: 3107 },
  "google-suite": { script: "src/servers/google_suite_server.js", port: 3109 },
};

// Active server processes
const activeServers = new Map();

class MCPProxyServer {
  constructor() {
    this.server = new McpServer({
      name: "mcp-proxy",
      version: "1.0.0",
    });

    this.allTools = [];
    this.serverCapabilities = {};

    this.setupToolHandlers();
  }

  async startServer(serverName) {
    if (activeServers.has(serverName)) {
      return activeServers.get(serverName);
    }

    console.error(`🚀 Starting ${serverName} server via lazy loader...`);

    try {
      const response = await axios.post(`${LAZY_LOADER_URL}/start/${serverName}`);
      if (response.data.success) {
        activeServers.set(serverName, {
          port: response.data.port,
          startTime: Date.now(),
        });
        console.error(`✅ ${serverName} server started on port ${response.data.port}`);
        return activeServers.get(serverName);
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error(`❌ Failed to start ${serverName}:`, error.message);
      throw error;
    }
  }

  async stopServer(serverName) {
    try {
      await axios.post(`${LAZY_LOADER_URL}/stop/${serverName}`);
      activeServers.delete(serverName);
      console.error(`🛑 Stopped ${serverName} server`);
    } catch (error) {
      console.error(`❌ Failed to stop ${serverName}:`, error.message);
    }
  }

  async discoverTools() {
    // For now, return a static list of known tools
    // In a full implementation, this would query each server
    this.allTools = [
      // Mem0 tools
      {
        name: "mem0_store_memory",
        description: "Store a memory item for a session",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: { type: "string", description: "Session identifier" },
            content: { type: "string", description: "Memory content to store" },
            category: { type: "string", description: "Memory category" },
          },
          required: ["sessionId", "content"],
        },
      },
      {
        name: "mem0_recall_memory",
        description: "Recall memories for a session",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: { type: "string", description: "Session identifier" },
            category: { type: "string", description: "Filter by category" },
            limit: { type: "number", description: "Maximum number of memories to return", default: 10 },
          },
          required: ["sessionId"],
        },
      },
      {
        name: "mem0_search_memory",
        description: "Search memories across all sessions",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            category: { type: "string", description: "Filter by category" },
            limit: { type: "number", description: "Maximum results", default: 20 },
          },
          required: ["query"],
        },
      },
      // Filesystem tools (from npx server)
      {
        name: "read_file",
        description: "Read contents of a file",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to the file" },
          },
          required: ["path"],
        },
      },
      {
        name: "list_dir",
        description: "List contents of a directory",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to the directory" },
          },
          required: ["path"],
        },
      },
      // Git tools
      {
        name: "git_status",
        description: "Get git repository status",
        inputSchema: {
          type: "object",
          properties: {
            repoPath: { type: "string", description: "Path to git repository" },
          },
        },
      },
      // Web tools
      {
        name: "fetch_url",
        description: "Fetch content from a URL",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "URL to fetch" },
          },
          required: ["url"],
        },
      },
    ];
  }

  setupToolHandlers() {
    // Register some basic tools that the proxy can handle
    this.server.registerTool("proxy_list_servers", {
      description: "List all available MCP servers and their status",
      inputSchema: {},
    }, async () => {
      const servers = Object.keys(SERVER_CONFIGS);
      return {
        content: [
          {
            type: "text",
            text: `Available servers: ${servers.join(", ")}`,
          },
        ],
      };
    });

    this.server.registerTool("proxy_start_server", {
      description: "Start a specific MCP server",
      inputSchema: {
        serverName: { type: "string", description: "Name of the server to start" },
      },
    }, async ({ serverName }) => {
      try {
        await this.startServer(serverName);
        return {
          content: [
            {
              type: "text",
              text: `Server ${serverName} started successfully`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to start server ${serverName}: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async routeToolCall(toolName, args) {
    try {
      // Determine which server handles this tool
      const serverName = this.getServerForTool(toolName);

      if (!serverName) {
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${toolName}`,
            },
          ],
          isError: true,
        };
      }

      // Start the server if needed
      await this.startServer(serverName);

      // For now, return a placeholder response
      // In a full implementation, this would communicate with the actual MCP server
      return {
        content: [
          {
            type: "text",
            text: `Tool ${toolName} executed successfully on ${serverName} server`,
          },
        ],
      };
    } catch (error) {
      console.error(`Error routing tool call ${toolName}:`, error);
      return {
        content: [
          {
            type: "text",
            text: `Error executing tool ${toolName}: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  getServerForTool(toolName) {
    // Route tools to servers based on naming convention
    if (toolName.startsWith("mem0_")) {
      return "mem0";
    }
    if (toolName.startsWith("read_file") || toolName.startsWith("list_dir") || toolName.startsWith("search_replace")) {
      return "filesystem"; // This would be the npx server
    }
    if (toolName.startsWith("git_")) {
      return "git"; // npx server
    }
    if (toolName.startsWith("fetch_")) {
      return "fetch"; // npx server
    }
    if (toolName.startsWith("notion_")) {
      return "notion";
    }
    if (toolName.startsWith("gmail_") || toolName.startsWith("docs_") || toolName.startsWith("sheets_")) {
      return "google-suite";
    }
    if (toolName.includes("browser")) {
      return "browsertools";
    }

    return null;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MCP Proxy server running");
  }
}

const proxy = new MCPProxyServer();
proxy.run().catch(console.error);