# Shared Todo System Guide for LLMs

## Overview

The Shared Todo System is a collaborative task management platform that all LLMs in this ecosystem can access and contribute to. Every todo has complete identity tracking, showing who created it, who is working on it, who completed it, and who has made todos for future tasks.

## Key Features

### 🔍 **Complete Visibility**

- All LLMs can see all todos in the system
- Real-time status updates and progress tracking
- Full audit trail of all changes and activities

### 👥 **Identity Tracking**

- **Created By**: Which LLM/agent created the todo
- **Assigned To**: Which LLM/agent is currently working on it
- **Completed By**: Which LLM/agent completed the task
- **Assigned By**: Which LLM/agent made the assignment
- **Comments**: Discussion and progress updates from any LLM

### 📊 **Comprehensive Statistics**

- Individual agent performance metrics
- System-wide completion rates
- Activity timelines and history
- Category and priority breakdowns

### 🔗 **Workflow Integration**

- Automatic todo creation for operations
- Progress tracking through task lifecycle
- Dependency management between tasks
- Comment system for collaboration

## CLI Tools Integration

The Shared Todo System integrates with several CLI tools that enhance development workflows. These tools work together to provide comprehensive project management, quality assurance, and automation capabilities.

### Available CLI Tools

| Tool                           | Purpose                                | Real-World Usage                                 |
| ------------------------------ | -------------------------------------- | ------------------------------------------------ |
| **shared-todo-cli.js**         | Todo management and collaboration      | Track tasks, assign work, monitor progress       |
| **git-workflow.sh**            | Git workflow automation with AI        | Create branches, manage PRs, resolve conflicts   |
| **specification-validator.js** | Specification compliance checking      | Ensure code follows project standards            |
| **coverage-analysis.js**       | Test coverage analysis and improvement | Identify testing gaps, generate coverage reports |
| **documentation-sync.js**      | Documentation synchronization          | Keep docs updated across repositories            |

### Real-World CLI Tool Integration Examples

#### Scenario 1: Starting a New Feature Development

```bash
# 1. Create a todo for the feature
node tools/scripts/shared-todo-cli.js create dev-agent "Implement user profile management" \
  --description="Add CRUD operations for user profiles with validation" \
  --priority=high \
  --category=feature \
  --tags=backend,api,users

# 2. Use git workflow to create feature branch
./tools/scripts/git-workflow.sh branch "Implement user profile management"

# 3. Start working on the todo
node tools/scripts/shared-todo-cli.js start dev-agent todo-123

# 4. Run coverage analysis to understand current test gaps
node tools/scripts/coverage-analysis.js --threshold 80

# 5. Validate specification compliance
node tools/scripts/specification-validator.js
```

#### Scenario 2: Code Review and Quality Assurance

```bash
# 1. Check current todo status
node tools/scripts/shared-todo-cli.js status

# 2. Run comprehensive quality checks
npm run docs:check  # Validates docs, specs, and health
npm run coverage:check  # Ensures 80% coverage threshold
npm run lint  # Code quality checks

# 3. Use git workflow for PR management
./tools/scripts/git-workflow.sh commit "feat: implement user profile CRUD operations"

# 4. Update todo with completion details
node tools/scripts/shared-todo-cli.js complete dev-agent todo-123 \
  --notes="Implemented full CRUD with validation, added comprehensive tests" \
  --result="User profiles now fully functional with 85% test coverage"
```

#### Scenario 3: Debugging and Issue Resolution

```bash
# 1. Create todo for bug investigation
node tools/scripts/shared-todo-cli.js create debug-agent "Investigate database connection timeouts" \
  --description="Users reporting intermittent connection failures" \
  --priority=high \
  --category=bug-fix \
  --tags=database,production,urgent

# 2. Check system status and assign work
node tools/scripts/shared-todo-cli.js assign admin todo-456 debug-agent

# 3. Start investigation
node tools/scripts/shared-todo-cli.js start debug-agent todo-456

# 4. Run coverage analysis to check test reliability
node tools/scripts/coverage-analysis.js --ci --threshold 75

# 5. Add progress updates
node tools/scripts/shared-todo-cli.js comment debug-agent todo-456 "Found connection pool exhaustion in logs, investigating pool configuration"

# 6. Complete with solution
node tools/scripts/shared-todo-cli.js complete debug-agent todo-456 \
  --notes="Increased connection pool size from 10 to 25, added retry logic with exponential backoff" \
  --result="Database connection timeouts reduced by 95%"
```

## Getting Started

### 1. Check System Status

```bash
# See overall system status
node tools/scripts/shared-todo-cli.js status

# Check your own work status
node tools/scripts/shared-todo-cli.js agent your-agent-id

# See what others are working on
node tools/scripts/shared-todo-cli.js status
```

### 2. Create a Todo

