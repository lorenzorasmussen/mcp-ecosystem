#!/usr/bin/env node

// Debug script to check MCP server methods
const { Server } = require('/Users/lorenzorasmussen/.config/.mcp/node_modules/@modelcontextprotocol/sdk/dist/cjs/server/index.js');

// Create the MCP server
const server = new Server(
  {
    name: "debug-mcp-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  }
);

console.log("Server methods:");
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(server)).filter(name => typeof server[name] === 'function'));

console.log("\nServer properties:");
console.log(Object.getOwnPropertyNames(server).filter(name => typeof server[name] !== 'function'));