# 🏗️ **OpenCode Multi-Project Implementation - Complete Guide**

## 📋 **Executive Summary**

This guide provides a **complete multi-project OpenCode implementation** that enables a single server instance to manage multiple projects and worktrees while maintaining backward compatibility.

---

## 🎯 **What We've Accomplished**

### **✅ Core Components Created**

1. **📖 API Specification** (`docs/OPENCODE_MULTI_PROJECT_API.md`)
   - Complete REST API design for multi-project support
   - Backward-compatible endpoints
   - Comprehensive data models

2. **🔧 Implementation** (`src/opencode-multi-project-extension.js`)
   - Full Express.js router implementation
   - Project and session management
   - File operations and message handling
   - Migration utilities

3. **🛠️ Management Tools** (`scripts/opencode-server-manager.js`)
   - Dynamic server discovery
   - Port mapping and health checks
   - Automated server management

4. **🚀 Demo & Testing** (`scripts/demo-multi-project-api.js`)
   - Complete API demonstration
   - Cross-project operations
   - Real-world usage examples

5. **📚 Documentation** (`OPENCODE_HEADLESS_COMMUNICATION_WORKFLOW.md`)
   - Server identification workflows
   - API usage patterns
   - Troubleshooting guides

---

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                OpenCode Server (Port 55500)              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────┐ │
│  │   Project A     │  │   Project B     │  │ Project C │ │
│  │ MCP Ecosystem   │  │ Qwen Client    │  │ Docs Site │ │
│  └─────────────────┘  └─────────────────┘  └───────────┘ │
│           │                    │                    │       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────┐ │
│  │ Sessions A1-A5  │  │ Sessions B1-B3  │  │Sessions C1│ │
│  └─────────────────┘  └─────────────────┘  └───────────┘ │
├─────────────────────────────────────────────────────────────┤
│                 Storage Layer                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│  │ Projects/   │ │ Sessions/   │ │ Messages/          │ │
│  │ proj_*.json │ │ proj_/ses_  │ │ proj_/ses_/msg_    │ │
│  └─────────────┘ └─────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 **Quick Start Guide**

### **1. Start Multi-Project OpenCode Server**

```bash
# Navigate to your project directory
cd /Users/lorenzorasmussen/.local/share/mcp

# Start OpenCode with custom port
opencode serve -p 55500 --print-logs --log-level INFO

# In another terminal, verify it's running
curl -s "http://127.0.0.1:55500/doc" | jq .title
```

### **2. Run the Demo**

```bash
# Execute the complete demo
node scripts/demo-multi-project-api.js http://127.0.0.1:55500

# Or run step by step:
node scripts/opencode-server-manager.js list
```

### **3. Create Your First Project**

```bash
curl -X POST "http://127.0.0.1:55500/project/init" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Project",
    "worktree": "/path/to/my/project",
    "metadata": {
      "description": "My awesome project",
      "tags": ["awesome", "project"]
    }
  }'
```

---

## 📊 **API Endpoints Reference**

### **Project Management**

| Method | Endpoint        | Description         |
| ------ | --------------- | ------------------- |
| `GET`  | `/project`      | List all projects   |
| `POST` | `/project/init` | Create new project  |
| `GET`  | `/project/:id`  | Get project details |

### **Session Management**

| Method   | Endpoint                                 | Description           |
| -------- | ---------------------------------------- | --------------------- |
| `GET`    | `/project/:projectId/session`            | List project sessions |
| `POST`   | `/project/:projectId/session`            | Create session        |
| `GET`    | `/project/:projectId/session/:sessionId` | Get session           |
| `DELETE` | `/project/:projectId/session/:sessionId` | Delete session        |

### **Message Operations**

| Method | Endpoint                                         | Description   |
| ------ | ------------------------------------------------ | ------------- |
| `GET`  | `/project/:projectId/session/:sessionId/message` | List messages |
| `POST` | `/project/:projectId/session/:sessionId/message` | Send message  |

### **File Operations**

| Method | Endpoint                                             | Description |
| ------ | ---------------------------------------------------- | ----------- |
| `GET`  | `/project/:projectId/session/:sessionId/find/file`   | Find files  |
| `GET`  | `/project/:projectId/session/:sessionId/file/status` | File status |

