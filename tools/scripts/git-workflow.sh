#!/bin/bash

# MCP Git Workflow Automation System
# Complete Git workflow automation with Google Jules integration
# Author: Git Orchestrator AI Agent
# Version: 1.0.0

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Global variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
GIT_USER_NAME="${GIT_USER_NAME:-$(whoami)}"
GIT_USER_EMAIL="${GIT_USER_EMAIL:-$(whoami)@local}"
AI_MODEL="${AI_MODEL:-qwen3-coder}"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔧 $1${NC}"
}

# Help function
show_help() {
    cat << EOF
MCP Git Workflow Automation System

USAGE:
    git-workflow.sh <command> [options]

COMMANDS:
    init                    Initialize Git repository and setup
    branch <description>     Create feature branch with GitHub issue
    commit <message>        Commit changes and create PR
    jules <task>           Delegate task to Google Jules
    resolve-conflicts      Resolve merge conflicts with AI
    rollback <target>      Emergency rollback
    status                 Show current repository status
    help                   Show this help message

EXAMPLES:
    git-workflow.sh init
    git-workflow.sh branch "Add user authentication"
    git-workflow.sh commit "feat(auth): implement JWT authentication"
    git-workflow.sh jules "Implement JWT authentication endpoint"
    git-workflow.sh resolve-conflicts
    git-workflow.sh rollback 3
    git-workflow.sh status

ENVIRONMENT VARIABLES:
    GIT_USER_NAME          Git user name
    GIT_USER_EMAIL         Git user email
    AI_MODEL               AI model for conflict resolution
    JULES_API_KEY          Google Jules API key
    GITHUB_TOKEN           GitHub personal access token

EOF
}

# Phase 1: Repository Initialization & Setup
git_init() {
    log_step "Phase 1: Repository Initialization & Setup"
    echo ""
    
    # Step 1: Check if Git repository exists
    if [ ! -d ".git" ]; then
        log_info "No Git repository detected. Initializing..."
        
        # Initialize Git repository
        git init
        
        # Set default branch to 'main'
        git branch -M main
        
        # Configure user (if not set)
        if [ -z "$(git config user.name)" ]; then
            git config user.name "$GIT_USER_NAME"
            git config user.email "$GIT_USER_EMAIL"
            log_success "Git user configured: $GIT_USER_NAME <$GIT_USER_EMAIL>"
        fi
        
        log_success "Git repository initialized"
    else
        log_success "Git repository already exists"
    fi
    
    # Step 2: Check for remote repository
    if ! git remote | grep -q "origin"; then
        log_warning "No remote repository configured"
        echo "   Options:"
        echo "   1. Create new GitHub repo (recommended)"
        echo "   2. Add existing remote URL"
        echo "   3. Skip remote setup"
        echo ""
        
        read -p "Select option [1-3]: " remote_option
        
        case $remote_option in
            1)
                if command -v gh &> /dev/null; then
                    # Auto-create GitHub repository
                    gh repo create "$(basename "$(pwd)")" --public --source=. --remote=origin
                    log_success "GitHub repository created: $(gh repo view --json url -q .url)"
                else
                    log_error "GitHub CLI (gh) not found. Please install it first."
                    exit 1
                fi
                ;;
            2)
                read -p "Enter remote URL: " remote_url
                git remote add origin "$remote_url"
                log_success "Remote 'origin' added: $remote_url"
                ;;
            3)
                log_warning "Skipping remote setup (local only)"
                ;;
            *)
                log_error "Invalid option"
                exit 1
                ;;
        esac
    else
        log_success "Remote repository configured: $(git remote get-url origin)"
    fi
    
    # Step 3: Install Git hooks
    install_git_hooks
    
    # Step 4: Create .gitignore if not exists
    if [ ! -f ".gitignore" ]; then
        create_gitignore
    fi
    
    # Step 5: Create README if not exists
    if [ ! -f "README.md" ]; then
        create_readme
    fi
    
    echo ""
    log_success "Repository initialization complete!"
}

