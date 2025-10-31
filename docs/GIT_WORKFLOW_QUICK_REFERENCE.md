# Git Workflow Quick Reference

This guide provides quick reference commands for the MCP Ecosystem Git workflow.

## 🌳 Branching

### Creating Branches
```bash
# Create and switch to a new feature branch
git checkout develop
git pull origin develop
git checkout -b feature/my-new-feature
# Or use the alias: git create-feature my-new-feature

# Create and switch to a new bugfix branch
git checkout develop
git pull origin develop
git checkout -b bugfix/issue-fix
# Or use the alias: git create-bugfix issue-fix

# Create and switch to a new release branch
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0
# Or use the alias: git create-release 1.2.0
```

### Syncing Branches
```bash
# Sync with develop branch
git sync-develop

# Sync with main branch
git sync-main

# View recent branches
git recent-branches
```

## 📝 Committing

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Valid Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Other changes
- `revert`: Revert a commit
- `mcp`: MCP protocol changes
- `coordination`: Coordination system changes
- `orchestration`: Orchestration system changes
- `spec`: Specification changes

### Examples
```bash
git commit -m "feat(auth): add OAuth2 callback + state validation"

git commit -m "fix(api): resolve timeout issue in data fetching

- Increase default timeout from 5s to 30s
- Add retry logic for transient network failures
- Update tests to reflect new timeout behavior"
```

## 🔄 Pull Requests

### Creating Pull Requests
```bash
# Push your feature branch
git push origin feature/my-new-feature

# Create a pull request (requires hub CLI tool)
git pr  # Creates PR to default base branch
```

### Pull Request Template
When creating a pull request, use the template provided in `.github/pull_request_template.md`:

- Describe the changes and their purpose
- Indicate the type of change
- List any linked issues
- Assess the risk level
- Confirm all checks pass before merging

## 🚀 Releasing

### Creating a Release
```bash
# Using the release script
bash scripts/release.sh <major|minor|patch>

# Example: Create a minor release
bash scripts/release.sh minor
```

### Manual Release Process
1. Update version in `package.json`
2. Update `CHANGELOG.md` with release notes
3. Commit changes: `git commit -m "chore(release): prepare for version X.Y.Z"`
4. Create release branch: `git checkout -b release/vX.Y.Z`
5. Create pull request to `main`
6. After merging, create Git tag: `git tag -a vX.Y.Z -m "Release version X.Y.Z"`
7. Push tag: `git push origin vX.Y.Z`

## 🔧 Useful Commands

### Git Status & History
```bash
git st                    # Status
git lg                    # Log with graph
git hist                  # Formatted history
git last                  # Last commit details
```

### Staging & Committing
```bash
git a <files>            # Add files
git ci -m "message"      # Commit with message
git ca                   # Amend last commit
git cae                  # Amend last commit without changing message
```

### Branch Management
```bash
git br                   # List branches
git br -a                # List all branches
git bd <branch>          # Delete branch
git cleanup-merged       # Delete merged branches
```

### Undo Operations
```bash
git unstage <files>      # Unstage files
git undiff <files>       # Undo changes to files
git undo                 # Undo last commit (soft reset)
git undoc                # Undo last commit (hard reset)
```

## 🤖 MCP-Specific Commands

### Coordination and Todo Enforcement
- All operations should be tracked with todos
- Check coordination status before starting work
- Use the unified coordinator for all operations
- Follow todo enforcement guidelines

## 🧪 Quality Checks

Before committing, run:
```bash
npm run docs:check        # Documentation quality checks
npm run test:ci          # Run tests with coverage
npm run lint             # Run linting
npm run format           # Run formatting
```

## 🚦 CI/CD Pipeline

The CI/CD pipeline includes:

1. **Code Quality**: ESLint and Prettier validation
2. **Testing**: Unit and integration tests
3. **Security**: Dependency and code scanning
4. **Documentation**: Quality and link validation
5. **Source Control**: Commit message and branching validation
6. **Todo Enforcement**: Todo tracking validation
7. **Release**: Automated release process for tagged commits