#!/usr/bin/env node

import express from "express";
import axios from "axios";
import WebSocket from "ws";
import { performHealthChecks } from "./utils/health_check.js";

const app = express();
const PORT = process.env.PORT || 3103;

const BRIDGES = [
  { name: "gemini", url: "http://localhost:3101", wsPort: 4101 },
  // Qwen disabled
  // { name: "qwen", url: "http://localhost:3102", wsPort: 4102 },
];

const MEM0_URL = process.env.MEM0_URL || "http://localhost:3100";
const FILESYSTEM_URL = process.env.FILESYSTEM_URL || "http://localhost:3104";
const NOTION_URL = process.env.NOTION_URL || "http://localhost:3105";
const WEBFETCH_URL = process.env.WEBFETCH_URL || "http://localhost:3106";
const BROWSERTOOLS_URL =
  process.env.BROWSERTOOLS_URL || "http://localhost:3107";
const DESKTOP_CONTROL_URL =
  process.env.DESKTOP_CONTROL_URL || "http://localhost:3108";

const TOOL_SERVERS = {
  filesystem: FILESYSTEM_URL,
  notion: NOTION_URL,
  webfetch: WEBFETCH_URL,
  browsertools: BROWSERTOOLS_URL,
  "desktop-control": DESKTOP_CONTROL_URL,
  memory: MEM0_URL,
};

app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "orchestrator" });
});

// Get current health status of all services
app.get("/status", async (req, res) => {
  try {
    const health = await performHealthChecks();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List available proxy tools
app.get("/tools", (req, res) => {
  res.json({
    tools: Object.keys(TOOL_SERVERS),
  });
});

// Proxy tool calls to appropriate servers
app.post("/tool/:toolName", async (req, res) => {
  const { toolName } = req.params;
  const serverUrl = TOOL_SERVERS[toolName];

  if (!serverUrl) {
    return res.status(404).json({ error: `Tool '${toolName}' not found` });
  }

  try {
    const response = await axios.post(
      `${serverUrl}/api/${req.body.method || "query"}`,
      req.body,
    );
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data,
    });
  }
});

// Intelligent LLM selection based on availability and load
async function selectLLM() {
  const health = await performHealthChecks();

  // Prefer Gemini if available
  if (health["mcp-gemini-bridge"]?.overall) {
    return "gemini";
  }

  // Fallback to Qwen
  if (health["mcp-qwen-bridge"]?.overall) {
    return "qwen";
  }

  throw new Error("No LLM bridges available");
}

// Generate response with orchestration
app.post("/generate", async (req, res) => {
  const { prompt, sessionId, context } = req.body;

  try {
    const selectedLLM = await selectLLM();
    const bridge = BRIDGES.find((b) => b.name === selectedLLM);

    // Get memory context
    let memoryContext = "";
    try {
      const memoryRes = await axios.get(`${MEM0_URL}/memory/${sessionId}`);
      memoryContext = memoryRes.data.memories.join("\n");
    } catch (error) {
      console.warn("Failed to retrieve memory:", error.message);
    }

    // Generate response
    const fullPrompt = memoryContext ? `${memoryContext}\n\n${prompt}` : prompt;
    const response = await axios.post(`${bridge.url}/generate`, {
      prompt: fullPrompt,
      context,
    });

    // Store new memory
    try {
      const newMemory = `User: ${prompt}\nAssistant: ${response.data.response}`;
      await axios.post(`${MEM0_URL}/memory/${sessionId}`, {
        memories: [newMemory],
      });
    } catch (error) {
      console.warn("Failed to store memory:", error.message);
    }

    res.json({
      response: response.data.response,
      model: response.data.model,
      llm: selectedLLM,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SSE for real-time coordination
app.get("/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  console.log("Orchestrator SSE client connected");

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Handle incoming messages via query params or body (simplified)
  req.on("data", async (chunk) => {
    try {
      const data = JSON.parse(chunk.toString());

      if (data.type === "coordinate_agents") {
        // Handle multi-agent coordination
        const { agents, task } = data;

        // For now, simple coordination - can be expanded
        const results = [];

        for (const agent of agents) {
          try {
            const selectedLLM = await selectLLM();
            const bridge = BRIDGES.find((b) => b.name === selectedLLM);

            const response = await axios.post(`${bridge.url}/generate`, {
              prompt: `${agent.role}: ${task}`,
              context: agent.context,
            });

            results.push({
              agent: agent.name,
              response: response.data.response,
              llm: selectedLLM,
            });
          } catch (error) {
            results.push({
              agent: agent.name,
              error: error.message,
            });
          }
        }

        sendEvent({
          type: "coordination_result",
          results,
        });
      }
    } catch (error) {
      sendEvent({ type: "error", message: error.message });
    }
  });

  req.on("close", () => {
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`MCP Orchestrator running on port ${PORT}`);
  console.log(`SSE endpoint available at /events`);
});