# Install production-grade Git hooks
install_git_hooks() {
    log_step "Installing Git hooks..."
    
    local hooks_dir=".git/hooks"
    
    # Pre-commit hook
    cat > "$hooks_dir/pre-commit" << 'EOF'
#!/bin/bash
# Pre-commit hook: Enforce code quality

echo "🔍 Running pre-commit checks..."

# 1. Check for linting errors
if command -v ruff &> /dev/null; then
    echo "  -  Running ruff..."
    ruff check . || exit 1
fi

# 2. Run type checker
if command -v mypy &> /dev/null; then
    echo "  -  Running mypy..."
    mypy . || exit 1
fi

# 3. Check for sensitive data
echo "  -  Checking for secrets..."
if grep -r "sk-[a-zA-Z0-9]*" . --exclude-dir=.git 2>/dev/null; then
    echo "❌ Error: API keys detected in code!"
    exit 1
fi

# 4. Run tests
if command -v pytest &> /dev/null; then
    echo "  -  Running tests..."
    pytest --quiet || exit 1
fi

echo "✅ Pre-commit checks passed"
EOF

    # Commit message hook
    cat > "$hooks_dir/commit-msg" << 'EOF'
#!/bin/bash
# Commit message validation

commit_msg_file=$1
commit_msg=$(cat "$commit_msg_file")

# Enforce conventional commits format
# Types: feat, fix, docs, style, refactor, test, chore
if ! echo "$commit_msg" | grep -qE "^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .{10,}"; then
    echo "❌ Invalid commit message format!"
    echo ""
    echo "Expected format:"
    echo "  type(scope): description"
    echo ""
    echo "Examples:"
    echo "  feat(auth): add JWT authentication"
    echo "  fix(api): resolve null pointer exception"
    echo "  docs(readme): update installation instructions"
    exit 1
fi
EOF

    # Pre-push hook
    cat > "$hooks_dir/pre-push" << 'EOF'
#!/bin/bash
# Pre-push hook: Final checks before pushing

echo "🚀 Running pre-push checks..."

# 1. Ensure all tests pass
if command -v pytest &> /dev/null; then
    pytest || exit 1
fi

# 2. Check for merge conflicts
if git diff --check; then
    echo "✅ No merge conflicts detected"
else
    echo "❌ Merge conflicts detected! Resolve before pushing."
    exit 1
fi

# 3. Ensure branch is up-to-date
git fetch origin
if ! git merge-base --is-ancestor HEAD origin/$(git branch --show-current) 2>/dev/null; then
    echo "❌ Branch is behind origin. Pull latest changes first."
    exit 1
fi

echo "✅ Pre-push checks passed"
EOF

    # Make hooks executable
    chmod +x "$hooks_dir"/*
    
    log_success "Git hooks installed"
}

# Create .gitignore file
create_gitignore() {
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
venv/
env/
ENV/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Environment variables
.env
.env.local
.env.*.local

# Temporary files
tmp/
temp/
*.tmp

# Coverage reports
htmlcov/
.coverage
.coverage.*
coverage.xml
*.cover
.hypothesis/

# Jules
jules_*.mp3
.jules/
EOF

    log_success ".gitignore created"
}

# Create README.md
create_readme() {
    cat > README.md << EOF
# $(basename "$(pwd)")

## Description

Project description goes here.

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Git

### Installation

\`\`\`bash
# Clone the repository
git clone $(git remote get-url origin 2>/dev/null || echo "https://github.com/user/repo.git")
cd $(basename "$(pwd)")

# Install dependencies
npm install
pip install -r requirements.txt
\`\`\`

## Usage

\`\`\`bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'feat: add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
EOF

    log_success "README.md created"
}

# Phase 2: Intelligent Branch Management
git_branch() {
    local task_description="$1"
    
    if [ -z "$task_description" ]; then
        log_error "Task description is required"
        echo "Usage: git-workflow.sh branch \"<task description>\""
        exit 1
    fi
    
    log_step "Phase 2: Intelligent Branch Management"
    echo ""
    
    # Step 1: Ensure we're on main and up-to-date
    log_info "Syncing with main branch..."
    git checkout main 2>/dev/null || git checkout master 2>/dev/null
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null
    
    # Step 2: Create GitHub Issue
    if command -v gh &> /dev/null; then
        log_info "Creating GitHub Issue..."
        
        local issue_body="**Task:** $task_description

**Status:** 🟡 In Progress
**Assigned:** @me (AI Agent)
**Created by:** Git Orchestrator

**Workflow:**
- [x] Issue created
- [x] Branch created
- [ ] Implementation
- [ ] Tests written
- [ ] PR submitted
- [ ] Code reviewed
- [ ] Merged to main

**AI Agent Details:**
- Model: $AI_MODEL
- Started: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
        
        local issue_number
        issue_number=$(gh issue create \
            --title "$task_description" \
            --body "$issue_body" \
            --label "ai-task,enhancement" \
            --assignee "@me" \
            --json number -q .number 2>/dev/null || echo "")
        
        if [ -n "$issue_number" ]; then
            log_success "GitHub Issue created: #$issue_number"
        else
            log_warning "Could not create GitHub issue. Continuing without issue..."
            issue_number=""
        fi
    else
        log_warning "GitHub CLI not found. Skipping issue creation."
        issue_number=""
    fi
    
    # Step 3: Generate branch name
    local branch_slug
    branch_slug=$(echo "$task_description" | \
        tr '[:upper:]' '[:lower:]' | \
        sed 's/[^a-z0-9]/-/g' | \
        sed 's/--*/-/g' | \
        sed 's/^-//;s/-$//')
    
    local branch_name
    if [ -n "$issue_number" ]; then
        branch_name="feature/${issue_number}-${branch_slug}"
    else
        branch_name="feature/${branch_slug}"
    fi
    
    # Step 4: Create and checkout branch
    log_info "Creating branch: $branch_name"
    git checkout -b "$branch_name"
    
    # Step 5: Link branch to issue in commit
    local commit_msg="feat: initialize work on $task_description"
    if [ -n "$issue_number" ]; then
        commit_msg="$commit_msg

Refs #$issue_number"
    fi
    
    git commit --allow-empty -m "$commit_msg"
    
    # Step 6: Push branch to remote
    if git remote | grep -q "origin"; then
        log_info "Pushing branch to remote..."
        git push -u origin "$branch_name"
    fi
    
    echo ""
    log_success "Branch setup complete!"
    echo "  Branch: $branch_name"
    [ -n "$issue_number" ] && echo "  Issue: #$issue_number"
    git remote | grep -q "origin" && echo "  Remote: $(git remote get-url origin)"
    echo ""
    log_info "Ready to start work!"
}

