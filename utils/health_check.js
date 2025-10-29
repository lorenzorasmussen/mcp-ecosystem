import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pm2 = require("pm2");
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVERS = [
  { name: "lazy-loader", port: 3007, endpoint: "/status" },
  { name: "mcp-gemini-bridge", port: 3101, endpoint: "/health" },
  { name: "mcp-filesystem-server" },
  { name: "mcp-memory-server" },
  { name: "mcp-fetch-server" },
  { name: "mcp-everything-server" },
  { name: "mcp-sequential-thinking-server" },
];

const LOG_FILE = path.join(__dirname, "../../logs/health_monitor.log");

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

async function checkServerHealth(server) {
  if (!server.port || !server.endpoint) {
    // For MCP servers without HTTP endpoints, health is determined by PM2 status
    return true;
  }
  try {
    const response = await axios.get(
      `http://localhost:${server.port}${server.endpoint}`,
      {
        timeout: 5000,
      },
    );
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

async function checkPM2Status() {
  return new Promise((resolve, reject) => {
    pm2.list((err, list) => {
      if (err) {
        reject(err);
        return;
      }

      const statuses = {};
      list.forEach((proc) => {
        if (SERVERS.find((s) => s.name === proc.name)) {
          statuses[proc.name] = {
            pid: proc.pid,
            status: proc.pm2_env.status,
            memory: proc.monit.memory,
            cpu: proc.monit.cpu,
            uptime: proc.pm2_env.pm_uptime,
          };
        }
      });
      resolve(statuses);
    });
  });
}

async function performHealthChecks() {
  log("Starting health checks...");

  const pm2Statuses = await checkPM2Status();
  const healthResults = {};

  for (const server of SERVERS) {
    const pm2Status = pm2Statuses[server.name];
    const serverHealth = await checkServerHealth(server);

    // For MCP servers, focus on PM2 status since they use stdio transport
    const overallHealth = pm2Status && pm2Status.status === "online" && serverHealth;
    healthResults[server.name] = {
      pm2: pm2Status,
      server: serverHealth,
      overall: overallHealth,
    };

    log(
      `${server.name}: PM2=${pm2Status ? pm2Status.status : "unknown"}, Server=${serverHealth ? "healthy" : "unhealthy"}`,
    );
  }

  return healthResults;
}

async function restartUnhealthyServices(healthResults) {
  for (const [name, health] of Object.entries(healthResults)) {
    if (!health.overall) {
      log(`Restarting unhealthy service: ${name}`);
      pm2.restart(name, (err) => {
        if (err) {
          log(`Failed to restart ${name}: ${err.message}`);
        } else {
          log(`Successfully restarted ${name}`);
        }
      });
    }
  }
}

export { performHealthChecks, checkServerHealth, checkPM2Status };
