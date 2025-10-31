# 🏗️ **OpenCode Multi-Project API Specification**

## 📋 **Overview**

Extend OpenCode to support **multiple projects and worktrees** with a single server instance, enabling better resource management and session organization.

---

## 🎯 **Design Goals**

1. **Single Server Instance**: One OpenCode server manages multiple projects
2. **Project Isolation**: Each project has its own sessions and context
3. **Worktree Support**: Multiple worktrees per project for different branches/environments
4. **Resource Efficiency**: Shared resources across projects while maintaining isolation
5. **Backward Compatibility**: Existing API continues to work with default project

---

## 🏗️ **API Architecture**

### **Project Management**

#### `GET /project`

**Description**: List all registered projects

**Response**:

```json
{
  "projects": [
    {
      "id": "proj_123456",
      "name": "MCP Ecosystem",
      "worktree": "/Users/lorenzorasmussen/.local/share/mcp",
      "vcs": "git",
      "branch": "main",
      "createdAt": "2025-10-31T03:07:20.201Z",
      "lastAccessed": "2025-10-31T15:30:45.123Z",
      "sessionCount": 15,
      "status": "active",
      "metadata": {
        "description": "Main MCP ecosystem project",
        "tags": ["mcp", "ecosystem", "production"]
      }
    },
    {
      "id": "proj_789012",
      "name": "Qwen Client",
      "worktree": "/Users/lorenzorasmussen/projects/qwen-client",
      "vcs": "git",
      "branch": "develop",
      "createdAt": "2025-10-30T10:15:30.456Z",
      "lastAccessed": "2025-10-31T14:22:10.789Z",
      "sessionCount": 8,
      "status": "active",
      "metadata": {
        "description": "Qwen MCP client implementation",
        "tags": ["qwen", "client", "mcp"]
      }
    }
  ],
  "total": 2,
  "active": 2
}
```

#### `POST /project/init`

**Description**: Initialize a new project

**Request Body**:

```json
{
  "name": "New Project",
  "worktree": "/path/to/project",
  "vcs": "git",
  "branch": "main",
  "metadata": {
    "description": "Project description",
    "tags": ["tag1", "tag2"],
    "settings": {
      "defaultProvider": "openai",
      "defaultModel": "gpt-4"
    }
  }
}
```

**Response**:

```json
{
  "id": "proj_345678",
  "name": "New Project",
  "worktree": "/path/to/project",
  "vcs": "git",
  "branch": "main",
  "createdAt": "2025-10-31T16:00:00.000Z",
  "status": "initialized",
  "metadata": {
    "description": "Project description",
    "tags": ["tag1", "tag2"],
    "settings": {
      "defaultProvider": "openai",
      "defaultModel": "gpt-4"
    }
  }
}
```

---

### **Session Management (Project-Scoped)**

#### `GET /project/:projectID/session`

**Description**: List all sessions for a specific project

**Response**:

```json
{
  "sessions": [
    {
      "id": "ses_abc123",
      "title": "Architecture Review",
      "projectID": "proj_123456",
      "parentID": null,
      "directory": "/Users/lorenzorasmussen/.local/share/mcp",
      "createdAt": "2025-10-31T03:07:20.201Z",
      "updatedAt": "2025-10-31T15:30:45.123Z",
      "status": "active",
      "messageCount": 25,
      "agent": "architecture-specialist",
      "model": {
        "providerID": "openai",
        "modelID": "gpt-4"
      }
    }
  ],
  "total": 1,
  "active": 1
}
```

#### `POST /project/:projectID/session`

**Description**: Create a new session within a project

**Request Body**:

```json
{
  "id": "ses_def456",
  "parentID": "ses_abc123",
  "directory": "/Users/lorenzorasmussen/.local/share/mcp",
  "title": "Follow-up Architecture Review",
  "agent": "code-reviewer",
  "model": {
    "providerID": "anthropic",
    "modelID": "claude-3-sonnet"
  },
  "system": "You are a senior code reviewer...",
  "metadata": {
    "priority": "high",
    "tags": ["architecture", "review"]
  }
}
```

**Response**:

```json
{
  "id": "ses_def456",
  "title": "Follow-up Architecture Review",
  "projectID": "proj_123456",
  "parentID": "ses_abc123",
  "directory": "/Users/lorenzorasmussen/.local/share/mcp",
  "createdAt": "2025-10-31T16:15:00.000Z",
  "status": "active",
  "agent": "code-reviewer",
  "model": {
    "providerID": "anthropic",
    "modelID": "claude-3-sonnet"
  }
}
```

#### `GET /project/:projectID/session/:sessionID`

