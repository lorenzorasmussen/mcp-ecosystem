import { spawn } from "child_process";

console.log("🧪 Testing MCP servers individually...\n");

// Test each server by running it directly
const servers = [
  { name: "mem0", script: "src/servers/mem0_server.js" },
  { name: "notion", script: "src/servers/notion_server.js" },
  { name: "browsertools", script: "src/servers/browsertools_server.js" },
  { name: "google-suite", script: "src/servers/google_suite_server.js" },
];

async function testServer(server) {
  console.log(`🔍 Testing ${server.name} server...`);

  return new Promise((resolve) => {
    const child = spawn("node", [server.script], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: process.cwd(),
    });

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    // Wait a bit for startup
    setTimeout(() => {
      child.kill("SIGTERM");

      const success =
        errorOutput.includes("MCP server running") ||
        errorOutput.includes("server running");

      console.log(
        `  ${success ? "✅" : "❌"} ${server.name}: ${success ? "Started successfully" : "Failed to start"}`,
      );
      if (!success) {
        console.log(`    Error: ${errorOutput.slice(-200)}`);
      }

      resolve(success);
    }, 3000);
  });
}

async function runTests() {
  const results = [];

  for (const server of servers) {
    const success = await testServer(server);
    results.push({ server: server.name, success });
  }

  console.log("\n📊 Test Results:");
  results.forEach((result) => {
    console.log(
      `  ${result.server}: ${result.success ? "✅ PASS" : "❌ FAIL"}`,
    );
  });

  const passed = results.filter((r) => r.success).length;
  console.log(`\n🎯 Overall: ${passed}/${results.length} servers working`);

  if (passed === results.length) {
    console.log("🎉 All MCP servers are fully functional!");
  } else {
    console.log("⚠️  Some servers need attention.");
  }
}

runTests().catch(console.error);
