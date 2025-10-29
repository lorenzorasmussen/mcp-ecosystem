// Test script to verify MCP proxy is working
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function testProxy() {
  console.log("🧪 Testing MCP proxy at http://localhost:3006...\n");

  try {
    const transport = new SSEClientTransport(new URL("http://localhost:3006"));
    const client = new Client(
      {
        name: "proxy-test-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );

    await client.connect(transport);
    console.log("✅ Connected to MCP proxy");

    // Test tools/list
    console.log("📋 Requesting tool list...");
    const toolsResponse = await client.request({ method: "tools/list" });
    console.log(`📊 Found ${toolsResponse.tools?.length || 0} tools`);

    if (toolsResponse.tools && toolsResponse.tools.length > 0) {
      console.log("🔧 Available tools:");
      toolsResponse.tools.slice(0, 5).forEach((tool) => {
        console.log(`  - ${tool.name}: ${tool.description?.slice(0, 50)}...`);
      });

      // Test a simple tool call
      const testTool = toolsResponse.tools.find(
        (t) => t.name.includes("echo") || t.name.includes("test"),
      );
      if (testTool) {
        console.log(`\n🛠️ Testing tool: ${testTool.name}`);
        const result = await client.request({
          method: "tools/call",
          params: { name: testTool.name, arguments: { message: "Hello MCP!" } },
        });
        console.log("✅ Tool call successful:", result);
      }
    }

    await client.disconnect();
    console.log("\n🎉 MCP proxy test completed successfully!");
  } catch (error) {
    console.error("❌ MCP proxy test failed:", error.message);
    process.exit(1);
  }
}

testProxy();