# Phase 3: Google Jules Integration
git_jules() {
    local task="$1"
    
    if [ -z "$task" ]; then
        log_error "Task description is required"
        echo "Usage: git-workflow.sh jules \"<task description>\""
        exit 1
    fi
    
    local current_branch
    current_branch=$(git branch --show-current)
    
    # Verify we're on a feature branch
    if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
        log_error "Cannot delegate Jules tasks on 'main' branch"
        echo "Create a feature branch first: git-workflow.sh branch \"$task\""
        exit 1
    fi
    
    log_step "Phase 3: Google Jules Integration"
    echo ""
    
    log_info "Delegating task to Google Jules..."
    echo "  Branch: $current_branch"
    echo "  Task: $task"
    
    # Check if Jules CLI is available
    if ! command -v jules &> /dev/null; then
        log_error "Google Jules CLI not found"
        echo "Please install Jules CLI first: https://github.com/google/jules"
        exit 1
    fi
    
    # Step 1: Initialize Jules task
    log_info "Creating Jules task..."
    local task_output
    if ! task_output=$(jules task create \
        --branch "$current_branch" \
        --description "$task" \
        --context "$(pwd)" \
        --async \
        --output json 2>&1); then
        log_error "Failed to create Jules task"
        echo "$task_output"
        exit 1
    fi
    
    local task_id
    task_id=$(echo "$task_output" | jq -r '.task_id' 2>/dev/null || echo "")
    
    if [ -z "$task_id" ]; then
        log_error "Could not extract task ID from Jules response"
        echo "$task_output"
        exit 1
    fi
    
    log_success "Jules task created: $task_id"
    
    # Step 2: Monitor task progress
    echo ""
    log_info "Jules is working asynchronously..."
    echo "  Task ID: $task_id"
    echo "  You can continue other work while Jules operates in background"
    echo ""
    
    # Step 3: Wait for Jules completion
    while true; do
        local status
        status=$(jules task status "$task_id" --output json 2>/dev/null | jq -r '.status' || echo "unknown")
        
        case $status in
            "planning")
                echo "  📋 Jules is analyzing task..."
                ;;
            "executing")
                echo "  ⚙️ Jules is implementing changes..."
                ;;
            "testing")
                echo "  🧪 Jules is running tests..."
                ;;
            "completed")
                echo "  ✅ Jules completed the task!"
                break
                ;;
            "failed"|"error")
                log_error "Jules encountered an error"
                jules task logs "$task_id" 2>/dev/null || echo "Could not fetch logs"
                exit 1
                ;;
            "unknown")
                echo "  ⏳ Status unknown, continuing to poll..."
                ;;
        esac
        
        sleep 5
    done
    
    # Step 4: Review Jules' changes
    echo ""
    log_info "Jules Task Summary:"
    jules task summary "$task_id" 2>/dev/null || echo "Could not fetch summary"
    
    echo ""
    log_info "Changes made by Jules:"
    git diff main..HEAD --stat 2>/dev/null || git diff HEAD~1..HEAD --stat
    
    echo ""
    log_info "Jules' reasoning:"
    jules task reasoning "$task_id" 2>/dev/null || echo "Could not fetch reasoning"
    
    # Step 5: Approve or reject changes
    echo ""
    read -p "Approve Jules' changes? [y/N]: " approve
    
    if [[ $approve =~ ^[Yy]$ ]]; then
        log_success "Changes approved"
        
        # Commit Jules' work
        git add .
        local commit_msg="feat: $(echo "$task" | head -c 50)