---

## 🔧 **Server Management**

### **Discover Running Servers**

```bash
# List all OpenCode servers with details
node scripts/opencode-server-manager.js list

# Manual discovery
ps aux | grep "opencode serve" | grep -v grep
lsof -p <PID> | grep LISTEN
```

### **Launch with Custom Configuration**

```bash
# Start server on specific port
opencode serve -p 55500 -h 127.0.0.1

# With logging
opencode serve -p 55500 --print-logs --log-level DEBUG

# Using the management script
./scripts/opencode-manager.sh start
```

### **Test API Connectivity**

```bash
# Test basic API
curl -s "http://127.0.0.1:55500/doc" | jq .

# Test project creation
curl -X POST "http://127.0.0.1:55500/project/init" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "worktree": "/tmp/test"}'

# List projects
curl -s "http://127.0.0.1:55500/project" | jq '.projects[] | {name, id}'
```

---

## 📁 **Storage Structure**

```
.opencode/
├── projects/
│   ├── proj_123456.json          # Project metadata
│   ├── proj_789012.json
│   └── index.json                # Project index
├── sessions/
│   ├── proj_123456/
│   │   ├── ses_abc123.json       # Session metadata
│   │   ├── ses_def456.json
│   │   └── index.json            # Session index
│   └── proj_789012/
├── messages/
│   ├── proj_123456/
│   │   ├── ses_abc123/
│   │   │   ├── msg_001.json      # Message data
│   │   │   └── msg_002.json
│   │   └── ses_def456/
│   └── proj_789012/
└── cache/
    ├── projects.cache             # Project cache
    └── sessions.cache            # Session cache
```

---

## 🔄 **Migration Strategy**

### **Phase 1: Backward Compatibility**

- Existing API endpoints continue to work
- Default project created automatically
- Gradual migration path

### **Phase 2: Project Migration**

```javascript
// Migrate existing sessions
const extension = new MultiProjectExtension();
await extension.migrateExistingSessions('/path/to/existing/sessions');
```

### **Phase 3: Enhanced Features**

- Worktree support
- Project-level permissions
- Advanced session management

---

## 🎯 **Real-World Usage Examples**

### **Development Workflow**

```bash
# 1. Create project for new feature
curl -X POST "http://127.0.0.1:55500/project/init" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Feature X",
    "worktree": "/Users/lorenzorasmussen/projects/feature-x",
    "metadata": {
      "tags": ["feature", "in-development"]
    }
  }'

# 2. Create architecture session
curl -X POST "http://127.0.0.1:55500/project/proj_123/session" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Architecture Design",
    "agent": "architecture-specialist"
  }'

# 3. Send requirements
curl -X POST "http://127.0.0.1:55500/project/proj_123/session/ses_abc/message" \
  -H "Content-Type: application/json" \
  -d '{
    "parts": [{"type": "text", "text": "Design architecture for Feature X"}],
    "agent": "architecture-specialist"
  }'
```

### **Multi-Project Management**

```bash
# List all projects with session counts
curl -s "http://127.0.0.1:55500/project" | \
  jq '.projects[] | {name: .name, sessions: .sessionCount}'

# Get active sessions across all projects
for project in $(curl -s "http://127.0.0.1:55500/project" | jq -r '.projects[].id'); do
  echo "Project $project:"
  curl -s "http://127.0.0.1:55500/project/$project/session" | \
    jq '.sessions[] | select(.status == "active") | {title: .title, agent: .agent}'
done
```

---

## 🛠️ **Integration Examples**

### **Node.js Client**

