import express from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = 3007; // Different from proxy
const runningServers = new Map();

// Server configurations - all available MCP servers
const serverConfigs = {
  // Custom servers
  mem0: { script: "src/servers/mem0_server.js", port: 3100 },
  notion: { script: "src/servers/notion_server.js", port: 3105 },
  browsertools: { script: "src/servers/browsertools_server.js", port: 3107 },
  "google-suite": { script: "src/servers/google_suite_server.js", port: 3109 },
  task: { script: "src/servers/task_server.js", port: 3110 },
  
  // Official MCP servers - lazy loaded via npx
  "mcp-everything": { 
    script: "npx", 
    args: ["-y", "@modelcontextprotocol/server-everything"], 
    port: 3111,
    memory: "120M"
  },
  "mcp-filesystem": { 
    script: "npx", 
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"], 
    port: 3112,
    memory: "100M"
  },
  "mcp-fetch": { 
    script: "npx", 
    args: ["-y", "@modelcontextprotocol/server-fetch"], 
    port: 3113,
    memory: "130M"
  },
  "mcp-git": { 
    script: "npx", 
    args: ["-y", "@modelcontextprotocol/server-git"], 
    port: 3114,
    memory: "120M"
  },
  "mcp-github": { 
    script: "npx", 
    args: ["-y", "@modelcontextprotocol/server-github"], 
    port: 3115,
    memory: "120M"
  },
  "mcp-sqlite": { 
    script: "npx", 
    args: ["-y", "@modelcontextprotocol/server-sqlite", "~/.local/share/opencode/data/opencode.db"], 
    port: 3116,
    memory: "120M"
  },
  "mcp-sequential-thinking": { 
    script: "npx", 
    args: ["-y", "@modelcontextprotocol/server-sequential-thinking"], 
    port: 3117,
    memory: "130M"
  },
  "mcp-playwright": { 
    script: "npx", 
    args: ["-y", "@playwright/mcp-server"], 
    port: 3118,
    memory: "200M",
    env: {
      BROWSER_TYPE: "chromium",
      HEADLESS: "false",
      VIEWPORT_WIDTH: "1920",
      VIEWPORT_HEIGHT: "1080"
    }
  },
  "mcp-puppeteer": { 
    script: "npx", 
    args: ["-y", "@modelcontextprotocol/server-puppeteer"], 
    port: 3119,
    memory: "180M",
    env: {
      CACHE_PATH: `${process.env.HOME}/.cache/opencode/puppeteer`,
      HEADLESS: "true"
    }
  },
  "mcp-computer-use": { 
    script: "npx", 
    args: ["-y", "@anthropic-ai/mcp-server-computer-use"], 
    port: 3120,
    memory: "150M",
    env: {
      DISPLAY: ":0",
      ENABLE_SCREEN: "true",
      ENABLE_KEYBOARD: "true",
      ENABLE_MOUSE: "true",
      SCREENSHOT_DELAY: "100"
    }
  },
  
  // AI/LLM Servers
  "llama-cpp-server": { 
    script: "llama-server", 
    args: [
      "--host", "127.0.0.1",
      "--port", "3121",
      "--ctx-size", "4096",
      "--n-gpu-layers", "99",
      "--model", "${MODEL_PATH:-~/.local/share/llama.cpp/models/llama-3-8b-instruct.Q4_K_M.gguf}",
      "--embedding"
    ],
    port: 3121,
    memory: "512M",  // Larger for LLM inference
    env: {
      MODEL_PATH: process.env.MODEL_PATH || `${process.env.HOME}/.local/share/llama.cpp/models`
    }
  },
  "ollama-serve": { 
    script: "ollama", 
    args: ["serve"], 
    port: 3122,
    memory: "256M",
    env: {
      OLLAMA_HOST: "127.0.0.1:3122",
      OLLAMA_MODELS: `${process.env.HOME}/.ollama/models`
    }
  },
  "vllm-server": { 
    script: "npx", 
    args: ["-y", "vllm", "serve", "--model", "microsoft/DialoGPT-medium"], 
    port: 3123,
    memory: "1024M"  // VLLM needs more memory
  },
  "text-generation-webui": { 
    script: "python", 
    args: ["${TEXTGEN_PATH:-~/.local/share/text-generation-webui}/server.py", "--api", "--listen", "--port", "3124"], 
    port: 3124,
    memory: "1536M",
    env: {
      TEXTGEN_PATH: process.env.TEXTGEN_PATH || `${process.env.HOME}/.local/share/text-generation-webui`
    }
  },
  
  // AI/LLM Servers
  "llama-cpp-server": { 
    script: "llama-server", 
    args: [
      "--host", "127.0.0.1",
      "--port", "3121",
      "--ctx-size", "4096",
      "--n-gpu-layers", "99",
      "--model", "${MODEL_PATH:-~/.local/share/llama.cpp/models/llama-3-8b-instruct.Q4_K_M.gguf}",
      "--embedding"
    ],
    port: 3121,
    memory: "512M",  // Larger for LLM inference
    env: {
      MODEL_PATH: process.env.MODEL_PATH || `${process.env.HOME}/.local/share/llama.cpp/models`
    }
  },
  "ollama-serve": { 
    script: "ollama", 
    args: ["serve"], 
    port: 3122,
    memory: "256M",
    env: {
      OLLAMA_HOST: "127.0.0.1:3122",
      OLLAMA_MODELS: `${process.env.HOME}/.ollama/models`
    }
  },
  "vllm-server": { 
    script: "npx", 
    args: ["-y", "vllm", "serve", "--model", "microsoft/DialoGPT-medium"], 
    port: 3123,
    memory: "1024M"  // VLLM needs more memory
  },
  "text-generation-webui": { 
    script: "python", 
    args: ["${TEXTGEN_PATH:-~/.local/share/text-generation-webui}/server.py", "--api", "--listen", "--port", "3124"], 
    port: 3124,
    memory: "1536M",
    env: {
      TEXTGEN_PATH: process.env.TEXTGEN_PATH || `${process.env.HOME}/.local/share/text-generation-webui`
    }
  },
  
  // Language servers for Neovim & Opencode development (using stdio for minimal resource usage)
  "typescript-language-server": { 
    script: "npx", 
    args: ["-y", "typescript-language-server", "--stdio"], 
    stdio: true,
    memory: "60M"  // Reduced from 80M with stdio
  },
  "vscode-json-language-server": { 
    script: "npx", 
    args: ["-y", "vscode-langservers-extracted", "--stdio"], 
    stdio: true,
    memory: "40M"  // Reduced from 60M with stdio
  },
  "vscode-css-language-server": { 
    script: "npx", 
    args: ["-y", "vscode-langservers-extracted", "--stdio"], 
    stdio: true,
    memory: "40M"  // Reduced from 60M with stdio
  },
  "vscode-html-language-server": { 
    script: "npx", 
    args: ["-y", "vscode-langservers-extracted", "--stdio"], 
    stdio: true,
    memory: "40M"  // Reduced from 60M with stdio
  },
  "pylsp": { 
    script: "npx", 
    args: ["-y", "python-lsp-server", "--stdio"], 
    stdio: true,
    memory: "70M"  // Reduced from 100M with stdio
  },
  "pyright": { 
    script: "npx", 
    args: ["-y", "pyright", "--stdio"], 
    stdio: true,
    memory: "80M"  // Reduced from 120M with stdio
  },
  "rust-analyzer": { 
    script: "rust-analyzer", 
    args: [], 
    stdio: true,
    memory: "100M"  // Reduced from 150M with stdio
  },
  "clangd": { 
    script: "clangd", 
    args: ["--background-index"], 
    stdio: true,
    memory: "120M"  // Reduced from 180M with stdio
  },
  "gopls": { 
    script: "gopls", 
    args: ["serve"], 
    stdio: true,
    memory: "70M"  // Reduced from 100M with stdio
  },
  "lua-language-server": { 
    script: "npx", 
    args: ["-y", "lua-language-server", "--stdio"], 
    stdio: true,
    memory: "40M"  // Reduced from 60M with stdio
  },
  "vim-language-server": { 
    script: "npx", 
    args: ["-y", "vim-language-server", "--stdio"], 
    stdio: true,
    memory: "30M"  // Reduced from 50M with stdio
  },
  "bash-language-server": { 
    script: "npx", 
    args: ["-y", "bash-language-server", "start"], 
    stdio: true,
    memory: "25M"  // Reduced from 40M with stdio
  },
  "dockerfile-language-server": { 
    script: "npx", 
    args: ["-y", "dockerfile-language-server", "--stdio"], 
    stdio: true,
    memory: "30M"  // Reduced from 50M with stdio
  },
  "yaml-language-server": { 
    script: "npx", 
    args: ["-y", "yaml-language-server", "--stdio"], 
    stdio: true,
    memory: "40M"  // Reduced from 60M with stdio
  },
  "terraform-ls": { 
    script: "terraform-ls", 
    args: ["serve"], 
    stdio: true,
    memory: "50M"  // Reduced from 80M with stdio
  },
  "nil": { 
    script: "nil", 
    args: [], 
    stdio: true,
    memory: "70M"  // Reduced from 100M with stdio
  },
  
  // Additional development tools
  "eslint": { 
    script: "npx", 
    args: ["-y", "eslint"], 
    port: 3137,
    memory: "80M"
  },
  "prettier": { 
    script: "npx", 
    args: ["-y", "prettier"], 
    port: 3138,
    memory: "60M"
  },
  "stylua": { 
    script: "stylua", 
    args: [], 
    port: 3139,
    memory: "40M"
  },
  "black": { 
    script: "npx", 
    args: ["-y", "@python/black"], 
    port: 3140,
    memory: "60M"
  },
  "isort": { 
    script: "npx", 
    args: ["-y", "isort"], 
    port: 3141,
    memory: "40M"
  },
  "rustfmt": { 
    script: "rustfmt", 
    args: [], 
    port: 3142,
    memory: "50M"
  },
  "gofmt": { 
    script: "gofmt", 
    args: [], 
    port: 3143,
    memory: "40M"
  },
  
  // Opencode specific tools
  "opencode-builder": { 
    script: "src/servers/opencode_builder_server.js", 
    port: 3144,
    memory: "80M"
  },
  "opencode-linter": { 
    script: "src/servers/opencode_linter_server.js", 
    port: 3145,
    memory: "60M"
  },
  "opencode-formatter": { 
    script: "src/servers/opencode_formatter_server.js", 
    port: 3146,
    memory: "60M"
  },
  "opencode-test-runner": { 
    script: "src/servers/opencode_test_runner_server.js", 
    port: 3147,
    memory: "80M"
  },
  "opencode-debugger": { 
    script: "src/servers/opencode_debugger_server.js", 
    port: 3148,
    memory: "100M"
  },
};