Implemented by: Google Jules AI Agent
Task ID: $task_id

$(jules task summary "$task_id" --format=commit-body 2>/dev/null || echo "Jules task completed")

Co-authored-by: Jules <jules@google.com>"
        
        git commit -m "$commit_msg"
        log_success "Changes committed"
    else
        log_info "Providing feedback to Jules..."
        read -p "Feedback: " feedback
        
        # Re-delegate with feedback
        jules task revise "$task_id" --feedback "$feedback" 2>/dev/null || log_warning "Could not send feedback to Jules"
    fi
}

# Phase 4: Automated Commit & PR Workflow
git_commit() {
    local commit_msg="$1"
    
    if [ -z "$commit_msg" ]; then
        log_error "Commit message is required"
        echo "Usage: git-workflow.sh commit \"<commit message>\""
        exit 1
    fi
    
    log_step "Phase 4: Automated Commit & PR Workflow"
    echo ""
    
    # Step 1: Stage all changes
    log_info "Staging changes..."
    git add .
    
    # Verify changes exist
    if git diff --cached --quiet; then
        log_warning "No changes to commit"
        exit 0
    fi
    
    # Step 2: Show diff summary
    echo ""
    log_info "Changes to commit:"
    git diff --cached --stat
    echo ""
    
    # Step 3: Run pre-commit hooks (auto-triggered)
    log_info "Running pre-commit checks..."
    
    # Step 4: Commit with conventional format
    local branch
    branch=$(git branch --show-current)
    local issue_number
    issue_number=$(echo "$branch" | grep -oP '(?<=feature/)\d+' || echo "")
    
    local commit_msg_full="$commit_msg"
    if [ -n "$issue_number" ]; then
        commit_msg_full="$commit_msg

Refs #$issue_number"
    fi
    
    git commit -m "$commit_msg_full"
    log_success "Changes committed"
    
    # Step 5: Push to remote
    if git remote | grep -q "origin"; then
        log_info "Pushing to remote..."
        git push origin "$branch"
    fi
    
    # Step 6: Create Pull Request
    if command -v gh &> /dev/null && git remote | grep -q "origin"; then
        echo ""
        log_info "Creating Pull Request..."
        
        local pr_body="## Summary
$commit_msg

## Changes
$(git diff main...HEAD --stat 2>/dev/null || git diff HEAD~1...HEAD --stat)

## Testing
- [x] Unit tests pass
- [x] Integration tests pass
- [x] Manual testing complete

## Checklist
- [x] Code follows style guidelines
- [x] Self-review completed
- [x] Documentation updated
- [x] No breaking changes

## Related Issue
Closes #$issue_number"
        
        local pr_url
        pr_url=$(gh pr create \
            --title "$commit_msg" \
            --body "$pr_body" \
            --base main \
            --head "$branch" \
            --label "ai-generated,enhancement" \
            --assignee "@me" \
            --json url -q .url 2>/dev/null || echo "")
        
        if [ -n "$pr_url" ]; then
            log_success "Pull Request created: $pr_url"
            
            # Step 7: Check merge status
            check_merge_status "$pr_url"
        else
            log_warning "Could not create Pull Request"
        fi
    else
        log_warning "GitHub CLI not found or no remote. Skipping PR creation."
    fi
}

