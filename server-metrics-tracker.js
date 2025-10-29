#!/usr/bin/env node

// Server State and Metrics Tracker
// This module maintains comprehensive metrics for the lazy loading system

const fs = require('fs');
const path = require('path');

class ServerMetricsTracker {
    constructor(metricsFile) {
        this.metricsFile = metricsFile;
        this.ensureMetricsFile();
    }

    // Ensure metrics file exists with proper structure
    ensureMetricsFile() {
        if (!fs.existsSync(this.metricsFile)) {
            const initialMetrics = {
                servers: {},
                lazy_loader: {
                    start_time: new Date().toISOString(),
                    status: 'running',
                    last_activity: new Date().toISOString(),
                    active_count: 0,
                    total_starts: 0,
                    total_stops: 0
                }
            };
            
            fs.writeFileSync(this.metricsFile, JSON.stringify(initialMetrics, null, 2));
        }
    }

    // Update server status
    updateServerStatus(serverName, status) {
        const metrics = this.readMetrics();
        
        if (!metrics.servers[serverName]) {
            metrics.servers[serverName] = {};
        }
        
        metrics.servers[serverName].status = status;
        metrics.servers[serverName].last_status_change = new Date().toISOString();
        
        if (status === 'running') {
            metrics.servers[serverName].last_start = new Date().toISOString();
            metrics.lazy_loader.total_starts = (metrics.lazy_loader.total_starts || 0) + 1;
        } else if (status === 'stopped') {
            metrics.servers[serverName].last_stop = new Date().toISOString();
            metrics.lazy_loader.total_stops = (metrics.lazy_loader.total_stops || 0) + 1;
        }
        
        this.writeMetrics(metrics);
    }

    // Record server access
    recordServerAccess(serverName) {
        const metrics = this.readMetrics();
        
        if (!metrics.servers[serverName]) {
            metrics.servers[serverName] = {};
        }
        
        metrics.servers[serverName].last_access = new Date().toISOString();
        metrics.servers[serverName].access_count = (metrics.servers[serverName].access_count || 0) + 1;
        metrics.lazy_loader.last_activity = new Date().toISOString();
        
        this.writeMetrics(metrics);
    }

    // Update active server count
    updateActiveCount(count) {
        const metrics = this.readMetrics();
        metrics.lazy_loader.active_count = count;
        this.writeMetrics(metrics);
    }

    // Record performance metrics for a server
    recordPerformance(serverName, performanceData) {
        const metrics = this.readMetrics();
        
        if (!metrics.servers[serverName]) {
            metrics.servers[serverName] = {};
        }
        
        metrics.servers[serverName].performance = {
            ...metrics.servers[serverName].performance,
            ...performanceData,
            last_recorded: new Date().toISOString()
        };
        
        this.writeMetrics(metrics);
    }

    // Get all metrics
    getMetrics() {
        return this.readMetrics();
    }

    // Get specific server metrics
    getServerMetrics(serverName) {
        const metrics = this.readMetrics();
        return metrics.servers[serverName] || null;
    }

    // Get summary metrics
    getSummary() {
        const metrics = this.readMetrics();
        const serverNames = Object.keys(metrics.servers);
        const runningServers = serverNames.filter(name => metrics.servers[name].status === 'running');
        
        return {
            totalServers: serverNames.length,
            runningServers: runningServers.length,
            stoppedServers: serverNames.length - runningServers.length,
            totalStarts: metrics.lazy_loader.total_starts || 0,
            totalStops: metrics.lazy_loader.total_stops || 0,
            activeCount: metrics.lazy_loader.active_count || 0,
            startTime: metrics.lazy_loader.start_time
        };
    }

    // Read metrics from file
    readMetrics() {
        try {
            const data = fs.readFileSync(this.metricsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading metrics file:', error);
            return { servers: {}, lazy_loader: {} };
        }
    }

    // Write metrics to file
    writeMetrics(metrics) {
        try {
            fs.writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
        } catch (error) {
            console.error('Error writing metrics file:', error);
        }
    }

    // Reset metrics for a server
    resetServerMetrics(serverName) {
        const metrics = this.readMetrics();
        
        if (metrics.servers[serverName]) {
            delete metrics.servers[serverName];
            this.writeMetrics(metrics);
        }
    }

    // Cleanup function for shutdown
    cleanup() {
        const metrics = this.readMetrics();
        metrics.lazy_loader.status = 'stopped';
        metrics.lazy_loader.stop_time = new Date().toISOString();
        this.writeMetrics(metrics);
    }
}

// Example usage
if (require.main === module) {
    const metricsFile = process.env.METRICS_FILE || '/Users/lorenzorasmussen/.local/share/mcp/mcp-metrics.json';
    const tracker = new ServerMetricsTracker(metricsFile);
    
    // Example: Update a server status
    if (process.argv[2] === 'update-status') {
        tracker.updateServerStatus(process.argv[3], process.argv[4]);
        console.log(`Updated status for server ${process.argv[3]} to ${process.argv[4]}`);
    }
    // Example: Record server access
    else if (process.argv[2] === 'record-access') {
        tracker.recordServerAccess(process.argv[3]);
        console.log(`Recorded access for server ${process.argv[3]}`);
    }
    // Example: Show summary
    else if (process.argv[2] === 'summary') {
        console.log(tracker.getSummary());
    }
    else {
        console.log('Usage:');
        console.log('  node server-metrics-tracker.js update-status <server-name> <status>');
        console.log('  node server-metrics-tracker.js record-access <server-name>');
        console.log('  node server-metrics-tracker.js summary');
    }
}

module.exports = ServerMetricsTracker;