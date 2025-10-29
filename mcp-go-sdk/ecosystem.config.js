module.exports = {
  apps: [{
    name: 'mcp-server',
    script: '/Users/lorenzorasmussen/mcp-go-sdk/bin/mcp-server',
    cwd: '/Users/lorenzorasmussen/mcp-go-sdk',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    env: {
      NODE_ENV: 'development',
      MCP_SERVER_PORT: 8080
    },
    env_production: {
      NODE_ENV: 'production',
      MCP_SERVER_PORT: 8080
    },
    log_file: '/Users/lorenzorasmussen/mcp-go-sdk/logs/mcp-server.log',
    out_file: '/Users/lorenzorasmussen/mcp-go-sdk/logs/mcp-server-out.log',
    error_file: '/Users/lorenzorasmussen/mcp-go-sdk/logs/mcp-server-error.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    pid_file: '/Users/lorenzorasmussen/mcp-go-sdk/mcp-server.pid'
  }]
};