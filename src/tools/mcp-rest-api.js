#!/usr/bin/env node

// REST API for MCP Server Management
// This server provides REST endpoints for managing MCP servers through the lazy loader

const express = require('express');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.MCP_API_PORT || 8080;
const LAZY_LOADER_SCRIPT = process.env.LAZY_LOADER_SCRIPT || '/Users/lorenzorasmussen/.local/share/mcp/lazy_loader.sh';

// Middleware
app.use(express.json());

// Utility function to run lazy loader commands
function runLazyLoaderCommand(args) {
    return new Promise((resolve, reject) => {
        const command = `${LAZY_LOADER_SCRIPT} ${args}`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error running lazy loader command: ${error}`);
                reject({ error: stderr || error.message });
                return;
            }
            
            try {
                // Try to parse JSON output if possible
                const trimmedOutput = stdout.trim();
                if (trimmedOutput.startsWith('{') || trimmedOutput.startsWith('[')) {
                    resolve(JSON.parse(trimmedOutput));
                } else {
                    resolve(trimmedOutput);
                }
            } catch (parseError) {
                resolve(trimmedOutput);
            }
        });
    });
}

// GET /api/servers - List all servers and their status
app.get('/api/servers', async (req, res) => {
    try {
        const status = await runLazyLoaderCommand('list');
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.error || 'Failed to get server list' });
    }
});

// GET /api/servers/:name - Get status of a specific server
app.get('/api/servers/:name', async (req, res) => {
    const serverName = req.params.name;
    
    try {
        const status = await runLazyLoaderCommand(`status ${serverName}`);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.error || `Failed to get status for server ${serverName}` });
    }
});

// POST /api/servers/:name/start - Start a specific server
app.post('/api/servers/:name/start', async (req, res) => {
    const serverName = req.params.name;
    
    try {
        const result = await runLazyLoaderCommand(`start-server ${serverName}`);
        res.json({ message: `Server ${serverName} started`, result });
    } catch (error) {
        res.status(500).json({ error: error.error || `Failed to start server ${serverName}` });
    }
});

// POST /api/servers/:name/stop - Stop a specific server
app.post('/api/servers/:name/stop', async (req, res) => {
    const serverName = req.params.name;
    
    try {
        const result = await runLazyLoaderCommand(`stop ${serverName}`);
        res.json({ message: `Server ${serverName} stopped`, result });
    } catch (error) {
        res.status(500).json({ error: error.error || `Failed to stop server ${serverName}` });
    }
});

// GET /api/config - Get current configuration
app.get('/api/config', (req, res) => {
    const configPath = process.env.CONFIG_FILE || '/Users/lorenzorasmussen/.qwen/mcp_config.json';
    
    fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({ error: 'Failed to read configuration file' });
            return;
        }
        
        try {
            const config = JSON.parse(data);
            res.json({
                inactivityTimeout: config.lazy_loading?.inactivity_timeout || 300,
                gracePeriod: config.lazy_loading?.grace_period || 30,
                servers: config.servers || []
            });
        } catch (parseError) {
            res.status(500).json({ error: 'Invalid configuration file format' });
        }
    });
});

// PUT /api/config - Update configuration
app.put('/api/config', (req, res) => {
    const configPath = process.env.CONFIG_FILE || '/Users/lorenzorasmussen/.qwen/mcp_config.json';
    const newConfig = req.body;
    
    fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({ error: 'Failed to read configuration file' });
            return;
        }
        
        try {
            const config = JSON.parse(data);
            
            // Update lazy loading settings
            if (!config.lazy_loading) {
                config.lazy_loading = {};
            }
            
            if (newConfig.inactivityTimeout !== undefined) {
                config.lazy_loading.inactivity_timeout = newConfig.inactivityTimeout;
            }
            
            if (newConfig.gracePeriod !== undefined) {
                config.lazy_loading.grace_period = newConfig.gracePeriod;
            }
            
            // Update server configurations
            if (newConfig.servers !== undefined) {
                config.servers = newConfig.servers;
            }
            
            fs.writeFile(configPath, JSON.stringify(config, null, 2), (writeErr) => {
                if (writeErr) {
                    res.status(500).json({ error: 'Failed to update configuration file' });
                    return;
                }
                
                res.json({ message: 'Configuration updated successfully' });
            });
        } catch (parseError) {
            res.status(500).json({ error: 'Invalid configuration file format' });
        }
    });
});

// GET /api/metrics - Get server metrics
app.get('/api/metrics', (req, res) => {
    const metricsPath = process.env.METRICS_FILE || '/Users/lorenzorasmussen/.local/share/mcp/mcp-metrics.json';
    
    fs.readFile(metricsPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({ error: 'Failed to read metrics file' });
            return;
        }
        
        try {
            const metrics = JSON.parse(data);
            res.json(metrics);
        } catch (parseError) {
            res.status(500).json({ error: 'Invalid metrics file format' });
        }
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`MCP Server Management API running on port ${PORT}`);
    console.log(`API endpoints:`);
    console.log(`  GET    /api/servers          - List all servers`);
    console.log(`  GET    /api/servers/:name    - Get server status`);
    console.log(`  POST   /api/servers/:name/start  - Start server`);
    console.log(`  POST   /api/servers/:name/stop   - Stop server`);
    console.log(`  GET    /api/config           - Get configuration`);
    console.log(`  PUT    /api/config           - Update configuration`);
    console.log(`  GET    /api/metrics          - Get metrics`);
    console.log(`  GET    /api/health           - Health check`);
});

module.exports = app;