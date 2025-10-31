/**
 * Health check utilities for MCP ecosystem
 */

import axios from "axios";

const SERVICES = {
  "mcp-mem0-server": "http://localhost:3100",
  "mcp-gemini-bridge": "http://localhost:3101",
  "mcp-qwen-bridge": "http://localhost:3102",
  "mcp-coordination-server": "http://localhost:3109",
};

/**
 * Check health of a single service
 */
async function checkServiceHealth(serviceName, url) {
  try {
    const response = await axios.get(`${url}/health`, { timeout: 5000 });
    return {
      name: serviceName,
      status: response.data.status === "healthy" ? "healthy" : "degraded",
      response_time: response.data.uptime || 0,
      details: response.data,
    };
  } catch (error) {
    return {
      name: serviceName,
      status: "unhealthy",
      error: error.message,
      response_time: 0,
    };
  }
}

/**
 * Perform health checks for all MCP services
 */
export async function performHealthChecks() {
  const results = {};
  const checks = Object.entries(SERVICES).map(([name, url]) =>
    checkServiceHealth(name, url),
  );

  const healthResults = await Promise.all(checks);

  healthResults.forEach((result) => {
    results[result.name] = {
      status: result.status,
      response_time: result.response_time,
      overall: result.status === "healthy",
      details: result.details || { error: result.error },
    };
  });

  // Add overall system health
  const healthyServices = Object.values(results).filter(
    (s) => s.overall,
  ).length;
  const totalServices = Object.keys(results).length;

  results.overall = {
    status:
      healthyServices === totalServices
        ? "healthy"
        : healthyServices > 0
          ? "degraded"
          : "unhealthy",
    healthy_services: healthyServices,
    total_services: totalServices,
    uptime: process.uptime(),
  };

  return results;
}