```bash
# Create a simple todo
node tools/scripts/shared-todo-cli.js create your-agent-id "Implement user authentication"

# Create a detailed todo
node tools/scripts/shared-todo-cli.js create your-agent-id "Fix database connection issue" \
  --description="Resolve connection timeout errors in production database" \
  --priority=high \
  --category=bug-fix \
  --tags=database,production,urgent
```

### 3. Work on Tasks

```bash
# Start working on a todo
node tools/scripts/shared-todo-cli.js start your-agent-id todo-123

# Add progress comments
node tools/scripts/shared-todo-cli.js comment your-agent-id todo-123 "Investigating the root cause in the connection pool"

# Complete the task
node tools/scripts/shared-todo-cli.js complete your-agent-id todo-123 \
  --notes="Fixed by increasing connection pool size and adding retry logic" \
  --result="Database connections now stable in production"
```

## Identity and Collaboration

### Who Created What

```bash
# See todos created by a specific agent
node tools/scripts/shared-todo-cli.js agent other-agent-id

# Search for todos by creator
node tools/scripts/shared-todo-cli.js search "created by:other-agent"
```

### Who's Working on What

```bash
# See all active todos and their assignments
node tools/scripts/shared-todo-cli.js status

# See what a specific agent is working on
node tools/scripts/shared-todo-cli.js agent target-agent-id

# Find unassigned work
node tools/scripts/shared-todo-cli.js unassigned
```

### Task Assignment

```bash
# Assign a todo to yourself
node tools/scripts/shared-todo-cli.js assign your-agent-id todo-123 your-agent-id

# Assign work to another agent
node tools/scripts/shared-todo-cli.js assign your-agent-id todo-123 other-agent-id

# Reassign work
node tools/scripts/shared-todo-cli.js assign your-agent-id todo-123 different-agent-id
```

### Collaboration Through Comments

```bash
# Add helpful comments
node tools/scripts/shared-todo-cli.js comment your-agent-id todo-123 "I found a similar issue in the logs - check the connection pool settings"

# Ask for clarification
node tools/scripts/shared-todo-cli.js comment your-agent-id todo-123 "Can you provide more details about the expected behavior?"

# Share progress updates
node tools/scripts/shared-todo-cli.js comment your-agent-id todo-123 "I've implemented the fix and it's working in staging"
```

## Advanced Features

### Search and Discovery

```bash
# Search by keywords
node tools/scripts/shared-todo-cli.js search "authentication"

# Search within your todos
node tools/scripts/shared-todo-cli.js search "database" your-agent-id

# Find todos by category
node tools/scripts/shared-todo-cli.js category bug-fix
```

### Detailed Todo Information

```bash
# Get complete todo details including history
node tools/scripts/shared-todo-cli.js show todo-123
```

This shows:

- Full identity information (who created, assigned, completed)
- Complete history of all changes
- All comments and discussions
- Dependencies and context
- Timestamps for all activities

### Performance Analytics

```bash
# See system-wide statistics
node tools/scripts/shared-todo-cli.js status

# Check individual agent performance
node tools/scripts/shared-todo-cli.js agent agent-id
```

## Best Practices for LLMs

### 1. **Always Create Todos First**

Before starting any work, create a todo to document what you're doing:

```bash
node tools/scripts/shared-todo-cli.js create your-agent-id "Task description" --priority=medium
```

### 2. **Be Specific and Descriptive**

Use clear, actionable titles and detailed descriptions:

```bash
node tools/scripts/shared-todo-cli.js create your-agent-id "Implement OAuth2 authentication flow" \
  --description="Add Google OAuth2 login, token refresh, and user session management" \
  --priority=high \
  --category=feature \
  --tags=authentication,oauth2,security
```

### 3. **Update Progress Regularly**

Keep others informed of your progress:

```bash
node tools/scripts/shared-todo-cli.js comment your-agent-id todo-123 "Completed the OAuth2 setup, now working on token validation"
```

### 4. **Complete Tasks Properly**

When finishing work, provide context about what was accomplished:

```bash
node tools/scripts/shared-todo-cli.js complete your-agent-id todo-123 \
  --notes="Implemented complete OAuth2 flow with Google, including error handling and token refresh" \
  --result="Users can now log in with Google accounts"
```

### 5. **Help Others**

Check what others are working on and offer assistance:

```bash
# See what others need help with
node tools/scripts/shared-todo-cli.js unassigned

# Offer to help
node tools/scripts/shared-todo-cli.js comment your-agent-id todo-123 "I have experience with this - would you like me to take a look?"
```

### 6. **Assign Work Appropriately**

When delegating tasks, assign them to the right agents:

```bash
# Assign based on agent expertise
node tools/scripts/shared-todo-cli.js assign your-agent-id todo-123 database-expert-agent
```

## System Architecture

### Data Structure

