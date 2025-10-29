# MCP Ecosystem Troubleshooting Guide

## Table of Contents
- [Getting Started with Troubleshooting](#getting-started-with-troubleshooting)
- [Common Issues and Solutions](#common-issues-and-solutions)
- [Diagnostic Commands](#diagnostic-commands)
- [Log Analysis](#log-analysis)
- [Performance Issues](#performance-issues)
- [Coordination Problems](#coordination-problems)
- [Server Management Issues](#server-management-issues)
- [API Troubleshooting](#api-troubleshooting)
- [Security Issues](#security-issues)
- [Recovery Procedures](#recovery-procedures)
- [Support Resources](#support-resources)

## Getting Started with Troubleshooting

### Initial Assessment
When encountering issues with the MCP Ecosystem, start with these basic checks:

1. **Service Status**: Verify that all required services are running
2. **Port Availability**: Check that required ports are not in use
3. **Resource Usage**: Monitor CPU, memory, and disk usage
4. **Network Connectivity**: Ensure services can communicate with each other
5. **Configuration**: Verify all configuration files and environment variables

### Quick Health Check Commands
```bash
# Check orchestrator health
curl http://localhost:3103/health

# Check coordination server health
curl http://localhost:3109/health

# Check lazy loader status
curl http://localhost:3007/status

# Check all running processes
pm2 list
```

### System Requirements Check
```bash
# Check Node.js version
node --version

# Check available memory
free -h  # Linux
# or
vm_stat  # macOS

# Check disk space
df -h

# Check if required ports are available
netstat -tulpn | grep -E ':(310[0-9]|3007)'  # Linux
# or
lsof -i :3103 :3109 :3007  # macOS
```

## Common Issues and Solutions

### Service Not Starting

**Symptom**: Services fail to start or crash immediately after starting

**Causes and Solutions**:
1. **Port Already in Use**
   - **Check**: `netstat -tulpn | grep :3103` (Linux) or `lsof -i :3103` (macOS)
   - **Solution**: Kill the process using the port or change the port configuration

2. **Insufficient Memory**
   - **Check**: Monitor system memory usage
   - **Solution**: Increase available memory or reduce memory limits in PM2 config

3. **Missing Dependencies**
   - **Check**: Look for "module not found" errors in logs
   - **Solution**: Run `npm install` to install missing dependencies

4. **Configuration Issues**
   - **Check**: Verify environment variables and config files
   - **Solution**: Ensure all required configuration values are set

### Coordination Conflicts

**Symptom**: Operations are blocked due to active sessions or branch conflicts

**Causes and Solutions**:
1. **Active Sessions Preventing Branch Switching**
   - **Check**: `node tools/scripts/llm-coordinator-unified.js status`
   - **Solution**: Complete or terminate active sessions before switching branches

2. **Todo Enforcement Blocking Operations**
   - **Check**: Verify todos exist for operations
   - **Solution**: Create appropriate todos or adjust enforcement settings

3. **Git Operation Failures**
   - **Check**: Use coordination tools to validate operations
   - **Solution**: Ensure clean working directory and proper permissions

### Server Management Issues

**Symptom**: MCP servers fail to start, stop, or respond to requests

**Causes and Solutions**:
1. **Lazy Loader Not Running**
   - **Check**: `curl http://localhost:3007/status`
   - **Solution**: Start the lazy loader service

2. **Server Startup Failures**
   - **Check**: Review server configuration in lazy_loader.js
   - **Solution**: Verify server paths, arguments, and dependencies

3. **Port Conflicts**
   - **Check**: Ensure each server has a unique port
   - **Solution**: Update port assignments in server configurations

## Diagnostic Commands

### Service Status Checks
```bash
# Check orchestrator status
curl http://localhost:3103/status

# Check coordination status
curl http://localhost:3109/api/status

# Check available tools
curl http://localhost:3103/tools

# Check running servers
curl http://localhost:3007/servers

# Check specific server status
curl http://localhost:3007/status/mem0
```

### Process Management
```bash
# List all PM2 processes
pm2 list

# View logs for orchestrator
pm2 logs mcp-orchestrator

# Restart a specific process
pm2 restart mcp-proxy

# Stop all processes
pm2 stop all

# Monitor resource usage
pm2 monit
```

### Coordination Diagnostics
```bash
# Check current coordination status
node tools/scripts/llm-coordinator-unified.js status

# Check branch switching permissions
node tools/scripts/llm-coordinator-unified.js check-branch develop

# Generate enforcement report
node tools/scripts/llm-coordinator-unified.js enforce-report

# Check todo status
node tools/scripts/llm-coordinator-unified.js todo-status
```

### Network Connectivity
```bash
# Test orchestrator connectivity
curl -v http://localhost:3103/health

# Test coordination server connectivity
curl -v http://localhost:3109/health

# Test lazy loader connectivity
curl -v http://localhost:3007/servers/status

# Check if all services are reachable
for port in 3103 3109 3007; do
  echo "Testing port $port:"
  nc -zv localhost $port 2>&1
done
```

## Log Analysis

### Log File Locations
- **Orchestrator logs**: `logs/orchestrator.log`
- **Proxy logs**: `logs/mcp-proxy.log`
- **Coordination logs**: `logs/coordination.log`
- **Lazy loader logs**: `logs/lazy-loader.log`
- **PM2 logs**: Managed by PM2 (`pm2 logs` command)

### Log Analysis Commands
```bash
# View recent orchestrator logs
tail -f logs/orchestrator.log

# Search for errors in logs
grep -i error logs/*.log

# Find recent error entries
grep -i "error\|fail\|exception" logs/*.log | tail -20

# Monitor logs in real-time
tail -f logs/orchestrator.log | grep --line-buffered -i error
```

### Common Log Patterns to Look For

#### Error Patterns
- `"Error:"` - General errors
- `"Failed to"` - Operation failures
- `"Connection refused"` - Network issues
- `"ENOENT"` - File not found errors
- `"EACCES"` - Permission denied errors
- `"EADDRINUSE"` - Port already in use

#### Performance Patterns
- `"Slow operation"` - Performance issues
- `"High memory usage"` - Memory problems
- `"Timeout"` - Timeout issues
- `"Retrying"` - Retry attempts

#### Coordination Patterns
- `"Coordination conflict"` - Coordination issues
- `"Todo required"` - Todo enforcement
- `"Session active"` - Active sessions
- `"Branch locked"` - Branch conflicts

### Log Parsing Example
```bash
# Extract error timestamps and messages
grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z.*Error:.*' logs/*.log

# Count error occurrences by type
grep -i error logs/*.log | cut -d: -f4- | sort | uniq -c | sort -nr
```

## Performance Issues

### Slow Response Times

**Symptoms**: API requests taking longer than expected

**Investigation Steps**:
1. **Check Resource Usage**: Monitor CPU and memory usage
2. **Review Logs**: Look for "slow operation" or timeout messages
3. **Check Dependencies**: Verify external services are responding
4. **Analyze Bottlenecks**: Identify which components are causing delays

**Solutions**:
- Optimize database queries or cache frequently accessed data
- Increase memory limits for processes
- Add connection pooling for database connections
- Implement caching for expensive operations

### High Memory Usage

**Symptoms**: Processes consuming excessive memory

**Investigation Steps**:
1. **Monitor Memory**: Use `pm2 monit` or system tools
2. **Check Process Limits**: Verify PM2 memory limits
3. **Review Code**: Look for memory leaks or inefficient operations
4. **Analyze Patterns**: Identify when memory usage spikes

**Solutions**:
- Set appropriate memory limits in PM2 configuration
- Implement proper cleanup of resources
- Use streaming for large data operations
- Optimize data structures and algorithms

### Resource Exhaustion

**Symptoms**: System running out of resources (memory, file descriptors, etc.)

**Investigation Steps**:
1. **Check System Resources**: Use system monitoring tools
2. **Review Process Configuration**: Verify resource limits
3. **Analyze Usage Patterns**: Identify resource-intensive operations
4. **Check for Leaks**: Look for unreleased resources

**Solutions**:
- Implement resource pooling and reuse
- Set appropriate limits for processes
- Implement proper cleanup procedures
- Add monitoring and alerting for resource usage

## Coordination Problems

### Session Conflicts

**Symptoms**: Unable to switch branches or perform operations due to active sessions

**Diagnosis**:
```bash
# Check active sessions
node tools/scripts/llm-coordinator-unified.js status

# View coordination data directly
cat .llm-coordination.json
```

**Solutions**:
1. **Complete Active Sessions**: Finish the work and complete the sessions
2. **Terminate Sessions**: Manually terminate stale sessions if necessary
3. **Check for Stale Data**: Clean up coordination data if corrupted
4. **Adjust Timeout Settings**: Modify session timeout values if needed

### Todo Enforcement Issues

**Symptoms**: Operations blocked by todo enforcement or todo validation failures

**Diagnosis**:
```bash
# Check todo status
node tools/scripts/llm-coordinator-unified.js todo-status

# View todo data
cat data/shared-knowledge/.mcp-shared-knowledge/tasks/shared_tasks.json
```

**Solutions**:
1. **Create Required Todos**: Create appropriate todos for operations
2. **Adjust Enforcement Settings**: Modify TODO_ENFORCEMENT_STRICT if needed
3. **Check Todo Service**: Ensure todo service is running properly
4. **Validate Todo Format**: Verify todos follow expected format

### Git Operation Failures

**Symptoms**: Git operations blocked or failing due to coordination enforcement

**Diagnosis**:
```bash
# Check git operation permissions
node tools/scripts/llm-coordinator-unified.js check-git-status push

# Generate enforcement report
node tools/scripts/llm-coordinator-unified.js enforce-report
```

**Solutions**:
1. **Check Working Directory**: Ensure clean working directory
2. **Verify Permissions**: Check git repository permissions
3. **Review Enforcement Rules**: Adjust rules if overly restrictive
4. **Complete Related Todos**: Ensure all related work is tracked

## Server Management Issues

### Server Startup Failures

**Symptoms**: MCP servers fail to start through the lazy loader

**Diagnosis**:
```bash
# Check lazy loader status
curl http://localhost:3007/servers/status

# Try starting a specific server
curl -X POST http://localhost:3007/start/mem0

# Check server configuration
grep -A 10 -B 5 "mem0" src/mcp-ecosystem/core/lazy_loader.js
```

**Solutions**:
1. **Verify Server Configuration**: Check server paths and arguments
2. **Check Dependencies**: Ensure required dependencies are installed
3. **Validate Ports**: Verify port assignments are unique and available
4. **Review Startup Scripts**: Check if server startup scripts work independently

### Server Communication Issues

**Symptoms**: Orchestrator unable to communicate with MCP servers

**Diagnosis**:
```bash
# Check if server is running
curl http://localhost:3100/health  # Example for mem0 server

# Test direct server communication
curl -X POST http://localhost:3100/execute -d '{"tool": "test"}'
```

**Solutions**:
1. **Verify Server Health**: Check if target server is running and healthy
2. **Check Network Connectivity**: Ensure orchestrator can reach the server
3. **Review Server Configuration**: Verify server endpoints and authentication
4. **Check Firewall Rules**: Ensure no firewall is blocking communication

### Lazy Loading Issues

**Symptoms**: Servers not starting automatically when needed

**Diagnosis**:
```bash
# Check lazy loader configuration
cat src/mcp-ecosystem/core/lazy_loader.js

# Verify lazy loader is running
curl http://localhost:3007/servers/compact
```

**Solutions**:
1. **Restart Lazy Loader**: Restart the lazy loader service
2. **Check Configuration**: Verify server configurations are correct
3. **Review Memory Limits**: Ensure memory limits are appropriate
4. **Check Auto-Stop Settings**: Verify idle server cleanup settings

## API Troubleshooting

### 404 Not Found Errors

**Symptoms**: API endpoints returning 404 status codes

**Diagnosis**:
```bash
# List available endpoints
curl http://localhost:3103/tools

# Check orchestrator routes
curl http://localhost:3103/
```

**Solutions**:
1. **Verify Endpoint Path**: Check that endpoint path is correct
2. **Check Service Status**: Ensure orchestrator is running
3. **Review API Documentation**: Verify endpoint exists and method is correct
4. **Check Route Configuration**: Verify route is properly defined

### 500 Internal Server Errors

**Symptoms**: API endpoints returning 500 status codes

**Diagnosis**:
```bash
# Check orchestrator logs
tail -f logs/orchestrator.log

# Enable debug mode
NODE_DEBUG=mcp* npm start
```

**Solutions**:
1. **Review Error Logs**: Check detailed error messages in logs
2. **Validate Request Format**: Ensure request body and headers are correct
3. **Check Dependencies**: Verify all required services are available
4. **Test Individual Components**: Isolate the component causing the issue

### Timeout Errors

**Symptoms**: API requests timing out before receiving response

**Diagnosis**:
```bash
# Test with longer timeout
curl --max-time 30 http://localhost:3103/health

# Check for slow operations in logs
grep -i timeout logs/*.log
```

**Solutions**:
1. **Increase Timeout Values**: Adjust timeout settings in client code
2. **Optimize Operations**: Identify and optimize slow operations
3. **Check Resource Usage**: Verify system has sufficient resources
4. **Implement Async Processing**: Use async patterns for long-running operations

## Security Issues

### Unauthorized Access

**Symptoms**: Requests failing due to authentication/authorization issues

**Solutions**:
1. **Verify Authentication**: Check if required auth headers are provided
2. **Review Security Configuration**: Verify security settings are appropriate
3. **Check Credentials**: Ensure API keys or tokens are valid and not expired
4. **Review Access Logs**: Check for suspicious access patterns

### Configuration Exposure

**Symptoms**: Sensitive information exposed in logs or responses

**Solutions**:
1. **Sanitize Logs**: Ensure sensitive data is not logged
2. **Validate Responses**: Verify responses don't contain sensitive information
3. **Review Environment Variables**: Ensure secrets are properly secured
4. **Implement Security Scanning**: Use tools to detect exposed secrets

## Recovery Procedures

### Service Recovery

**Complete Service Restart**:
```bash
# Stop all services
pm2 stop all

# Wait for services to stop
sleep 5

# Start all services
pm2 start all

# Verify all services are running
pm2 list
```

### Data Recovery

**Coordination Data Recovery**:
```bash
# Backup current coordination data
cp .llm-coordination.json .llm-coordination.json.backup

# Clean up stale coordination data
echo '{"sessions": {}, "branches": {}, "rules": {}}' > .llm-coordination.json
```

**Todo Data Recovery**:
```bash
# Backup todo data
cp -r data/shared-knowledge/.mcp-shared-knowledge data/shared-knowledge/.mcp-shared-knowledge.backup

# If needed, recreate todo directory structure
mkdir -p data/shared-knowledge/.mcp-shared-knowledge/tasks
echo '{"tasks": []}' > data/shared-knowledge/.mcp-shared-knowledge/tasks/shared_tasks.json
```

### Configuration Recovery

**Restore Default Configuration**:
```bash
# If configuration is corrupted, restore from version control
git checkout -- ecosystem.config.cjs
git checkout -- src/mcp-ecosystem/core/lazy_loader.js

# Restart services after configuration restore
pm2 restart all
```

### Complete System Recovery

**In Case of Major Issues**:
```bash
# Stop all processes
pm2 delete all

# Clean up coordination data
rm -f .llm-coordination.json
rm -f .llm-session.json

# Clean up todo data (backup first if needed)
rm -rf data/shared-knowledge/.mcp-shared-knowledge

# Reinstall dependencies
rm -rf node_modules
npm install

# Restart with fresh configuration
npm start

# Verify system is working
curl http://localhost:3103/health
```

## Support Resources

### Documentation and References
- **Main Documentation**: `docs/MCP_ECOSYSTEM_DOCUMENTATION.md`
- **API Documentation**: `docs/API_DOCUMENTATION.md`
- **Best Practices**: `docs/BEST_PRACTICES.md`
- **Architecture**: `docs/ARCHITECTURE.md`

### Community Support
- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share knowledge
- **Pull Requests**: Contribute fixes and improvements

### Diagnostic Scripts
Several diagnostic scripts are available in the tools directory:

```bash
# Run comprehensive health check
npm run docs:health

# Validate specifications
npm run docs:validate

# Run complete system check
npm run docs:check

# Run coverage analysis
npm run coverage:check
```

### Monitoring Commands
```bash
# Monitor system resources
pm2 monit

# Watch logs in real-time
pm2 logs --lines 100

# Check system metrics
npm run docs:health
```

### Emergency Contacts
In case of production issues:
- **Primary Contact**: System administrator
- **Secondary Contact**: Development team
- **Issue Tracker**: GitHub repository issues

## Preventive Maintenance

### Regular Maintenance Tasks

1. **Log Rotation**: Regularly clean up old log files
2. **Dependency Updates**: Keep dependencies up to date
3. **Security Scanning**: Regularly scan for security vulnerabilities
4. **Backup Verification**: Ensure backup procedures are working
5. **Performance Monitoring**: Regularly review performance metrics

### Monitoring Checklist

- [ ] Service health checks running regularly
- [ ] Resource usage within acceptable limits
- [ ] Error rates below threshold
- [ ] Coordination conflicts resolved promptly
- [ ] Todo completion rates monitored
- [ ] Security logs reviewed regularly
- [ ] Backup procedures tested regularly

By following this troubleshooting guide, you should be able to diagnose and resolve most common issues with the MCP Ecosystem. Remember to document any unique issues you encounter and their solutions to help future troubleshooting efforts.