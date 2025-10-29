#!/usr/bin/env node

const WebSocket = require("ws");
const axios = require("axios");

const ORCHESTRATOR_URL = "http://localhost:3103";
const ORCHESTRATOR_WS_URL = "ws://localhost:4103";

class MultiAgentClient {
  constructor(sessionId = "default") {
    this.sessionId = sessionId;
    this.ws = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(ORCHESTRATOR_WS_URL);

      this.ws.on("open", () => {
        console.log("Connected to orchestrator");
        resolve();
      });

      this.ws.on("message", (data) => {
        const message = JSON.parse(data);
        this.handleMessage(message);
      });

      this.ws.on("error", reject);
    });
  }

  handleMessage(message) {
    if (message.type === "coordination_result") {
      console.log("Coordination results:", message.results);
      this.emit("coordination_complete", message.results);
    } else if (message.type === "error") {
      console.error("Orchestrator error:", message.message);
      this.emit("error", message.message);
    }
  }

  emit(event, data) {
    if (this.listeners && this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  on(event, callback) {
    if (!this.listeners) this.listeners = {};
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  async generateResponse(prompt, context = {}) {
    try {
      const response = await axios.post(`${ORCHESTRATOR_URL}/generate`, {
        prompt,
        sessionId: this.sessionId,
        context,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Generation failed: ${error.message}`);
    }
  }

  async coordinateAgents(agents, task) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Coordination timeout"));
      }, 30000);

      this.on("coordination_complete", (results) => {
        clearTimeout(timeout);
        resolve(results);
      });

      this.on("error", (error) => {
        clearTimeout(timeout);
        reject(new Error(error));
      });

      this.ws.send(
        JSON.stringify({
          type: "coordinate_agents",
          agents,
          task,
        }),
      );
    });
  }

  async getSystemStatus() {
    try {
      const response = await axios.get(`${ORCHESTRATOR_URL}/status`);
      return response.data;
    } catch (error) {
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// CLI interface
async function main() {
  const client = new MultiAgentClient();

  const command = process.argv[2];

  if (command === "generate") {
    const prompt = process.argv[3];
    if (!prompt) {
      console.log('Usage: node multi_agent_client.js generate "your prompt"');
      return;
    }

    try {
      const result = await client.generateResponse(prompt);
      console.log("Response:", result.response);
      console.log("Model:", result.model);
      console.log("LLM:", result.llm);
    } catch (error) {
      console.error("Error:", error.message);
    }
  } else if (command === "coordinate") {
    const task = process.argv[3];
    if (!task) {
      console.log(
        'Usage: node multi_agent_client.js coordinate "task description"',
      );
      return;
    }

    const agents = [
      {
        name: "researcher",
        role: "Research and gather information",
        context: "You are a research specialist",
      },
      {
        name: "analyst",
        role: "Analyze and summarize findings",
        context: "You are a data analyst",
      },
      {
        name: "writer",
        role: "Write clear, concise output",
        context: "You are a technical writer",
      },
    ];

    try {
      await client.connect();
      const results = await client.coordinateAgents(agents, task);
      console.log("Multi-agent coordination results:");
      results.forEach((result) => {
        console.log(`\n${result.agent}:`);
        if (result.response) {
          console.log(result.response);
        } else if (result.error) {
          console.log(`Error: ${result.error}`);
        }
      });
      client.disconnect();
    } catch (error) {
      console.error("Error:", error.message);
    }
  } else if (command === "status") {
    try {
      const status = await client.getSystemStatus();
      console.log("System Status:");
      Object.entries(status).forEach(([service, health]) => {
        console.log(`${service}: ${health.overall ? "HEALTHY" : "UNHEALTHY"}`);
      });
    } catch (error) {
      console.error("Error:", error.message);
    }
  } else {
    console.log("Usage:");
    console.log('  node multi_agent_client.js generate "prompt"');
    console.log('  node multi_agent_client.js coordinate "task"');
    console.log("  node multi_agent_client.js status");
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MultiAgentClient;
