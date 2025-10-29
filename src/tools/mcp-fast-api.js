#!/usr/bin/env node

// Fast API for Immediate MCP Server Access
// This provides a fast, lightweight interface for immediate server access without full REST overhead

const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.FAST_API_PORT || 8081;
const LAZY_LOADER_SCRIPT = process.env.LAZY_LOADER_SCRIPT || '/Users/lorenzorasmussen/.local/share/mcp/lazy_loader.sh';

// Middleware for fast response
app.use(express.json({ limit: '10kb' })); // Limit payload size for speed

// Utility function to run lazy loader fast-start command
function runFastStart(serverName) {
    return new Promise((resolve, reject) => {
        const command = `${LAZY_LOADER_SCRIPT} fast-start ${serverName}`;
        
        exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error running fast start command: ${error}`);
                reject({ error: stderr || error.message });
                return;
            }
            
            resolve(stdout.trim());
        });
    });
}

// Utility function to get server status
function getServerStatus(serverName) {
    return new Promise((resolve, reject) => {
        const command = `${LAZY_LOADER_SCRIPT} status ${serverName}`;
        
        exec(command, { timeout: 3000 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error getting server status: ${error}`);
                reject({ error: stderr || error.message });
                return;
            }
            
            try {
                resolve(JSON.parse(stdout.trim()));
            } catch (parseError) {
                resolve({ error: 'Invalid status response' });
            }
        });
    });
}

// GET /fast/ready - Fast health check
app.get('/fast/ready', (req, res) => {
    res.status(200).json({ status: 'ready', timestamp: Date.now() });
});

// POST /fast/access/:name - Fast server access endpoint
app.post('/fast/access/:name', async (req, res) => {
    const serverName = req.params.name;
    
    try {
        // Attempt to start the server if not running
        const result = await runFastStart(serverName);
        
        // Get updated status
        const status = await getServerStatus(serverName);
        
        res.status(200).json({
            message: `Server ${serverName} accessed successfully`,
            serverName,
            status,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({
            error: error.error || `Failed to access server ${serverName}`,
            serverName,
            timestamp: Date.now()
        });
    }
});

// GET /fast/status/:name - Fast status check
app.get('/fast/status/:name', async (req, res) => {
    const serverName = req.params.name;
    
    try {
        const status = await getServerStatus(serverName);
        res.status(200).json({
            serverName,
            status,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({
            error: error.error || `Failed to get status for server ${serverName}`,
            serverName,
            timestamp: Date.now()
        });
    }
});

// POST /fast/batch-access - Fast batch access to multiple servers
app.post('/fast/batch-access', async (req, res) => {
    const serverNames = req.body.servers || [];
    
    if (!Array.isArray(serverNames) || serverNames.length === 0) {
        return res.status(400).json({ error: 'Request must include an array of server names' });
    }
    
    // Limit batch size for performance
    if (serverNames.length > 10) {
        return res.status(400).json({ error: 'Batch size limited to 10 servers' });
    }
    
    const results = {};
    
    // Process servers in parallel for speed
    const promises = serverNames.map(serverName => 
        runFastStart(serverName)
            .then(() => getServerStatus(serverName))
            .then(status => {
                results[serverName] = { status, success: true };
            })
            .catch(error => {
                results[serverName] = { error: error.error || 'Failed to access', success: false };
            })
    );
    
    await Promise.all(promises);
    
    res.status(200).json({
        message: 'Batch access completed',
        results,
        timestamp: Date.now()
    });
});

// GET /fast/quick-config - Get essential config for fast operations
app.get('/fast/quick-config', (req, res) => {
    const configPath = process.env.CONFIG_FILE || '/Users/lorenzorasmussen/.qwen/mcp_config.json';
    
    fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read configuration' });
        }
        
        try {
            const config = JSON.parse(data);
            const quickConfig = {
                inactivityTimeout: config.lazy_loading?.inactivity_timeout || 300,
                gracePeriod: config.lazy_loading?.grace_period || 30,
                availableServers: (config.servers || []).map(s => s.name)
            };
            
            res.json(quickConfig);
        } catch (parseError) {
            res.status(500).json({ error: 'Invalid configuration format' });
        }
    });
});

// Error handling for fast responses
app.use((err, req, res, next) => {
    console.error('Fast API Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start the fast API server
app.listen(PORT, () => {
    console.log(`MCP Fast API running on port ${PORT}`);
    console.log(`Fast API endpoints:`);
    console.log(`  GET    /fast/ready               - Health check`);
    console.log(`  POST   /fast/access/:name        - Fast server access`);
    console.log(`  GET    /fast/status/:name        - Fast status check`);
    console.log(`  POST   /fast/batch-access        - Batch server access`);
    console.log(`  GET    /fast/quick-config        - Quick config access`);
});

module.exports = app;