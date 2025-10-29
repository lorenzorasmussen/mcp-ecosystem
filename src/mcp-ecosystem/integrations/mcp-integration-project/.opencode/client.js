import * as fs from "fs";
import * as path from "path";
import WebSocket from "ws";
import axios from "axios";
const globalConfigPath = path.join(process.env.HOME || "", ".config", "opencode", "config.json");
const globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, "utf8"));
// Function to connect to Mem0 via HTTP
async function connectToMem0(port) {
    try {
        const response = await axios.get(`http://localhost:${port}/status`);
        console.log("Connected to Mem0:", response.data);
    }
    catch (error) {
        console.error("Failed to connect to Mem0:", error);
    }
}
// Function to connect to SuperAssistant via WebSocket
function connectToSuperAssistant(port, name) {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.on("open", () => {
        console.log(`Connected to mcp-superassistant ${name} via WebSocket`);
    });
    ws.on("message", (data) => {
        console.log(`Received from ${name}:`, data.toString());
        // Handle coordination messages
    });
    ws.on("error", (error) => {
        console.error(`WebSocket error for ${name}:`, error);
    });
    ws.on("close", () => {
        console.log(`Disconnected from ${name}`);
    });
}
// Main function to initialize connections
async function initializeClient() {
    // Connect to Mem0
    const mem0Config = globalConfig.mcpServers.mem0;
    if (mem0Config.connection.type === "http") {
        await connectToMem0(mem0Config.connection.port);
    }
    // Connect to mcp-superassistant servers
    const saConfig = globalConfig.mcpServers["mcp-superassistant"];
    for (const server of saConfig.servers) {
        if (server.connection.type === "websocket") {
            connectToSuperAssistant(server.connection.port, server.name);
        }
    }
}
// Run the client
initializeClient().catch(console.error);
