#!/usr/bin/env node

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MCPProxyTester {
  constructor() {
    this.proxyProcess = null;
    this.pendingRequests = new Map();
    this.requestId = 1;
  }

  async startProxy() {
    console.log("🚀 Starting MCP proxy server...");

    this.proxyProcess = spawn("node", ["src/mcp_proxy.js"], {
      cwd: __dirname,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.proxyProcess.stdout.on("data", (data) => {
      console.log("Proxy stdout:", data.toString());
    });

    this.proxyProcess.stderr.on("data", (data) => {
      console.log("Proxy stderr:", data.toString());
    });

    // Wait a bit for the proxy to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("✅ MCP proxy started");
  }

  stopProxy() {
    if (this.proxyProcess) {
      this.proxyProcess.kill();
      console.log("🛑 MCP proxy stopped");
    }
  }

  async sendMCPRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      const request = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });

      const requestJson = JSON.stringify(request) + "\n";
      console.log("📤 Sending MCP request:", requestJson.trim());

      this.proxyProcess.stdin.write(requestJson);

      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Request timeout"));
        }
      }, 10000);
    });
  }

  async testToolsList() {
    console.log("\n🔍 Testing tools/list...");

    try {
      const response = await this.sendMCPRequest("tools/list");
      console.log("✅ Tools list response:", JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error("❌ Tools list failed:", error);
      return null;
    }
  }

  async testToolCall(toolName, args = {}) {
    console.log(`\n🔧 Testing tool call: ${toolName}`);

    try {
      const response = await this.sendMCPRequest("tools/call", {
        name: toolName,
        arguments: args,
      });
      console.log(`✅ Tool ${toolName} response:`, JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error(`❌ Tool ${toolName} failed:`, error);
      return null;
    }
  }

  async runTests() {
    console.log("🚀 Starting MCP proxy tests...\n");

    try {
      await this.startProxy();

      // Test tools listing
      await this.testToolsList();

      // Test a simple tool call
      await this.testToolCall("proxy_tools_list", {});

      console.log("\n✅ All tests completed");

    } catch (error) {
      console.error("❌ Test suite failed:", error);
    } finally {
      this.stopProxy();
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MCPProxyTester();
  tester.runTests().catch(console.error);
}

export default MCPProxyTester;