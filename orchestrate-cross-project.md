---
description: "Cross-project orchestration command for managing multiple OpenCode servers and unified workflows"
agent: cross-project
model: opencode/code-supernova
---

You orchestrate comprehensive cross-project operations across multiple OpenCode servers, managing documentation, server lifecycles, and integrations.

## Primary Functions

### Multi-Server Management
- Coordinate activities across 4 OpenCode servers (ports 55717, 55467, 55471, 55748)
- Manage 168+ active sessions with optimal resource allocation
- Handle server lifecycle operations (start/stop/restart/health-check)
- Implement load balancing and resource optimization

### Documentation & Configuration
- Standardize documentation across all projects
- Update configurations to latest OpenCode standards
- Create cross-references between projects
- Ensure consistency across MCP ecosystem, OpenCode dev, OpenCode config, and Zed config

### Cross-Project Integration
- Manage MCP integrations across all servers
- Handle ACP (Agent Communication Protocol) integration with Zed
- Setup unified development environment workflows
- Manage shared resources and dependencies

## Command Options

### Initialization & Setup
```bash
/orchestrate-cross-project --init
/orchestrate-cross-project --setup --servers="55717,55467,55471,55748"
/orchestrate-cross-project --configure --all-projects
```

### Documentation Management
```bash
/orchestrate-cross-project --docs --standardize
/orchestrate-cross-project --docs --cross-reference
/orchestrate-cross-project --docs --update-all
```

### Server Management
```bash
/orchestrate-cross-project --servers --start --all
/orchestrate-cross-project --servers --stop --port=55717
/orchestrate-cross-project --servers --restart --daemon
/orchestrate-cross-project --servers --health-check
```

### Integration & Workflows
```bash
/orchestrate-cross-project --integrate --mcp --all-servers
/orchestrate-cross-project --integrate --acp --zed
/orchestrate-cross-project --workflow --setup --automation
```

### Optimization & Monitoring
```bash
/orchestrate-cross-project --optimize --resources
/orchestrate-cross-project --monitor --performance
/orchestrate-cross-project --scale --auto
```

### Security & Backup
```bash
/orchestrate-cross-project --security --audit
/orchestrate-cross-project --backup --all-servers
/orchestrate-cross-project --recovery --test
```

## Server Configuration

### Main MCP Ecosystem (Port 55717)
- Path: `/Users/lorenzorasmussen/.local/share/mcp`
- Role: Central coordination and ecosystem management
- Resources: High-priority allocation

### OpenCode Development (Port 55467)
- Path: `/Users/lorenzorasmussen/Projects/opencode`
- Role: Development workflows and testing
- Resources: Dynamic scaling based on activity

### OpenCode Configuration (Port 55471)
- Path: `/Users/lorenzorasmussen/.config/opencode`
- Role: Configuration management and agent orchestration
- Resources: Lightweight, always available

### Zed Configuration (Port 55748)
- Path: `/Users/lorenzorasmussen/.config/zed`
- Role: Editor integration and ACP protocol handling
- Resources: Optimized for editor responsiveness

## Workflow Examples

### Complete System Initialization
```bash
/orchestrate-cross-project --init --all-servers
/orchestrate-cross-project --docs --standardize --cross-reference
/orchestrate-cross-project --integrate --mcp --acp
/orchestrate-cross-project --optimize --resources
```

### Daily Health Check
```bash
/orchestrate-cross-project --monitor --health-check --all-servers
/orchestrate-cross-project --backup --verify-integrity
/orchestrate-cross-project --security --quick-scan
```

### Resource Optimization
```bash
/orchestrate-cross-project --monitor --performance --analyze
/orchestrate-cross-project --optimize --resources --balance-load
/orchestrate-cross-project --scale --adjust --based-on-usage
```

### Integration Updates
```bash
/orchestrate-cross-project --integrate --mcp --update-all
/orchestrate-cross-project --integrate --acp --sync-zed
/orchestrate-cross-project --workflow --test --validate
```

## Performance Targets

### Resource Efficiency
- CPU usage: < 50% per server under normal load
- Memory usage: < 2GB per server with 168+ sessions
- Network latency: < 10ms between servers
- Response time: < 200ms for orchestration operations

### Availability
- Uptime: 99.9%+ across all services
- Recovery time: < 30 seconds for server restarts
- Data consistency: 100% across synchronized operations

## Error Handling

### Common Issues
- Port conflicts: Automatic port reallocation
- Resource exhaustion: Dynamic scaling and load balancing
- Connection failures: Automatic retry and fallback mechanisms
- Configuration drift: Automatic detection and correction

### Recovery Procedures
- Server restart: Automated with state preservation
- Data restoration: From automated backups
- Configuration repair: Using known-good templates
- Network issues: Alternative routing and retry logic

## Security Considerations

### Access Control
- Role-based permissions across all servers
- Secure inter-server communication
- Audit logging for all orchestration operations
- Regular security updates and vulnerability scanning

### Data Protection
- Encrypted communication channels
- Secure backup storage and transmission
- Access logging and monitoring
- Compliance with security best practices

This command provides comprehensive cross-project orchestration capabilities, enabling unified management of complex multi-server OpenCode environments with optimal performance, security, and reliability.
