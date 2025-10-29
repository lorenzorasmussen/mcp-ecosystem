import { spawn } from "child_process";

console.log("🧪 Testing single MCP server...\n");

const server = { name: "mem0", script: "src/servers/mem0_server.js" };

async function testServer() {
  console.log(`🔍 Testing ${server.name} server...`);

  return new Promise((resolve) => {
    const child = spawn("node", [server.script], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: process.cwd(),
      env: { ...process.env, NODE_OPTIONS: "--trace-warnings" },
    });

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("error", (error) => {
      console.log(`  ❌ ${server.name}: Spawn error - ${error.message}`);
      resolve(false);
    });

    // Wait for startup or error
    setTimeout(() => {
      child.kill("SIGTERM");

      const success = errorOutput.includes("Mem0 MCP server running");
      console.log(
        `  ${success ? "✅" : "❌"} ${server.name}: ${success ? "Started successfully" : "Failed"}`,
      );

      if (errorOutput) {
        console.log(`    Stderr: ${errorOutput.slice(-500)}`);
      }

      resolve(success);
    }, 5000);
  });
}

testServer()
  .then((success) => {
    console.log(
      `\n🎯 Result: ${success ? "Server works!" : "Server needs fixes"}`,
    );
    process.exit(success ? 0 : 1);
  })
  .catch(console.error);
