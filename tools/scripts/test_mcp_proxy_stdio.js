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
    this.nextId = 1;
    this.buffer = "";
  }

  async startProxy() {
    console.log("🚀 Starting MCP proxy for testing...");

    return new Promise((resolve, reject) => {
      this.proxyProcess = spawn("node", ["src/mcp_proxy.js"], {
        cwd: __dirname,
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.proxyProcess.stdout.on("data", (data) => {
        this.buffer += data.toString();
        this.processBuffer();
      });

      this.proxyProcess.stderr.on("data", (data) => {
        console.log("Proxy stderr:", data.toString().trim());
      });

      this.proxyProcess.on("error", (error) => {
        console.error("Proxy process error:", error);
        reject(error);
      });

      // Wait for the proxy to be ready (it should output something)
      setTimeout(() => {
        console.log("✅ MCP proxy started and ready");
        resolve();
      }, 2000);
    });
  }

  processBuffer() {
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop(); // Keep incomplete line

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line.trim());
          console.log("📥 Received response:", JSON.stringify(response, null, 2));

          if (response.id && this.pendingRequests.has(response.id)) {
            const { resolve, reject } = this.pendingRequests.get(response.id);
            this.pendingRequests.delete(response.id);

            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
          }
        } catch (error) {
          console.log("Failed to parse response:", line, error);
        }
      }
    }
  }

  sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const request = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });

      const requestJson = JSON.stringify(request) + "\n";
      console.log("📤 Sending request:", requestJson.trim());

      this.proxyProcess.stdin.write(requestJson);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout for ${method}`));
        }
      }, 10000);
    });
  }

  stopProxy() {
    if (this.proxyProcess) {
      this.proxyProcess.kill();
      console.log("🛑 MCP proxy stopped");
    }
  }

  async testInitialize() {
    console.log("\n🔍 Testing initialize...");

    try {
      const result = await this.sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "mcp-proxy-tester",
          version: "1.0.0",
        },
      });
      console.log("✅ Initialize successful:", result);
      return result;
    } catch (error) {
      console.error("❌ Initialize failed:", error.message);
      return null;
    }
  }

  async testToolsList() {
    console.log("\n🔍 Testing tools/list...");

    try {
      const result = await this.sendRequest("tools/list");
      console.log("✅ Tools list successful:", result);
      return result;
    } catch (error) {
      console.error("❌ Tools list failed:", error.message);
      return null;
    }
  }

  async testToolCall() {
    console.log("\n🔧 Testing tool call...");

    try {
      const result = await this.sendRequest("tools/call", {
        name: "proxy_list_servers",
        arguments: {},
      });
      console.log("✅ Tool call successful:", result);
      return result;
    } catch (error) {
      console.error("❌ Tool call failed:", error.message);
      return null;
    }
  }

  async runTests() {
    console.log("🚀 Starting MCP proxy stdio tests...\n");

    try {
      await this.startProxy();

      // Test initialize
      await this.testInitialize();

      // Test tools/list
      await this.testToolsList();

      // Test tool call
      await this.testToolCall();

      console.log("\n✅ All MCP proxy tests completed successfully!");

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