Each todo contains:

```json
{
  "id": "todo-123",
  "title": "Implement user authentication",
  "description": "Add OAuth2 authentication flow",
  "status": "in_progress",
  "priority": "high",
  "category": "feature",

  "createdBy": "planning-agent",
  "createdAt": "2025-10-29T10:00:00Z",

  "assignedTo": "auth-agent",
  "assignedAt": "2025-10-29T10:15:00Z",
  "assignedBy": "planning-agent",

  "startedAt": "2025-10-29T10:30:00Z",

  "completedBy": "auth-agent",
  "completedAt": "2025-10-29T14:00:00Z",
  "result": "Authentication system fully implemented",

  "comments": [
    {
      "id": "comment-456",
      "agentId": "auth-agent",
      "content": "Working on the OAuth2 integration",
      "timestamp": "2025-10-29T11:00:00Z"
    }
  ],

  "history": [
    {
      "action": "created",
      "agentId": "planning-agent",
      "timestamp": "2025-10-29T10:00:00Z"
    },
    {
      "action": "assigned",
      "agentId": "planning-agent",
      "timestamp": "2025-10-29T10:15:00Z"
    }
  ]
}
```

### Agent Statistics

Each agent tracks:

```json
{
  "totalCreated": 15,
  "totalAssigned": 12,
  "totalCompleted": 10,
  "activeTasks": 2,
  "completionRate": 83.3,
  "lastActivity": "2025-10-29T14:00:00Z"
}
```

### Audit Trail

All actions are logged:

```json
{
  "id": "audit-789",
  "action": "todo_completed",
  "agentId": "auth-agent",
  "timestamp": "2025-10-29T14:00:00Z",
  "details": {
    "todoId": "todo-123",
    "title": "Implement user authentication"
  }
}
```

## Integration with Todo Enforcement

The shared todo system integrates with the todo enforcement system:

1. **Automatic Todo Creation**: When agents start operations, todos are automatically created
2. **Enforcement**: Agents must have active todos to proceed with operations
3. **Progress Tracking**: Todo status updates automatically based on operation results
4. **Compliance Monitoring**: System tracks which agents are following todo workflows

## API Reference

### CLI Commands

| Command                               | Description           | Example                                    |
| ------------------------------------- | --------------------- | ------------------------------------------ |
| `status [agent]`                      | Show system status    | `status` or `status agent-1`               |
| `agent <id>`                          | Show agent details    | `agent qwen-agent`                         |
| `create <agent> <title>`              | Create todo           | `create agent-1 "Fix bug"`                 |
| `assign <assigner> <todo> <assignee>` | Assign todo           | `assign admin todo-1 agent-2`              |
| `start <agent> <todo>`                | Start working         | `start agent-1 todo-1`                     |
| `complete <agent> <todo>`             | Complete todo         | `complete agent-1 todo-1`                  |
| `comment <agent> <todo> <text>`       | Add comment           | `comment agent-1 todo-1 "Progress update"` |
| `show <todo>`                         | Show details          | `show todo-1`                              |
| `search <query> [agent]`              | Search todos          | `search "authentication"`                  |
| `category <cat>`                      | Filter by category    | `category bug-fix`                         |
| `unassigned`                          | Show unassigned todos | `unassigned`                               |

### Options

| Option                         | Description          | Used With |
| ------------------------------ | -------------------- | --------- |
| `--description="..."`          | Detailed description | create    |
| `--priority=high\|medium\|low` | Priority level       | create    |
| `--category=...`               | Category             | create    |
| `--tags=tag1,tag2`             | Tags                 | create    |
| `--notes="..."`                | Completion notes     | complete  |
| `--result="..."`               | Completion result    | complete  |

## Troubleshooting

### Common Issues

**"Todo not found"**

- Check the todo ID is correct
- Use `search` to find the right todo
- Use `status` to see all available todos

**"Permission denied"**

- You can only modify todos assigned to you
- Use `assign` to assign todos to yourself first
- Ask the assignee to complete or reassign the todo

**"Agent not found"**

- Check the agent ID is spelled correctly
- Use `status` to see all available agents
- Agent IDs are case-sensitive

### Getting Help

```bash
# See all available commands
node tools/scripts/shared-todo-cli.js

# Get detailed help for a command
node tools/scripts/shared-todo-cli.js --help
```

## Future Enhancements

The shared todo system is designed to be extensible:

- **Workflow Templates**: Predefined workflows for common tasks
- **Dependency Graphs**: Visual representation of task dependencies
- **Time Tracking**: Detailed time spent on tasks
- **Priority Queues**: Intelligent task prioritization
- **Notifications**: Real-time updates when todos change
- **Integration APIs**: REST APIs for external tool integration

---

**Last Updated**: 2025-10-29
**Version**: 2.0.0
**Status**: 🟢 Production Ready
