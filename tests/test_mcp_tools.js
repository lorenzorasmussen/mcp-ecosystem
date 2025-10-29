import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

class MCPToolTester {
  constructor(proxyUrl = "http://localhost:3006") {
    this.proxyUrl = proxyUrl;
    this.client = null;
    this.transport = null;
  }

  async connect() {
    this.transport = new SSEClientTransport(new URL(this.proxyUrl));
    this.client = new Client(
      {
        name: "mcp-tool-tester",
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );

    await this.client.connect(this.transport);
    console.log("✅ Connected to MCP proxy");
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      console.log("✅ Disconnected from MCP proxy");
    }
  }

  async listTools() {
    try {
      const response = await this.client.request({ method: "tools/list" });
      console.log("📋 Available tools:", response.tools.length);
      return response.tools;
    } catch (error) {
      console.error("❌ Failed to list tools:", error);
      return [];
    }
  }

  async testTool(name, args = {}) {
    try {
      console.log(`🔧 Testing tool: ${name} with args:`, args);
      const response = await this.client.request({
        method: "tools/call",
        params: { name, arguments: args },
      });
      console.log(`✅ Tool ${name} executed successfully:`, response);
      return response;
    } catch (error) {
      console.error(`❌ Tool ${name} failed:`, error);
      return null;
    }
  }

  async runComprehensiveTests() {
    console.log("🚀 Starting comprehensive MCP tool tests...\n");

    await this.connect();

    const tools = await this.listTools();

    // Group tools by server
    const serverTools = {};
    tools.forEach((tool) => {
      const serverName =
        tool.name.split("_")[0] + "_" + tool.name.split("_")[1];
      if (!serverTools[serverName]) serverTools[serverName] = [];
      serverTools[serverName].push(tool);
    });

    console.log("📊 Tools grouped by server:", Object.keys(serverTools));

    // Test each server
    for (const [server, serverTools] of Object.entries(serverTools)) {
      console.log(`\n🔍 Testing server: ${server}`);
      console.log(`   Tools: ${serverTools.map((t) => t.name).join(", ")}`);

      // Test a sample tool from each server
      if (serverTools.length > 0) {
        const testTool = serverTools[0];
        await this.testTool(testTool.name, this.getTestArgs(testTool));
      }
    }

    await this.disconnect();
  }

  getTestArgs(tool) {
    // Provide test arguments based on tool name
    const testArgs = {
      // Filesystem tools
      read_file: { path: "/tmp/test.txt" },
      list_dir: { path: "/tmp" },
      search_replace: {
        path: "/tmp/test.txt",
        old_string: "old",
        new_string: "new",
      },

      // Memory tools
      store_memory: { content: "test memory", category: "test" },
      recall_memory: { query: "test" },

      // Git tools
      git_status: {},
      git_log: { limit: 5 },

      // Web tools
      fetch_url: { url: "https://httpbin.org/get" },

      // Google Suite tools
      gmail_list_messages: { maxResults: 5 },
      docs_create_document: { title: "Test Document" },

      // Notion tools
      notion_search: { query: "test" },

      // Browser tools
      browser_navigate: { url: "https://example.com" },

      // Desktop tools
      desktop_screenshot: {},

      // Default empty args
    };

    return testArgs[tool.name] || {};
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MCPToolTester();
  tester.runComprehensiveTests().catch(console.error);
}

export default MCPToolTester;