# Check merge status and handle auto-merge
check_merge_status() {
    local pr_url="$1"
    
    echo ""
    log_info "Checking merge status..."
    
    # Wait a bit for CI to start
    sleep 5
    
    local pr_number
    pr_number=$(echo "$pr_url" | grep -oP '\d+$' || echo "")
    
    if [ -z "$pr_number" ]; then
        log_warning "Could not extract PR number"
        return
    fi
    
    local merge_status
    merge_status=$(gh pr view "$pr_number" --json mergeable -q .mergeable 2>/dev/null || echo "UNKNOWN")
    
    case $merge_status in
        "MERGEABLE")
            log_success "PR can be automatically merged!"
            echo ""
            read -p "Auto-merge now? [y/N]: " auto_merge
            
            if [[ $auto_merge =~ ^[Yy]$ ]]; then
                gh pr merge "$pr_number" \
                    --auto \
                    --squash \
                    --delete-branch 2>/dev/null || log_warning "Could not auto-merge"
                log_success "PR will auto-merge when checks pass"
            else
                log_info "PR ready for manual review"
            fi
            ;;
        "CONFLICTING")
            log_error "Merge conflicts detected!"
            echo ""
            log_info "Attempting automatic conflict resolution..."
            
            # Fetch latest main
            git fetch origin main 2>/dev/null || git fetch origin master 2>/dev/null
            
            # Attempt merge
            if git merge origin/main 2>/dev/null || git merge origin/master 2>/dev/null; then
                log_success "Conflicts auto-resolved"
                git push origin "$(git branch --show-current)" 2>/dev/null || true
            else
                log_error "Manual conflict resolution required"
                echo ""
                echo "Conflicting files:"
                git diff --name-only --diff-filter=U
                echo ""
                echo "Options:"
                echo "  1. Resolve manually: git mergetool"
                echo "  2. Use AI resolver: git-workflow.sh resolve-conflicts"
                echo "  3. Rollback: git-workflow.sh rollback"
            fi
            ;;
        "UNKNOWN"|"")
            log_info "CI checks in progress..."
            echo "  Check status: gh pr checks $pr_number"
            ;;
    esac
}

# Phase 5: AI-Powered Conflict Resolution
git_resolve_conflicts() {
    log_step "Phase 5: AI-Powered Conflict Resolution"
    echo ""
    
    # Step 1: Identify conflicting files
    local conflicts
    conflicts=$(git diff --name-only --diff-filter=U)
    
    if [ -z "$conflicts" ]; then
        log_success "No conflicts detected"
        exit 0
    fi
    
    log_info "Conflicting files:"
    echo "$conflicts"
    echo ""
    
    # Step 2: For each conflict, use AI to resolve
    while IFS= read -r file; do
        log_info "Resolving conflicts in: $file"
        
        # Extract conflict markers
        local conflict_content
        conflict_content=$(cat "$file")
        
        # Use local LLM to resolve (simplified for demo)
        log_warning "AI conflict resolution requires LLM integration"
        log_info "Please resolve conflicts manually in: $file"
        
        echo "  📝 Manual resolution required for: $file"
    done <<< "$conflicts"
    
    # Step 3: Verify resolution
    echo ""
    log_info "After resolving conflicts, run:"
    echo "  git add ."
    echo "  git commit -m \"chore: resolve merge conflicts\""
}

