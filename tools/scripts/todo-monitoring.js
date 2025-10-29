#!/usr/bin/env node

/**
 * Todo System Monitoring and Alerting
 *
 * This script provides comprehensive monitoring for the shared todo system,
 * including compliance tracking, performance metrics, and alerting.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import SharedTodoService from "./shared-todo-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TodoMonitoring {
  constructor() {
    this.repositoryPath = process.cwd();
    this.sharedKnowledgePath = path.join(
      this.repositoryPath,
      "data",
      "shared-knowledge",
      ".mcp-shared-knowledge",
    );
    this.todoService = new SharedTodoService(this.sharedKnowledgePath);
    this.alertsEnabled = process.env.TODO_ALERTS_ENABLED === "true";
    this.alertThreshold = parseInt(process.env.TODO_ALERT_THRESHOLD || "70");
    this.monitoringLog = path.join(
      this.repositoryPath,
      "logs",
      "todo-monitoring.log",
    );
    this.metricsFile = path.join(
      this.repositoryPath,
      "data",
      "todo-metrics.json",
    );
  }

  /**
   * Run comprehensive monitoring
   */
  async runMonitoring() {
    console.log("📊 Running Todo System Monitoring...");

    try {
      const metrics = await this.collectMetrics();
      await this.saveMetrics(metrics);
      await this.checkAlerts(metrics);
      await this.generateReport(metrics);
      await this.logMonitoringRun(metrics);

      console.log("✅ Monitoring completed successfully");
      return metrics;
    } catch (error) {
      console.error("❌ Monitoring failed:", error.message);
      await this.logError(error);
      throw error;
    }
  }

  /**
   * Collect comprehensive metrics
   */
  async collectMetrics() {
    const systemStats = await this.todoService.getSystemStats();
    const allAgents = await this.todoService.getAllAgents();

    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        totalTodos: systemStats.metadata?.totalTasks || 0,
        activeTodos: systemStats.metadata?.activeTasks || 0,
        completedTodos: systemStats.metadata?.completedTasks || 0,
        pendingTodos:
          systemStats.metadata?.totalTasks -
            systemStats.metadata?.activeTasks -
            systemStats.metadata?.completedTasks || 0,
        totalAgents: systemStats.agentCount || 0,
      },
      agents: {},
      compliance: {
        complianceRate: 0,
        agentsWithActiveTodos: 0,
        averageCompletionRate: 0,
      },
      performance: {
        averageCompletionTime: 0,
        fastestAgent: null,
        slowestAgent: null,
      },
      categories: systemStats.metadata?.categories || {},
      recentActivity: systemStats.recentActivity || [],
    };

    // Calculate agent metrics
    let totalCompletionRate = 0;
    let agentCount = 0;

    for (const [agentId, agentStats] of Object.entries(allAgents)) {
      const completionRate =
        agentStats.totalAssigned > 0
          ? Math.round(
              (agentStats.totalCompleted / agentStats.totalAssigned) * 100,
            )
          : 0;

      metrics.agents[agentId] = {
        totalCreated: agentStats.totalCreated,
        totalAssigned: agentStats.totalAssigned,
        totalCompleted: agentStats.totalCompleted,
        activeTasks: agentStats.activeTasks,
        completionRate: completionRate,
        lastActivity: agentStats.lastActivity,
        averageCompletionTime: agentStats.averageCompletionTime,
      };

      if (agentStats.activeTasks > 0) {
        metrics.compliance.agentsWithActiveTodos++;
      }

      totalCompletionRate += completionRate;
      agentCount++;
    }

    metrics.compliance.complianceRate =
      agentCount > 0 ? Math.round(totalCompletionRate / agentCount) : 0;

    return metrics;
  }

  /**
   * Save metrics to file
   */
  async saveMetrics(metrics) {
    try {
      // Ensure logs directory exists
      const logsDir = path.dirname(this.metricsFile);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      fs.writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
      console.log(`💾 Metrics saved to ${this.metricsFile}`);
    } catch (error) {
      console.error("Failed to save metrics:", error.message);
    }
  }

  /**
   * Check for alerts and send notifications
   */
  async checkAlerts(metrics) {
    const alerts = [];

    // Compliance rate alert
    if (metrics.compliance.complianceRate < this.alertThreshold) {
      alerts.push({
        type: "compliance",
        severity: "warning",
        message: `Todo compliance rate is ${metrics.compliance.complianceRate}%, below threshold of ${this.alertThreshold}%`,
        data: {
          currentRate: metrics.compliance.complianceRate,
          threshold: this.alertThreshold,
        },
      });
    }

    // No active todos alert
    if (metrics.system.activeTodos === 0 && metrics.system.totalTodos > 0) {
      alerts.push({
        type: "activity",
        severity: "info",
        message: "No active todos found - all work may be completed",
        data: {
          totalTodos: metrics.system.totalTodos,
          activeTodos: metrics.system.activeTodos,
        },
      });
    }

    // Agent inactivity alerts
    const now = new Date();
    for (const [agentId, agentStats] of Object.entries(metrics.agents)) {
      if (agentStats.lastActivity) {
        const lastActivity = new Date(agentStats.lastActivity);
        const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);

        if (hoursSinceActivity > 24) {
          alerts.push({
            type: "inactivity",
            severity: "warning",
            message: `Agent ${agentId} has been inactive for ${Math.round(hoursSinceActivity)} hours`,
            data: {
              agentId,
              hoursSinceActivity: Math.round(hoursSinceActivity),
              lastActivity: agentStats.lastActivity,
            },
          });
        }
      }
    }

    if (alerts.length > 0) {
      console.log("🚨 Alerts detected:");
      alerts.forEach((alert) => {
        const icon = alert.severity === "warning" ? "⚠️" : "ℹ️";
        console.log(`${icon} ${alert.message}`);
      });

      if (this.alertsEnabled) {
        await this.sendAlerts(alerts);
      }
    } else {
      console.log("✅ No alerts detected");
    }

    return alerts;
  }

  /**
   * Send alerts (placeholder for actual alerting system)
   */
  async sendAlerts(alerts) {
    // This could integrate with email, Slack, webhooks, etc.
    console.log("📤 Sending alerts...");

    // For now, just log to file
    const alertLog = path.join(this.repositoryPath, "logs", "todo-alerts.log");
    const logsDir = path.dirname(alertLog);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const alertEntry = {
      timestamp: new Date().toISOString(),
      alerts: alerts,
    };

    fs.appendFileSync(alertLog, JSON.stringify(alertEntry, null, 2) + "\n");
    console.log(`📝 Alerts logged to ${alertLog}`);
  }

  /**
   * Generate monitoring report
   */
  async generateReport(metrics) {
    const report = {
      title: "Todo System Monitoring Report",
      generated: new Date().toISOString(),
      summary: {
        complianceRate: `${metrics.compliance.complianceRate}%`,
        totalAgents: metrics.system.totalAgents,
        activeTodos: metrics.system.activeTodos,
        totalTodos: metrics.system.totalTodos,
      },
      alerts: await this.checkAlerts(metrics),
      recommendations: this.generateRecommendations(metrics),
    };

    const reportFile = path.join(
      this.repositoryPath,
      "reports",
      "todo-monitoring-report.json",
    );
    const reportsDir = path.dirname(reportFile);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`📄 Report generated: ${reportFile}`);

    return report;
  }

  /**
   * Generate recommendations based on metrics
   */
  generateRecommendations(metrics) {
    const recommendations = [];

    if (metrics.compliance.complianceRate < 80) {
      recommendations.push({
        priority: "high",
        action: "Enable strict todo enforcement",
        reason:
          "Low compliance rate indicates agents are not following todo workflow",
      });
    }

    if (metrics.system.activeTodos === 0) {
      recommendations.push({
        priority: "medium",
        action: "Review completed todos and create new tasks",
        reason:
          "No active work may indicate all tasks are complete or system is idle",
      });
    }

    const inactiveAgents = Object.entries(metrics.agents)
      .filter(([_, stats]) => {
        if (!stats.lastActivity) return true;
        const hours =
          (new Date() - new Date(stats.lastActivity)) / (1000 * 60 * 60);
        return hours > 48;
      })
      .map(([id, _]) => id);

    if (inactiveAgents.length > 0) {
      recommendations.push({
        priority: "medium",
        action: `Check on inactive agents: ${inactiveAgents.join(", ")}`,
        reason: "Some agents have not been active recently",
      });
    }

    return recommendations;
  }

  /**
   * Log monitoring run
   */
  async logMonitoringRun(metrics) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      complianceRate: metrics.compliance.complianceRate,
      activeTodos: metrics.system.activeTodos,
      totalTodos: metrics.system.totalTodos,
      alerts: (await this.checkAlerts(metrics)).length,
    };

    const logsDir = path.dirname(this.monitoringLog);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    fs.appendFileSync(this.monitoringLog, JSON.stringify(logEntry) + "\n");
  }

  /**
   * Log errors
   */
  async logError(error) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
    };

    const logsDir = path.dirname(this.monitoringLog);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    fs.appendFileSync(this.monitoringLog, JSON.stringify(errorEntry) + "\n");
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitoring = new TodoMonitoring();

  const command = process.argv[2];

  switch (command) {
    case "run":
      monitoring.runMonitoring().catch(console.error);
      break;

    case "metrics":
      monitoring
        .collectMetrics()
        .then((metrics) => {
          console.log(JSON.stringify(metrics, null, 2));
        })
        .catch(console.error);
      break;

    case "alerts":
      monitoring
        .collectMetrics()
        .then(async (metrics) => {
          const alerts = await monitoring.checkAlerts(metrics);
          console.log("Current Alerts:");
          alerts.forEach((alert) => {
            console.log(`- ${alert.type}: ${alert.message}`);
          });
        })
        .catch(console.error);
      break;

    default:
      console.log(`
Todo Monitoring CLI

Commands:
  run      Run full monitoring cycle
  metrics  Show current metrics
  alerts   Check for alerts

Environment variables:
  TODO_ALERTS_ENABLED=true    Enable alerting
  TODO_ALERT_THRESHOLD=70     Alert threshold for compliance
      `);
  }
}

export default TodoMonitoring;