**Description**: Get detailed session information

**Response**:

```json
{
  "id": "ses_abc123",
  "title": "Architecture Review",
  "projectID": "proj_123456",
  "parentID": null,
  "directory": "/Users/lorenzorasmussen/.local/share/mcp",
  "createdAt": "2025-10-31T03:07:20.201Z",
  "updatedAt": "2025-10-31T15:30:45.123Z",
  "status": "active",
  "messageCount": 25,
  "agent": "architecture-specialist",
  "model": {
    "providerID": "openai",
    "modelID": "gpt-4"
  },
  "system": "You are a senior software architect...",
  "metadata": {
    "priority": "high",
    "tags": ["architecture", "review"],
    "duration": "2h 23m"
  },
  "children": ["ses_def456", "ses_ghi789"],
  "permissions": {
    "canEdit": true,
    "canShare": true,
    "canDelete": true
  }
}
```

---

### **Session Operations**

#### `POST /project/:projectID/session/:sessionID/init`

**Description**: Initialize session with project analysis

**Request Body**:

```json
{
  "modelID": "gpt-4",
  "providerID": "openai",
  "messageID": "msg_init123"
}
```

#### `POST /project/:projectID/session/:sessionID/abort`

**Description**: Abort running session

#### `POST /project/:projectID/session/:sessionID/share`

**Description**: Share session with link

**Response**:

```json
{
  "shared": true,
  "shareURL": "https://opencode.dev/shared/ses_abc123",
  "expiresAt": "2025-11-30T16:15:00.000Z"
}
```

#### `DELETE /project/:projectID/session/:sessionID/share`

**Description**: Unshare session

#### `POST /project/:projectID/session/:sessionID/compact`

**Description**: Compact session history

**Response**:

```json
{
  "compacted": true,
  "messagesRemoved": 15,
  "messagesRemaining": 10,
  "sizeReduced": "65%"
}
```

---

### **Message Management**

#### `GET /project/:projectID/session/:sessionID/message`

**Description**: Get all messages in session

**Response**:

```json
{
  "messages": [
    {
      "info": {
        "id": "msg_123",
        "role": "user",
        "createdAt": "2025-10-31T16:00:00.000Z",
        "sessionID": "ses_abc123"
      },
      "parts": [
        {
          "type": "text",
          "text": "Review the architecture..."
        }
      ]
    }
  ],
  "total": 25,
  "hasMore": true
}
```

#### `POST /project/:projectID/session/:sessionID/message`

**Description**: Send message to session

**Request Body**:

```json
{
  "parts": [
    {
      "type": "text",
      "text": "What do you think about this approach?"
    }
  ],
  "model": {
    "providerID": "openai",
    "modelID": "gpt-4"
  },
  "agent": "architecture-specialist",
  "noReply": false,
  "tools": {
    "file_read": true,
    "bash": true
  }
}
```

---

### **File Operations (Session-Scoped)**

#### `GET /project/:projectID/session/:sessionID/find/file`

**Description**: Find files within session context

**Query Parameters**:

- `query`: Search query
- `pattern`: File pattern (optional)
- `caseSensitive`: Case sensitivity (default: false)

**Response**:

```json
{
  "files": ["/src/qwen-client/server-index.js", "/src/qwen-client/context-manager.js"],
  "total": 2,
  "searchTime": "45ms"
}
```

#### `GET /project/:projectID/session/:sessionID/file`

**Description**: Get file content

**Query Parameters**:

- `path`: File path
- `type`: Return type ("raw" | "patch", default: "raw")

**Response**:

```json
{
  "type": "raw",
  "content": "file content here...",
  "path": "/src/qwen-client/server-index.js",
  "size": 1024,
  "lastModified": "2025-10-31T15:30:45.123Z"
}
```

#### `GET /project/:projectID/session/:sessionID/file/status`

**Description**: Get file status within session

**Response**:

```json
{
  "files": [
    {
      "path": "/src/qwen-client/server-index.js",
      "status": "modified",
      "staged": true,
      "changes": 15,
      "additions": 10,
      "deletions": 5
    }
  ],
  "total": 1,
  "modified": 1,
  "staged": 1
}
```

---

### **Configuration & Providers**

#### `GET /provider?directory=<resolve path>`

**Description**: Get available providers for directory

**Response**:

```json
{
  "providers": [
    {
      "id": "openai",
      "name": "OpenAI",
      "models": [
        {
          "id": "gpt-4",
          "name": "GPT-4",
          "contextWindow": 8192,
          "pricing": { "input": 0.03, "output": 0.06 }
        }
      ]
    }
  ],
  "default": "openai"
}
```

