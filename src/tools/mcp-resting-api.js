#!/usr/bin/env node

// Resting API for MCP Server Status and Control
// This provides endpoints for monitoring server status and controlling server behavior when resting

const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.RESTING_API_PORT || 8082;
const LAZY_LOADER_SCRIPT = process.env.LAZY_LOADER_SCRIPT || '/Users/lorenzorasmussen/.local/share/mcp/lazy_loader.sh';
const METRICS_FILE = process.env.METRICS_FILE || '/Users/lorenzorasmussen/.local/share/mcp/mcp-metrics.json';

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

// GET /resting/status - Get overall system status
app.get('/resting/status', (req, res) => {
    fs.readFile(METRICS_FILE, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read metrics file' });
        }
        
        try {
            const metrics = JSON.parse(data);
            res.json({
                lazy_loader: metrics.lazy_loader || { status: 'unknown' },
                server_count: Object.keys(metrics.servers || {}).length,
                active_servers: Object.values(metrics.servers || {}).filter(s => s.status === 'running').length,
                timestamp: new Date().toISOString()
            });
        } catch (parseError) {
            res.status(500).json({ error: 'Invalid metrics file format' });
        }
    });
});

// GET /resting/servers - Get detailed status of all servers
app.get('/resting/servers', async (req, res) => {
    try {
        const allStatuses = await runLazyLoaderCommand('list');
        res.json(allStatuses);
    } catch (error) {
        res.status(500).json({ error: error.error || 'Failed to get server statuses' });
    }
});

// GET /resting/servers/:name - Get detailed status of a specific server
app.get('/resting/servers/:name', async (req, res) => {
    const serverName = req.params.name;
    
    try {
        const status = await runLazyLoaderCommand(`status ${serverName}`);
        res.json({ server: serverName, status, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ error: error.error || `Failed to get status for server ${serverName}` });
    }
});

// POST /resting/control/:name/sleep - Force a server to sleep now
app.post('/resting/control/:name/sleep', async (req, res) => {
    const serverName = req.params.name;
    
    try {
        const result = await runLazyLoaderCommand(`stop ${serverName}`);
        res.json({
            message: `Server ${serverName} put to sleep`,
            server: serverName,
            result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: error.error || `Failed to put server ${serverName} to sleep`,
            server: serverName
        });
    }
});

// POST /resting/control/:name/wake - Wake up a server (alias for start)
app.post('/resting/control/:name/wake', async (req, res) => {
    const serverName = req.params.name;
    
    try {
        const result = await runLazyLoaderCommand(`start-server ${serverName}`);
        res.json({
            message: `Server ${serverName} woken up`,
            server: serverName,
            result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: error.error || `Failed to wake up server ${serverName}`,
            server: serverName
        });
    }
});

// GET /resting/control/:name/config - Get server-specific configuration
app.get('/resting/control/:name/config', (req, res) => {
    const configPath = process.env.CONFIG_FILE || '/Users/lorenzorasmussen/.qwen/mcp_config.json';
    
    fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read configuration file' });
        }
        
        try {
            const config = JSON.parse(data);
            const serverConfig = config.servers?.find(s => s.name === req.params.name);
            
            if (!serverConfig) {
                return res.status(404).json({ error: `Server ${req.params.name} not found in configuration` });
            }
            
            res.json({
                server: req.params.name,
                config: {
                    path: serverConfig.path,
                    args: serverConfig.args,
                    enabled: serverConfig.enabled !== false
                },
                lazy_loading: config.lazy_loading || {}
            });
        } catch (parseError) {
            res.status(500).json({ error: 'Invalid configuration file format' });
        }
    });
});

// GET /resting/metrics - Get detailed metrics
app.get('/resting/metrics', (req, res) => {
    fs.readFile(METRICS_FILE, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read metrics file' });
        }
        
        try {
            const metrics = JSON.parse(data);
            res.json(metrics);
        } catch (parseError) {
            res.status(500).json({ error: 'Invalid metrics file format' });
        }
    });
});

// GET /resting/logs/tail - Get recent log entries (last 50 lines)
app.get('/resting/logs/tail', (req, res) => {
    const logFile = process.env.LOG_FILE || '/Users/lorenzorasmussen/.local/share/mcp/lazy_loader.log';
    
    exec(`tail -n 50 ${logFile}`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to read log file' });
        }
        
        res.json({
            logEntries: stdout.split('\n').filter(line => line.trim() !== ''),
            timestamp: new Date().toISOString()
        });
    });
});

// POST /resting/control/system/restart - Restart the lazy loader system
app.post('/resting/control/system/restart', (req, res) => {
    // This would require more complex implementation to restart the lazy loader
    // For now, we'll just return a not-implemented response
    res.status(501).json({
        error: 'System restart not implemented in this API',
        message: 'Please manually restart the lazy loader service'
    });
});

// GET /resting/health - Comprehensive health check
app.get('/resting/health', (req, res) => {
    const status = {
        api: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            resting: true,
            fast: process.env.FAST_API_PORT ? `running on port ${process.env.FAST_API_PORT}` : 'not running',
            rest: process.env.MCP_API_PORT ? `running on port ${process.env.MCP_API_PORT}` : 'not running'
        }
    };
    
    // Check if lazy loader script exists
    fs.access(LAZY_LOADER_SCRIPT, fs.constants.F_OK, (err) => {
        status.system = err ? 'not found' : 'available';
        
        // Check if config file exists
        const configPath = process.env.CONFIG_FILE || '/Users/lorenzorasmussen/.qwen/mcp_config.json';
        fs.access(configPath, fs.constants.F_OK, (configErr) => {
            status.config = configErr ? 'not found' : 'available';
            
            res.json(status);
        });
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Resting API Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start the resting API server
app.listen(PORT, () => {
    console.log(`MCP Resting API running on port ${PORT}`);
    console.log(`Resting API endpoints:`);
    console.log(`  GET    /resting/status           - System status`);
    console.log(`  GET    /resting/servers          - All server statuses`);
    console.log(`  GET    /resting/servers/:name    - Specific server status`);
    console.log(`  POST   /resting/control/:name/sleep  - Put server to sleep`);
    console.log(`  POST   /resting/control/:name/wake   - Wake up server`);
    console.log(`  GET    /resting/control/:name/config - Server config`);
    console.log(`  GET    /resting/metrics          - Detailed metrics`);
    console.log(`  GET    /resting/logs/tail        - Recent logs`);
    console.log(`  POST   /resting/control/system/restart - Restart system (not implemented)`);
    console.log(`  GET    /resting/health           - Health check`);
});

module.exports = app;