async function startServer(serverName) {
  if (runningServers.has(serverName)) {
    return runningServers.get(serverName);
  }

  const config = serverConfigs[serverName];
  if (!config) {
    throw new Error(`Unknown server: ${serverName}`);
  }

  console.log(`🚀 Starting ${serverName} server...`);

  // Prepare spawn arguments
  const spawnArgs = config.args || [config.script];
  const spawnOptions = {
    cwd: __dirname,
    stdio: config.stdio ? ["pipe", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
    env: { 
      ...process.env, 
      // Only set PORT for TCP servers, not stdio
      ...(config.port && !config.stdio ? { PORT: config.port } : {}),
      ...config.env 
    },
  };

  // Add memory optimization for Node.js processes
  if (config.script !== 'npx') {
    const memoryLimit = config.memory ? config.memory.replace('M', '') : 96;
    spawnOptions.env.NODE_OPTIONS = `--max-old-space-size=${memoryLimit} --optimize-for-size --gc-interval=100`;
  }

  // For stdio servers, use IPC for better resource management
  if (config.stdio) {
    spawnOptions.stdio = ["pipe", "pipe", "pipe", "ipc"];
  }

  const child = spawn(config.script, spawnArgs, spawnOptions);

  let started = false;
  const startupPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Server ${serverName} startup timeout`));
    }, 10000);

    child.stderr.on("data", (data) => {
      const output = data.toString();
      if (output.includes("MCP server running") && !started) {
        started = true;
        clearTimeout(timeout);
        resolve(child);
      }
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  try {
    await startupPromise;
    runningServers.set(serverName, {
      process: child,
      port: config.port,
      startTime: Date.now(),
    });
    console.log(`✅ ${serverName} server started on port ${config.port}`);
    return runningServers.get(serverName);
  } catch (error) {
    console.error(`❌ Failed to start ${serverName}:`, error);
    throw error;
  }
}

function stopServer(serverName) {
  const server = runningServers.get(serverName);
  if (server) {
    server.process.kill();
    runningServers.delete(serverName);
    console.log(`🛑 Stopped ${serverName} server`);
  }
}

// Auto-stop idle servers after 30 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [name, server] of runningServers) {
      if (now - server.startTime > 30 * 60 * 1000) {
        // 30 minutes
        console.log(`⏰ Auto-stopping idle server: ${name}`);
        stopServer(name);
      }
    }
  },
  5 * 60 * 1000,
); // Check every 5 minutes

// REST API endpoints with length constraints
// Ultra-compact endpoints with strict limits
app.get("/servers", (req, res) => {
  const { limit = 10, category = "all" } = req.query;
  const servers = {};
  let count = 0;
  
  for (const [name, config] of Object.entries(serverConfigs)) {
    if (category !== "all" && !name.includes(category)) continue;
    if (count >= limit) break;
    
    servers[name] = {
      r: runningServers.has(name) ? 1 : 0,  // running: 1/0
      m: config.memory,                      // memory
      p: config.port || 0                    // port
    };
    count++;
  }
  
  res.json({ s: servers, t: count });  // s: servers, t: total
});

// Minimal endpoint - just names and status
app.get("/servers/min", (req, res) => {
  const { limit = 15 } = req.query;
  const result = [];
  let count = 0;
  
  for (const [name, config] of Object.entries(serverConfigs)) {
    if (count >= limit) break;
    result.push({
      n: name,                    // name
      r: runningServers.has(name) ? 1 : 0  // running
    });
    count++;
  }
  
  res.json(result);
});

// Just count and running status
app.get("/servers/status", (req, res) => {
  const total = Object.keys(serverConfigs).length;
  const running = runningServers.size;
  
  res.json({ t: total, r: running });  // t: total, r: running
});

// Compact endpoint for minimal data
app.get("/servers/compact", (req, res) => {
  const { limit = 50 } = req.query;
  const servers = {};
  let count = 0;
  
  for (const [name, config] of Object.entries(serverConfigs)) {
    if (count >= limit) break;
    servers[name] = {
      type: config.stdio ? "stdio" : "tcp",
      port: config.port || null,
      memory: config.memory,
      running: runningServers.has(name)
    };
    count++;
  }
  
  res.json(servers);
});

app.post("/start/:serverName", async (req, res) => {
  try {
    const { serverName } = req.params;
    const server = await startServer(serverName);
    res.json({ 
      success: true, 
      port: server.port, 
      status: "running",
      type: serverConfigs[serverName].stdio ? "stdio" : "tcp",
      memory: serverConfigs[serverName].memory
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/stop/:serverName", (req, res) => {
  const { serverName } = req.params;
  stopServer(serverName);
  res.json({ success: true, status: "stopped" });
});

app.get("/status/:serverName", (req, res) => {
  const { serverName } = req.params;
  const server = runningServers.get(serverName);
  res.json({
    running: !!server,
    port: server?.port,
    uptime: server ? Date.now() - server.startTime : null,
  });
});

app.get("/status", (req, res) => {
  const status = {};
  for (const [name, server] of runningServers) {
    status[name] = {
      running: true,
      port: server.port,
      uptime: Date.now() - server.startTime,
    };
  }
  res.json(status);
});

app.listen(PORT, () => {
  console.log(`🚀 Lazy Loader API running on port ${PORT}`);
  console.log(`📡 Available endpoints:`);
  console.log(`   POST /start/:serverName - Start a server`);
  console.log(`   POST /stop/:serverName - Stop a server`);
  console.log(`   GET /status/:serverName - Check server status`);
  console.log(`   GET /status - Get all server statuses`);
});