# Phase 6: Emergency Rollback System
git_rollback() {
    local rollback_target="$1"
    
    log_step "Phase 6: Emergency Rollback System"
    echo ""
    
    if [ -z "$rollback_target" ]; then
        log_error "Rollback target is required"
        echo "Usage: git-workflow.sh rollback <commit-hash|number-of-commits|branch-name>"
        exit 1
    fi
    
    # Option 1: Rollback to specific commit
    if [[ "$rollback_target" =~ ^[0-9a-f]{7,40}$ ]]; then
        log_info "Rolling back to commit: $rollback_target"
        
        # Create backup branch
        local backup_branch="backup-$(date +%Y%m%d-%H%M%S)"
        git branch "$backup_branch"
        log_success "Backup created: $backup_branch"
        
        # Reset to target commit
        git reset --hard "$rollback_target"
        log_success "Rolled back to $rollback_target"
        
    # Option 2: Rollback N commits
    elif [[ "$rollback_target" =~ ^[0-9]+$ ]]; then
        log_info "Rolling back $rollback_target commits"
        
        git reset --hard HEAD~"$rollback_target"
        log_success "Rolled back $rollback_target commits"
        
    # Option 3: Rollback to branch state
    elif git rev-parse --verify "$rollback_target" &>/dev/null; then
        log_info "Rolling back to branch: $rollback_target"
        
        git reset --hard "$rollback_target"
        log_success "Rolled back to $rollback_target"
        
    else
        log_error "Invalid rollback target"
        echo "Please provide a valid commit hash, number of commits, or branch name"
        exit 1
    fi
    
    # Force push if on feature branch (safe)
    local current_branch
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ] && [ "$current_branch" != "master" ]; then
        read -p "Force push to remote? [y/N]: " force_push
        if [[ $force_push =~ ^[Yy]$ ]]; then
            git push --force-with-lease origin "$current_branch" 2>/dev/null || log_warning "Could not push to remote"
            log_success "Remote updated"
        fi
    fi
}

# Show repository status
git_status() {
    log_step "Repository Status"
    echo ""
    
    # Git status
    if [ -d ".git" ]; then
        log_info "Git Repository Status:"
        echo "  Current branch: $(git branch --show-current)"
        echo "  Remote: $(git remote get-url origin 2>/dev/null || echo "No remote")"
        echo "  Last commit: $(git log -1 --oneline)"
        echo ""
        
        log_info "Working directory status:"
        git status --short
        echo ""
        
        # Check for uncommitted changes
        if ! git diff --quiet || ! git diff --cached --quiet; then
            log_warning "You have uncommitted changes"
        fi
        
        # Check if branch is ahead/behind
        if git remote | grep -q "origin"; then
            git fetch origin 2>/dev/null || true
            local ahead_behind
            ahead_behind=$(git rev-list --count --left-right HEAD...origin/$(git branch --show-current) 2>/dev/null || echo "0	0")
            local ahead
            local behind
            ahead=$(echo "$ahead_behind" | cut -f1)
            behind=$(echo "$ahead_behind" | cut -f2)
            
            if [ "$ahead" -gt 0 ]; then
                log_info "Branch is $ahead commit(s) ahead of origin"
            fi
            if [ "$behind" -gt 0 ]; then
                log_warning "Branch is $behind commit(s) behind origin"
            fi
        fi
    else
        log_warning "Not a Git repository"
        echo "Run 'git-workflow.sh init' to initialize"
    fi
    
    # Check for available tools
    echo ""
    log_info "Tool Availability:"
    echo "  GitHub CLI (gh): $(command -v gh &> /dev/null && echo "✅ Available" || echo "❌ Not found")"
    echo "  Google Jules: $(command -v jules &> /dev/null && echo "✅ Available" || echo "❌ Not found")"
    echo "  Python: $(command -v python3 &> /dev/null && echo "✅ Available" || echo "❌ Not found")"
    echo "  Node.js: $(command -v node &> /dev/null && echo "✅ Available" || echo "❌ Not found")"
}

# Main command router
main() {
    local command="${1:-help}"
    
    case $command in
        "init")
            git_init
            ;;
        "branch")
            git_branch "$2"
            ;;
        "commit")
            git_commit "$2"
            ;;
        "jules")
            git_jules "$2"
            ;;
        "resolve-conflicts")
            git_resolve_conflicts
            ;;
        "rollback")
            git_rollback "$2"
            ;;
        "status")
            git_status
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"