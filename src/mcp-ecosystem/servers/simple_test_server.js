#!/usr/bin/env node

// Simple test MCP server to verify the setup works
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

class SimpleTestServer {
  constructor() {
    this.server = new Server(
      {
        name: "simple-test-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler("tools/list", async () => {
      return {
        tools: [
          {
            name: "test_echo",
            description: "Echo back the input message",
            inputSchema: {
              type: "object",
              properties: {
                message: { type: "string", description: "Message to echo" },
              },
              required: ["message"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler("tools/call", async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "test_echo":
          return { result: `Echo: ${args.message}` };
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Simple test MCP server running");
  }
}

const server = new SimpleTestServer();
server.run().catch(console.error);
