#!/usr/bin/env node

// MCP Server Monitoring Dashboard
// Provides a real-time dashboard for monitoring the lazy loading system

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.MONITOR_PORT || 8083;
const METRICS_FILE = process.env.METRICS_FILE || '/Users/lorenzorasmussen/.local/share/mcp/mcp-metrics.json';
const CONFIG_FILE = process.env.CONFIG_FILE || '/Users/lorenzorasmussen/.qwen/mcp_config.json';

// Serve static files and dashboard
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to get current metrics
app.get('/api/dashboard/metrics', (req, res) => {
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

// Endpoint to get configuration
app.get('/api/dashboard/config', (req, res) => {
    fs.readFile(CONFIG_FILE, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read config file' });
        }
        
        try {
            const config = JSON.parse(data);
            res.json({
                lazy_loading: config.lazy_loading,
                api: config.api,
                servers: config.servers
            });
        } catch (parseError) {
            res.status(500).json({ error: 'Invalid config file format' });
        }
    });
});

// Endpoint to get server processes
app.get('/api/dashboard/processes', (req, res) => {
    const { exec } = require('child_process');
    
    exec('ps aux | grep mcp-server', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to get process list' });
        }
        
        // Parse process information
        const processes = stdout
            .split('\n')
            .filter(line => line.trim() !== '' && !line.includes('grep mcp-server'))
            .map(line => {
                const parts = line.trim().split(/\s+/);
                return {
                    user: parts[0],
                    pid: parts[1],
                    cpu: parts[2],
                    mem: parts[3],
                    vsz: parts[4],
                    rss: parts[5],
                    tty: parts[6],
                    stat: parts[7],
                    start: parts[8],
                    time: parts[9],
                    command: parts.slice(10).join(' ')
                };
            });
        
        res.json({ processes });
    });
});

// Endpoint to trigger garbage collection of inactive servers
app.post('/api/dashboard/cleanup', (req, res) => {
    // This would trigger the lazy loader to check for inactive servers immediately
    // For now, we'll just return a success message
    res.json({ 
        message: 'Cleanup requested', 
        timestamp: new Date().toISOString() 
    });
});

// Endpoint to get system resource usage
app.get('/api/dashboard/system', (req, res) => {
    const os = require('os');
    
    const stats = {
        platform: os.platform(),
        arch: os.arch(),
        cpuCount: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        usedMemory: os.totalmem() - os.freemem(),
        memoryUsagePercent: Math.round((os.totalmem() - os.freemem()) / os.totalmem() * 100),
        uptime: os.uptime(),
        loadAverage: os.loadavg(),
        timestamp: new Date().toISOString()
    };
    
    res.json(stats);
});

// Main dashboard page
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>MCP Server Lazy Loading Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
            .stat-card { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .stat-title { font-weight: bold; margin-bottom: 10px; color: #2c3e50; }
            .stat-value { font-size: 1.5em; font-weight: bold; }
            .servers-list { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .server-item { padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
            .server-item:last-child { border-bottom: none; }
            .status-running { color: green; }
            .status-stopped { color: red; }
            .status-stopping { color: orange; }
            .refresh-btn { background: #3498db; color: white; border: none; padding: 10px 15px; border-radius: 3px; cursor: pointer; }
            .refresh-btn:hover { background: #2980b9; }
            .actions { margin: 20px 0; }
            .action-btn { background: #27ae60; color: white; border: none; padding: 8px 15px; border-radius: 3px; margin-right: 10px; cursor: pointer; }
            .action-btn:hover { background: #219653; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>MCP Server Lazy Loading Dashboard</h1>
                <p>Real-time monitoring of lazy-loaded MCP servers</p>
            </div>
            
            <div class="actions">
                <button class="action-btn" onclick="refreshData()">Refresh</button>
                <button class="action-btn" onclick="requestCleanup()">Request Cleanup</button>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-title">Active Servers</div>
                    <div class="stat-value" id="active-count">-</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Total Starts</div>
                    <div class="stat-value" id="total-starts">-</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Total Stops</div>
                    <div class="stat-value" id="total-stops">-</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">System Memory</div>
                    <div class="stat-value" id="memory-usage">-</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-title">System Stats</div>
                <div id="system-stats"></div>
            </div>
            
            <div class="servers-list">
                <div class="stat-title">Server Status</div>
                <div id="servers-container"></div>
            </div>
        </div>
        
        <script>
            async function fetchMetrics() {
                try {
                    const response = await fetch('/api/dashboard/metrics');
                    const metrics = await response.json();
                    
                    // Update lazy loader stats
                    document.getElementById('active-count').textContent = metrics.lazy_loader.active_count || 0;
                    document.getElementById('total-starts').textContent = metrics.lazy_loader.total_starts || 0;
                    document.getElementById('total-stops').textContent = metrics.lazy_loader.total_stops || 0;
                    
                    // Update servers list
                    const serversContainer = document.getElementById('servers-container');
                    serversContainer.innerHTML = '';
                    
                    for (const [name, server] of Object.entries(metrics.servers)) {
                        const serverElement = document.createElement('div');
                        serverElement.className = 'server-item';
                        
                        const statusClass = server.status === 'running' ? 'status-running' : 
                                          server.status === 'stopped' ? 'status-stopped' : 'status-stopping';
                        
                        serverElement.innerHTML = \`
                            <div>
                                <strong>\${name}</strong>
                                <div class="\${statusClass}">\${server.status || 'unknown'}</div>
                            </div>
                            <div style="text-align: right;">
                                <div>Last Access: \${server.last_access || 'never'}</div>
                                <div>Access Count: \${server.access_count || 0}</div>
                            </div>
                        \`;
                        
                        serversContainer.appendChild(serverElement);
                    }
                } catch (error) {
                    console.error('Error fetching metrics:', error);
                }
            }
            
            async function fetchSystemStats() {
                try {
                    const response = await fetch('/api/dashboard/system');
                    const stats = await response.json();
                    
                    const statsElement = document.getElementById('system-stats');
                    statsElement.innerHTML = \`
                        <div>CPU Cores: \${stats.cpuCount}</div>
                        <div>Platform: \${stats.platform} \${stats.arch}</div>
                        <div>Memory: \${Math.round(stats.usedMemory / 1024 / 1024)}MB / \${Math.round(stats.totalMemory / 1024 / 1024)}MB (\${stats.memoryUsagePercent}%)</div>
                        <div>Load Average: \${stats.loadAverage.map(l => l.toFixed(2)).join(', ')}</div>
                        <div>Uptime: \${Math.round(stats.uptime / 60)} minutes</div>
                    `;
                    
                    document.getElementById('memory-usage').textContent = \`\${stats.memoryUsagePercent}%\`;
                } catch (error) {
                    console.error('Error fetching system stats:', error);
                }
            }
            
            async function requestCleanup() {
                try {
                    const response = await fetch('/api/dashboard/cleanup', { method: 'POST' });
                    const result = await response.json();
                    alert('Cleanup requested: ' + result.message);
                } catch (error) {
                    console.error('Error requesting cleanup:', error);
                    alert('Failed to request cleanup');
                }
            }
            
            async function refreshData() {
                await fetchMetrics();
                await fetchSystemStats();
            }
            
            // Initial load and refresh every 10 seconds
            refreshData();
            setInterval(refreshData, 10000);
        </script>
    </body>
    </html>
    `);
});

app.listen(PORT, () => {
    console.log(`MCP Server Monitoring Dashboard running on port ${PORT}`);
    console.log(`Dashboard URL: http://localhost:${PORT}/`);
});

module.exports = app;