#### `GET /config?directory=<resolve path>`

**Description**: Get configuration for directory

**Response**:

```json
{
  "project": {
    "id": "proj_123456",
    "name": "MCP Ecosystem"
  },
  "settings": {
    "defaultProvider": "openai",
    "defaultModel": "gpt-4",
    "autoSave": true,
    "theme": "dark"
  },
  "mcp": {
    "servers": ["qwen-client", "context7"],
    "enabled": true
  }
}
```

#### `GET /project/:projectID/agent?directory=<resolve path>`

**Description**: Get available agents for project

**Response**:

```json
{
  "agents": [
    {
      "id": "architecture-specialist",
      "name": "Architecture Specialist",
      "description": "Specializes in software architecture",
      "capabilities": ["code-review", "design", "analysis"]
    }
  ],
  "default": "general"
}
```

---

## 🔧 **Implementation Strategy**

### **Data Model**

```typescript
interface Project {
  id: string;
  name: string;
  worktree: string;
  vcs: 'git' | 'svn' | 'none';
  branch: string;
  createdAt: string;
  lastAccessed: string;
  sessionCount: number;
  status: 'active' | 'archived' | 'suspended';
  metadata: {
    description?: string;
    tags: string[];
    settings: Record<string, any>;
  };
}

interface Session {
  id: string;
  title: string;
  projectID: string;
  parentID?: string;
  directory: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'aborted';
  messageCount: number;
  agent?: string;
  model?: {
    providerID: string;
    modelID: string;
  };
  system?: string;
  metadata: Record<string, any>;
  children: string[];
  permissions: {
    canEdit: boolean;
    canShare: boolean;
    canDelete: boolean;
  };
}
```

### **Storage Architecture**

```
.opencode/
├── projects/
│   ├── proj_123456.json
│   ├── proj_789012.json
│   └── index.json
├── sessions/
│   ├── proj_123456/
│   │   ├── ses_abc123.json
│   │   ├── ses_def456.json
│   │   └── index.json
│   └── proj_789012/
├── messages/
│   ├── proj_123456/
│   │   ├── ses_abc123/
│   │   │   ├── msg_001.json
│   │   │   └── msg_002.json
│   │   └── ses_def456/
│   └── proj_789012/
└── cache/
    ├── projects.cache
    └── sessions.cache
```

---

## 🚀 **Migration Path**

### **Phase 1: Backward Compatibility**

- Maintain existing API endpoints
- Add project-scoped endpoints alongside
- Default project for existing sessions

### **Phase 2: Project Migration**

- Auto-create projects from existing directories
- Migrate existing sessions to project structure
- Update UI to support project selection

### **Phase 3: Enhanced Features**

- Worktree support per project
- Project-level settings and permissions
- Advanced session management

---

## 📊 **Usage Examples**

### **Initialize Multi-Project Setup**

```bash
# Start OpenCode with multi-project support
opencode serve -p 55500 --multi-project

# Initialize first project
curl -X POST "http://127.0.0.1:55500/project/init" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MCP Ecosystem",
    "worktree": "/Users/lorenzorasmussen/.local/share/mcp",
    "metadata": {
      "description": "Main MCP ecosystem",
      "tags": ["mcp", "production"]
    }
  }'

# Create session in project
curl -X POST "http://127.0.0.1:55500/project/proj_123456/session" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Architecture Review",
    "agent": "architecture-specialist"
  }'
```

### **Cross-Project Operations**

```bash
# List all projects
curl -s "http://127.0.0.1:55500/project" | jq '.projects[] | {id, name, sessionCount}'

# Get sessions for specific project
curl -s "http://127.0.0.1:55500/project/proj_123456/session" | jq '.sessions[] | {id, title, status}'

# Send message to project session
curl -X POST "http://127.0.0.1:55500/project/proj_123456/session/ses_abc123/message" \
  -H "Content-Type: application/json" \
  -d '{
    "parts": [{"type": "text", "text": "Review this architecture"}],
    "model": {"providerID": "openai", "modelID": "gpt-4"}
  }'
```

---

## 🎯 **Benefits**

1. **Resource Efficiency**: Single server instance manages multiple projects
2. **Better Organization**: Clear separation between projects and sessions
3. **Scalability**: Easy to add new projects without new servers
4. **Consistency**: Unified API across all projects
5. **Flexibility**: Support for different worktrees and branches
6. **Backward Compatibility**: Existing integrations continue to work

---

**🏗️ This multi-project API design enables OpenCode to scale from single-project usage to enterprise-level multi-project management while maintaining simplicity and backward compatibility!**
