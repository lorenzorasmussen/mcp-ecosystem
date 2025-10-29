module.exports = {
  apps: [
    // Core infrastructure - always running
    {
      name: "lazy-loader",
      script: "/Users/lorenzorasmussen/.local/share/mcp/lazy_loader.js",
      cwd: "/Users/lorenzorasmussen/.local/share/mcp",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "100M",
      restart_delay: 2000,
      max_restarts: 3,
      node_args: "--max-old-space-size=64 --optimize-for-size",
    },
    {
      name: "mcp-proxy",
      script: "/Users/lorenzorasmussen/.local/share/mcp/src/mcp_proxy.js",
      cwd: "/Users/lorenzorasmussen/.local/share/mcp",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "100M",
      restart_delay: 2000,
      max_restarts: 3,
      node_args: "--max-old-space-size=64 --optimize-for-size",
    },
    {
      name: "mcp-memory-server",
    {
      name: "opencode-bridge",
      script: "/Users/lorenzorasmussen/.local/share/mcp/src/bridges/opencode_bridge.js",
      cwd: "/Users/lorenzorasmussen/.local/share/mcp",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",
      restart_delay: 2000,
      max_restarts: 3,
      node_args: "--max-old-space-size=128 --optimize-for-size",
      env: {
        PORT: 3103,
        CODE_SUPERNOVA_ENDPOINT: "http://localhost:8001",
        GROK_CODE_FAST_ENDPOINT: "http://localhost:8002",
        BIG_PICKLE_ENDPOINT: "http://localhost:8003",
        GROK4_FAST_ENDPOINT: "http://localhost:8004"
      }
    },      script: "npx",
      args: "-y @modelcontextprotocol/server-memory",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "130M",
      restart_delay: 3000,
      max_restarts: 3,
      node_args: "--max-old-space-size=96 --optimize-for-size",
    },
  ],
};