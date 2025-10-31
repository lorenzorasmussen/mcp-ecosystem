#!/usr/bin/env node

/**
 * OpenCode Server Manager
 *
 * Helps manage multiple OpenCode headless servers with:
 * - Dynamic port detection
 * - Directory mapping
 * - Custom server launch
 * - API testing
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

class OpenCodeServerManager {
  constructor() {
    this.servers = new Map();
    this.basePort = 55500;
  }

  /**
   * Find all running OpenCode servers
   */
  async findRunningServers() {
    return new Promise((resolve, reject) => {
      exec('ps aux | grep "opencode serve" | grep -v grep', (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        const lines = stdout
          .trim()
          .split('\n')
          .filter((line) => line.trim());
        const servers = [];

        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[1];
          const command = parts.slice(10).join(' ');

          // Find port for this PID
          exec(`lsof -p ${pid} | grep LISTEN`, (portError, portStdout) => {
            if (!portError && portStdout.trim()) {
              const portMatch = portStdout.match(/:(\d+)/);
              const port = portMatch ? portMatch[1] : null;

              if (port) {
                servers.push({
                  pid,
                  port,
                  command,
                  status: 'running',
                });
              }
            }
          });
        }

        // Wait a bit for port lookups
        setTimeout(() => resolve(servers), 500);
      });
    });
  }

  /**
   * Test API connectivity for a server
   */
  async testServerAPI(port, directory = process.cwd()) {
    return new Promise((resolve) => {
      const options = {
        hostname: '127.0.0.1',
        port: port,
        path: '/doc',
        method: 'GET',
        timeout: 3000,
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const api = JSON.parse(data);
            resolve({
              port,
              status: 'online',
              api: api.info || {},
              directory,
            });
          } catch (e) {
            resolve({
              port,
              status: 'error',
              error: 'Invalid JSON response',
            });
          }
        });
      });

      req.on('error', () => {
        resolve({
          port,
          status: 'offline',
          error: 'Connection failed',
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          port,
          status: 'timeout',
          error: 'Request timeout',
        });
      });

      req.end();
    });
  }

  /**
   * Get project info from OpenCode server
   */
  async getProjectInfo(port, directory) {
    return new Promise((resolve) => {
      const url = `http://127.0.0.1:${port}/project/current?directory=${encodeURIComponent(directory)}`;

      http
        .get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const project = JSON.parse(data);
              resolve(project);
            } catch (e) {
              resolve(null);
            }
          });
        })
        .on('error', () => {
          resolve(null);
        });
    });
  }

  /**
   * Get sessions from OpenCode server
   */
  async getSessions(port, directory) {
    return new Promise((resolve) => {
      const url = `http://127.0.0.1:${port}/session?directory=${encodeURIComponent(directory)}`;

      http
        .get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const sessions = JSON.parse(data);
              resolve(sessions);
            } catch (e) {
              resolve([]);
            }
          });
        })
        .on('error', () => {
          resolve([]);
        });
    });
  }

  /**
   * Launch new OpenCode server
   */
  async launchServer(options = {}) {
    const {
      port = this.basePort,
      directory = process.cwd(),
      hostname = '127.0.0.1',
      logLevel = 'INFO',
      printLogs = false,
    } = options;

    // Check if port is available
    const isPortAvailable = await this.checkPortAvailable(port);
    if (!isPortAvailable) {
      throw new Error(`Port ${port} is already in use`);
    }

    // Validate directory
    if (!fs.existsSync(directory)) {
      throw new Error(`Directory does not exist: ${directory}`);
    }

    // Build command
    const args = ['serve', '-p', port.toString(), '-h', hostname, '--log-level', logLevel];

    if (printLogs) {
      args.push('--print-logs');
    }

    console.log(`🚀 Starting OpenCode server...`);
    console.log(`   Port: ${port}`);
    console.log(`   Directory: ${directory}`);
    console.log(`   Hostname: ${hostname}`);
    console.log(`   Log Level: ${logLevel}`);

    // Launch server
    const server = spawn('opencode', args, {
      cwd: directory,
      stdio: printLogs ? 'inherit' : 'pipe',
    });

    server.on('error', (error) => {
      console.error(`❌ Failed to start server: ${error.message}`);
    });

    server.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
    });

    // Wait for server to be ready
    await this.waitForServer(port);

    const serverInfo = {
      pid: server.pid,
      port,
      directory,
      hostname,
      logLevel,
      startTime: new Date().toISOString(),
    };

    this.servers.set(port, serverInfo);
    return serverInfo;
  }

  /**
   * Check if port is available
   */
  async checkPortAvailable(port) {
    return new Promise((resolve) => {
      const server = http.createServer();

      server.listen(port, () => {
        server.close(() => resolve(true));
      });

      server.on('error', () => resolve(false));
    });
  }

  /**
   * Wait for server to be ready
   */
  async waitForServer(port, timeout = 10000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        await this.testServerAPI(port);
        return true;
      } catch (e) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    throw new Error(`Server on port ${port} did not become ready within ${timeout}ms`);
  }

  /**
   * List all servers with their details
   */
  async listServers() {
    const runningServers = await this.findRunningServers();
    const serverDetails = [];

    for (const server of runningServers) {
      const apiTest = await this.testServerAPI(server.port);
      const projectInfo =
        apiTest.status === 'online' ? await this.getProjectInfo(server.port, process.cwd()) : null;
      const sessions =
        apiTest.status === 'online' ? await this.getSessions(server.port, process.cwd()) : [];

      serverDetails.push({
        ...server,
        ...apiTest,
        project: projectInfo,
        sessionCount: sessions.length,
        sessions: sessions.slice(0, 5).map((s) => ({
          id: s.id,
          title: s.title,
          created: s.created,
        })),
      });
    }

    return serverDetails;
  }

  /**
   * Generate server report
   */
  async generateReport() {
    const servers = await this.listServers();

    console.log('\n📊 OpenCode Server Report');
    console.log('='.repeat(50));

    if (servers.length === 0) {
      console.log('❌ No running OpenCode servers found');
      return;
    }

    for (const server of servers) {
      console.log(`\n🔌 Server on Port ${server.port}`);
      console.log(`   PID: ${server.pid}`);
      console.log(`   Status: ${server.status}`);
      console.log(`   API: ${server.api?.title || 'Unknown'} v${server.api?.version || 'Unknown'}`);

      if (server.project) {
        console.log(`   Project: ${server.project.worktree}`);
        console.log(`   Project ID: ${server.project.id}`);
      }

      console.log(`   Sessions: ${server.sessionCount}`);

      if (server.sessions.length > 0) {
        console.log('   Recent Sessions:');
        server.sessions.forEach((session) => {
          console.log(`     - ${session.id}: ${session.title}`);
        });
      }

      if (server.status !== 'online') {
        console.log(`   ⚠️  Error: ${server.error}`);
      }
    }

    console.log('\n🎯 Quick Commands:');
    console.log(`   Test API: curl -s "http://127.0.0.1:${servers[0]?.port}/doc" | jq .`);
    console.log(
      `   List Sessions: curl -s "http://127.0.0.1:${servers[0]?.port}/session?directory=\$(pwd)" | jq length`
    );
    console.log(
      `   MCP Status: curl -s "http://127.0.0.1:${servers[0]?.port}/mcp?directory=\$(pwd)" | jq .`
    );
  }

  /**
   * Create management script
   */
  createManagementScript() {
    const script = `#!/bin/bash
# OpenCode Server Management Script

PROJECT_DIR="/Users/lorenzorasmussen/.local/share/mcp"
OPENCODE_PORT=55500

start_server() {
    echo "🚀 Starting OpenCode server on port $OPENCODE_PORT..."
    cd "$PROJECT_DIR"
    opencode serve -p $OPENCODE_PORT --print-logs --log-level INFO &
    sleep 3
    
    if curl -s "http://127.0.0.1:$OPENCODE_PORT/doc" > /dev/null; then
        echo "✅ OpenCode API ready on port $OPENCODE_PORT"
    else
        echo "❌ Failed to start OpenCode API"
    fi
}

test_mcp() {
    echo "🔌 Testing MCP integration..."
    
    echo "📁 Project Info:"
    curl -s "http://127.0.0.1:$OPENCODE_PORT/project/current?directory=$PROJECT_DIR" | jq .
    
    echo "🔌 MCP Status:"
    curl -s "http://127.0.0.1:$OPENCODE_PORT/mcp?directory=$PROJECT_DIR" | jq .
    
    echo "💬 Active Sessions:"
    curl -s "http://127.0.0.1:$OPENCODE_PORT/session?directory=$PROJECT_DIR" | jq 'length'
}

list_servers() {
    echo "🔍 Finding OpenCode servers..."
    node scripts/opencode-server-manager.js list
}

case "\$1" in
    start)
        start_server
        ;;
    test)
        test_mcp
        ;;
    list)
        list_servers
        ;;
    *)
        echo "Usage: \$0 {start|test|list}"
        exit 1
        ;;
esac
`;

    fs.writeFileSync(path.join(__dirname, 'opencode-manager.sh'), script);
    fs.chmodSync(path.join(__dirname, 'opencode-manager.sh'), '755');

    console.log('📝 Created management script: scripts/opencode-manager.sh');
  }
}

