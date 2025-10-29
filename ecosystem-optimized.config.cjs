module.exports = {
  apps: [
    // Core Infrastructure - Keep these running, optimized
    {
      name: "lazy-loader",
      script: "/Users/lorenzorasmussen/.local/share/mcp/lazy_loader.js",
      cwd: "/Users/lorenzorasmussen/.local/share/mcp",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "100M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "mcp-orchestrator",
      script: "src/orchestrator.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "production",
        PORT: 3006,
      },
    },
    {
      name: "mcp-health-monitor",
      script: "src/utils/health_check.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "80M",
      env: {
        NODE_ENV: "production",
      },
    },

    // AI Bridges - Resource optimized
    {
      name: "mcp-gemini-bridge",
      script:
        "/Users/lorenzorasmussen/.local/share/mcp/src/bridges/gemini_bridge.js",
      cwd: "/Users/lorenzorasmussen/.local/share/mcp",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "120M",
      env: {
        NODE_ENV: "production",
        PORT: 3101,
        GEMINI_CLI_PATH: "gemini",
        GEMINI_MODEL: "gemini-2.5-flash",
      },
    },
    {
      name: "mcp-qwen-bridge",
      script: "src/bridges/qwen_bridge.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "120M",
      env: {
        NODE_ENV: "production",
        PORT: 3102,
        OLLAMA_HOST: "http://localhost:11434",
        QWEN_MODEL: "qwen3-coder:7b",
      },
    },

    // Custom MCP Servers - Fixed SDK compatibility
    {
      name: "google-suite-server",
      script:
        "/Users/lorenzorasmussen/.local/share/mcp/src/servers/google_suite_server.js",
      cwd: "/Users/lorenzorasmussen/.local/share/mcp",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "100M",
      env: {
        NODE_ENV: "production",
        XDG_CONFIG_HOME:
          process.env.XDG_CONFIG_HOME || `${process.env.HOME}/.config`,
        XDG_DATA_HOME:
          process.env.XDG_DATA_HOME || `${process.env.HOME}/.local/share`,
        XDG_CACHE_HOME:
          process.env.XDG_CACHE_HOME || `${process.env.HOME}/.cache`,
        XDG_STATE_HOME:
          process.env.XDG_STATE_HOME || `${process.env.HOME}/.local/state`,
      },
    },
    {
      name: "mcp-mem0-server",
      script:
        "/Users/lorenzorasmussen/.local/share/mcp/src/servers/mem0_server.js",
      cwd: "/Users/lorenzorasmussen/.local/share/mcp",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "80M",
      env: {
        NODE_ENV: "production",
        MEM0_DIR: `${process.env.XDG_DATA_HOME || `${process.env.HOME}/.local/share`}/mem0`,
      },
    },

    // Official MCP Servers - Optimized resource usage
    // Light servers - keep in fork mode
    {
      name: "mcp-filesystem-server",
      script: "npx",
      args: "-y @modelcontextprotocol/server-filesystem",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "60M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "mcp-memory-server",
      script: "npx",
      args: "-y @modelcontextprotocol/server-memory",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "80M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "mcp-fetch-server",
      script: "npx",
      args: "-y @modelcontextprotocol/server-fetch",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "70M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "mcp-everything-server",
      script: "npx",
      args: "-y @modelcontextprotocol/server-everything",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "100M",
      env: {
        NODE_ENV: "production",
      },
    },

    // Medium resource servers - careful monitoring
    {
      name: "mcp-git-server",
      script: "npx",
      args: "-y @modelcontextprotocol/server-git",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "120M",
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "mcp-github-server",
      script: "npx",
      args: "-y @modelcontextprotocol/server-github",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "120M",
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "mcp-sqlite-server",
      script: "npx",
      args: "-y @modelcontextprotocol/server-sqlite",
      args: `${process.env.XDG_DATA_HOME || `${process.env.HOME}/.local/share`}/opencode/data/opencode.db`,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "100M",
      env: {
        NODE_ENV: "production",
      },
    },

    // Heavy resource servers - strict limits and monitoring
    {
      name: "mcp-puppeteer-server",
      script: "npx",
      args: "-y @modelcontextprotocol/server-puppeteer",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",
      restart_delay: 10000,
      env: {
        NODE_ENV: "production",
        CACHE_PATH: `${process.env.XDG_CACHE_HOME || `${process.env.HOME}/.cache`}/opencode/puppeteer`,
        HEADLESS: "true",
      },
    },
    {
      name: "mcp-playwright-server",
      script: "npx",
      args: "-y @playwright/mcp-server",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "180M",
      restart_delay: 10000,
      env: {
        NODE_ENV: "production",
        BROWSER_TYPE: "chromium",
        HEADLESS: "true",
        VIEWPORT_WIDTH: "1280",
        VIEWPORT_HEIGHT: "720",
      },
    },
    {
      name: "mcp-computer-use-server",
      script: "npx",
      args: "-y @anthropic-ai/mcp-server-computer-use",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "150M",
      restart_delay: 15000,
      env: {
        NODE_ENV: "production",
        DISPLAY: ":0",
        ENABLE_SCREEN: "false", // Disabled to save resources
        ENABLE_KEYBOARD: "true",
        ENABLE_MOUSE: "true",
        SCREENSHOT_DELAY: "500", // Increased delay
      },
    },

    // Utility servers
    {
      name: "mcp-sequential-thinking-server",
      script: "npx",
      args: "-y @modelcontextprotocol/server-sequential-thinking",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "80M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "mcp-browsertools-server",
      script:
        "/Users/lorenzorasmussen/.local/share/mcp/src/servers/browsertools_server.js",
      cwd: "/Users/lorenzorasmussen/.local/share/mcp",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "100M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "mcp-notion-server",
      script:
        "/Users/lorenzorasmussen/.local/share/mcp/src/servers/notion_server.js",
      cwd: "/Users/lorenzorasmussen/.local/share/mcp",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "90M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "mcp-webfetch-server",
      script:
        "/Users/lorenzorasmussen/.local/share/mcp/src/servers/webfetch_server.js",
      cwd: "/Users/lorenzorasmussen/.local/share/mcp",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "80M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "mcp-desktop-control-server",
      script:
        "/Users/lorenzorasmussen/.local/share/mcp/src/servers/desktop_control_server.js",
      cwd: "/Users/lorenzorasmussen/.local/share/mcp",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "100M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "mcp-shared-knowledge-server",
      script:
        "/Users/lorenzorasmussen/.local/share/mcp/src/servers/shared_knowledge_server.js",
      cwd: "/Users/lorenzorasmussen/.local/share/mcp",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "120M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "mcp-proxy",
      script:
        "/Users/lorenzorasmussen/.local/share/mcp/src/client/multi_agent_client.js",
      cwd: "/Users/lorenzorasmussen/.local/share/mcp",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "100M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