```javascript
class OpenCodeClient {
  constructor(baseURL = 'http://127.0.0.1:55500') {
    this.baseURL = baseURL;
  }

  async createProject(name, worktree) {
    const response = await fetch(`${this.baseURL}/project/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, worktree }),
    });
    return response.json();
  }

  async createSession(projectId, title, agent) {
    const response = await fetch(`${this.baseURL}/project/${projectId}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, agent }),
    });
    return response.json();
  }
}

// Usage
const client = new OpenCodeClient();
const project = await client.createProject('My Project', '/path/to/project');
const session = await client.createSession(project.id, 'Review', 'code-reviewer');
```

### **Python Client**

```python
import requests
import json

class OpenCodeClient:
    def __init__(self, base_url='http://127.0.0.1:55500'):
        self.base_url = base_url

    def create_project(self, name, worktree):
        response = requests.post(
            f'{self.base_url}/project/init',
            json={'name': name, 'worktree': worktree}
        )
        return response.json()

    def list_projects(self):
        response = requests.get(f'{self.base_url}/project')
        return response.json()

# Usage
client = OpenCodeClient()
projects = client.list_projects()
print(f"Found {projects['total']} projects")
```

---

## 🔍 **Monitoring & Debugging**

### **Health Checks**

```bash
# API Documentation
curl -s "http://127.0.0.1:55500/doc" | jq .info

# Server Status
curl -s "http://127.0.0.1:55500/project" | jq .total

# Session Activity
curl -s "http://127.0.0.1:55500/project/proj_123/session" | jq .active
```

### **Log Analysis**

```bash
# View server logs
tail -f ~/.opencode/logs/server.log

# Monitor API calls
curl -s "http://127.0.0.1:55500/log" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "service": "monitor",
    "level": "info",
    "message": "Health check completed"
  }'
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Port Already in Use**

   ```bash
   # Find what's using the port
   lsof -i :55500

   # Use different port
   opencode serve -p 55501
   ```

2. **API Not Responding**

   ```bash
   # Check if server is running
   ps aux | grep "opencode serve"

   # Test connectivity
   curl -v "http://127.0.0.1:55500/doc"
   ```

3. **Project Creation Fails**

   ```bash
   # Verify directory exists
   ls -la /path/to/project

   # Check permissions
   ls -ld /path/to/project
   ```

### **Debug Mode**

```bash
# Start with debug logging
opencode serve -p 55500 --print-logs --log-level DEBUG

# Monitor requests
curl -v "http://127.0.0.1:55500/project" 2>&1 | grep ">"
```

---

## 📈 **Performance Considerations**

### **Optimization Tips**

1. **Use Caching**: Enable built-in caching for frequent operations
2. **Batch Operations**: Group multiple API calls when possible
3. **Connection Pooling**: Reuse HTTP connections for clients
4. **Session Cleanup**: Regularly clean up old sessions

### **Monitoring Metrics**

```bash
# Track response times
time curl -s "http://127.0.0.1:55500/project" > /dev/null

# Monitor memory usage
ps aux | grep "opencode serve" | awk '{print $6}'

# Check file handles
lsof -p <PID> | wc -l
```

---

## 🎯 **Next Steps**

### **Immediate Actions**

1. **✅ Test the Demo**: Run `node scripts/demo-multi-project-api.js`
2. **✅ Create Projects**: Start with your existing projects
3. **✅ Migrate Sessions**: Use the migration utilities
4. **✅ Integrate Clients**: Update your tools to use new API

### **Future Enhancements**

1. **Web UI**: Build a dashboard for project management
2. **Authentication**: Add user management and permissions
3. **Real-time Updates**: WebSocket support for live updates
4. **Backup/Restore**: Automated project backup system
5. **Analytics**: Usage statistics and insights

---

## 📚 **Additional Resources**

### **Documentation**

- API Specification: `docs/OPENCODE_MULTI_PROJECT_API.md`
- Server Management: `OPENCODE_HEADLESS_COMMUNICATION_WORKFLOW.md`
- Implementation Details: `src/opencode-multi-project-extension.js`

### **Tools & Scripts**

- Server Manager: `scripts/opencode-server-manager.js`
- API Demo: `scripts/demo-multi-project-api.js`
- Management Script: `scripts/opencode-manager.sh`

### **Examples & Templates**

- Client Integration: See Integration Examples section
- Migration Scripts: Built into the extension
- Configuration Templates: Available in the demo

---

## 🎉 **Conclusion**

You now have a **complete multi-project OpenCode implementation** that:

- ✅ **Scales** from single to multiple projects
- ✅ **Maintains** backward compatibility
- ✅ **Provides** comprehensive API coverage
- ✅ **Includes** management and monitoring tools
- ✅ **Supports** real-world usage patterns

**🚀 Start using it today and transform your OpenCode workflow!**

---

_For support and questions, refer to the troubleshooting section or check the server logs._