// CLI Interface
async function main() {
  const manager = new OpenCodeServerManager();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'list':
        await manager.generateReport();
        break;

      case 'start':
        const port = parseInt(process.argv[3]) || manager.basePort;
        const directory = process.argv[4] || process.cwd();
        await manager.launchServer({ port, directory, printLogs: true });
        console.log(`✅ Server started on port ${port}`);
        break;

      case 'test':
        const testPort = process.argv[3] || 55467;
        const testDir = process.argv[4] || process.cwd();
        const result = await manager.testServerAPI(testPort, testDir);
        console.log('🧪 API Test Result:', JSON.stringify(result, null, 2));
        break;

      case 'create-script':
        manager.createManagementScript();
        break;

      default:
        console.log('OpenCode Server Manager');
        console.log('');
        console.log('Commands:');
        console.log('  list                    - List all running servers');
        console.log('  start [port] [dir]      - Start new server');
        console.log('  test [port] [dir]       - Test API connectivity');
        console.log('  create-script           - Create management script');
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/opencode-server-manager.js list');
        console.log('  node scripts/opencode-server-manager.js start 55500 /path/to/project');
        console.log(
          '  node scripts/opencode-server-manager.js test 55467 /Users/lorenzorasmussen/.local/share/mcp'
        );
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = OpenCodeServerManager;
