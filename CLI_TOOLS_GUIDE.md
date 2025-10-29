# CLI Tools Guide for MCP Ecosystem

## Overview

This project provides a comprehensive suite of CLI tools designed for real-world software development workflows. Each tool serves specific purposes in the development lifecycle, from project management to quality assurance and automation.

## Available CLI Tools

### 1. Shared Todo CLI (`shared-todo-cli.js`)

**Purpose**: Collaborative task management and progress tracking for LLM agents.

**Real-World Usage Scenarios**:

#### Scenario: Team Feature Development

```bash
# Product manager creates feature todo
node tools/scripts/shared-todo-cli.js create product-manager "Implement shopping cart functionality" \
  --description="Add cart management, persistence, and checkout flow" \
  --priority=high \
  --category=feature \
  --tags=ecommerce,frontend,backend

# Development team checks available work
node tools/scripts/shared-todo-cli.js unassigned

# Backend developer claims cart API work
node tools/scripts/shared-todo-cli.js assign backend-dev todo-123 backend-dev
node tools/scripts/shared-todo-cli.js start backend-dev todo-123

# Frontend developer works on UI
node tools/scripts/shared-todo-cli.js create frontend-dev "Build shopping cart UI components" \
  --description="React components for cart display, add/remove items, quantity updates" \
  --priority=high \
  --category=feature \
  --tags=react,ui,components

# Daily standup - check team progress
node tools/scripts/shared-todo-cli.js status
```

#### Scenario: Bug Investigation and Fix

```bash
# QA creates bug report todo
node tools/scripts/shared-todo-cli.js create qa-tester "Users cannot add items to cart on mobile" \
  --description="iOS Safari users report cart addition fails silently" \
  --priority=critical \
  --category=bug-fix \
  --tags=mobile,ios,safari,cart

# Developer investigates
node tools/scripts/shared-todo-cli.js assign lead-dev todo-456 mobile-dev
node tools/scripts/shared-todo-cli.js start mobile-dev todo-456

# Add investigation notes
node tools/scripts/shared-todo-cli.js comment mobile-dev todo-456 "Reproduced on iOS 17.2 Safari - appears to be CSP issue with inline event handlers"

# Collaborate with team
node tools/scripts/shared-todo-cli.js comment mobile-dev todo-456 "Need security team's input on CSP policy update @security-team"

# Complete fix
node tools/scripts/shared-todo-cli.js complete mobile-dev todo-456 \
  --notes="Updated CSP policy to allow cart functionality, added mobile-specific event handling" \
  --result="Cart works correctly on all mobile browsers"
```

### 2. Git Workflow CLI (`git-workflow.sh`)

**Purpose**: Complete Git workflow automation with AI assistance, issue tracking, and PR management.

**Real-World Usage Scenarios**:

#### Scenario: Feature Branch Development

```bash
# Initialize repository with proper setup
./tools/scripts/git-workflow.sh init

# Create feature branch with GitHub issue
./tools/scripts/git-workflow.sh branch "Add user authentication with OAuth2"

# The tool automatically:
# - Creates GitHub issue
# - Sets up feature branch (feature/123-add-user-authentication)
# - Installs pre-commit hooks
# - Links branch to issue

# Work on feature, then commit with PR
./tools/scripts/git-workflow.sh commit "feat(auth): implement OAuth2 login flow

- Add Google OAuth2 integration
- Implement JWT token management
- Add user session handling
- Update API endpoints for authentication

Closes #123"
```

#### Scenario: Conflict Resolution

```bash
# When merge conflicts occur during PR merge
./tools/scripts/git-workflow.sh resolve-conflicts

# Tool attempts AI-powered conflict resolution
# If manual resolution needed:
# 1. Identifies conflicting files
# 2. Provides context about changes
# 3. Suggests resolution strategies
# 4. Guides through manual merge process
```

#### Scenario: Emergency Rollback

```bash
# Production issue detected after deployment
./tools/scripts/git-workflow.sh rollback HEAD~3

# Tool automatically:
# - Creates backup branch with current state
# - Rolls back specified commits
# - Provides rollback report
# - Offers to force-push if on feature branch
```

### 3. Coverage Analysis CLI (`coverage-analysis.js`)

**Purpose**: Comprehensive test coverage analysis, gap identification, and automated test generation.

**Real-World Usage Scenarios**:

#### Scenario: Pre-Release Quality Gate

```bash
# Run full coverage analysis before release
node tools/scripts/coverage-analysis.js --ci --threshold 85

# Tool provides:
# - Current coverage metrics (lines, functions, branches)
# - Files with low/zero coverage
# - Coverage gap analysis
# - Prioritized improvement recommendations
# - Automated test generation for uncovered code
```

#### Scenario: Development-Time Coverage Monitoring

```bash
# During development, check coverage impact
node tools/scripts/coverage-analysis.js --threshold 80

# After adding new feature
node tools/scripts/coverage-analysis.js --improve

# Tool automatically:
# - Generates basic test templates for new code
# - Updates coverage configuration
# - Provides specific test case suggestions
# - Creates CI/CD integration files
```

#### Scenario: Test Strategy Planning

```bash
# Analyze existing coverage patterns
node tools/scripts/coverage-analysis.js

# Output includes:
# - Coverage by component/feature
# - Error handling coverage assessment
# - Integration point test coverage
# - Effort estimation for coverage improvement
# - Prioritized testing roadmap
```

### 4. Specification Validator CLI (`specification-validator.js`)

**Purpose**: Ensures all development aligns with project specifications and standards.

**Real-World Usage Scenarios**:

#### Scenario: Architecture Compliance Check

```bash
# Before implementing new feature
node tools/scripts/specification-validator.js

# Validates:
# - SPECIFICATION.md structure and content
# - Constitution principles alignment
# - Template compliance
# - Documentation synchronization
# - Code organization standards
```

#### Scenario: CI/CD Quality Gate

```bash
# In CI pipeline
node tools/scripts/specification-validator.js

# Fails build if:
# - Required specification sections missing
# - Code doesn't follow architectural patterns
# - Documentation out of sync
# - Standards violations detected
```

### 5. Documentation Sync CLI (`documentation-sync.js`)

**Purpose**: Automated documentation synchronization across repositories and formats.

**Real-World Usage Scenarios**:

#### Scenario: API Documentation Update

```bash
# After API changes
node tools/scripts/documentation-sync.js --sync-api

# Tool automatically:
# - Extracts API documentation from code
# - Updates OpenAPI/Swagger specs
# - Syncs with external documentation sites
# - Validates documentation completeness
```

#### Scenario: Multi-Repository Sync

```bash
# Sync documentation across microservices
node tools/scripts/documentation-sync.js --sync-all

# Maintains consistency across:
# - Main repository docs
# - Microservice repositories
# - External documentation platforms
# - API documentation hubs
```

## Integrated Workflow Examples

### Complete Feature Development Workflow

```bash
# 1. Planning Phase
node tools/scripts/shared-todo-cli.js create product-owner "Implement payment processing" \
  --description="Stripe integration with subscription management" \
  --priority=high \
  --category=feature \
  --tags=payment,stripe,subscription

# 2. Development Setup
./tools/scripts/git-workflow.sh branch "Implement payment processing"
node tools/scripts/shared-todo-cli.js assign tech-lead todo-789 backend-dev

# 3. Implementation
node tools/scripts/shared-todo-cli.js start backend-dev todo-789

# Regular progress updates
node tools/scripts/shared-todo-cli.js comment backend-dev todo-789 "Completed Stripe webhook integration"
node tools/scripts/shared-todo-cli.js comment backend-dev todo-789 "Added subscription management API endpoints"

# 4. Quality Assurance
node tools/scripts/coverage-analysis.js --threshold 85
node tools/scripts/specification-validator.js
npm run lint

# 5. Documentation
node tools/scripts/documentation-sync.js --sync-api

# 6. Code Review & Merge
./tools/scripts/git-workflow.sh commit "feat(payment): implement Stripe payment processing

- Add Stripe webhook handling
- Implement subscription management
- Add payment API endpoints
- Update API documentation

Closes #456"

# 7. Completion
node tools/scripts/shared-todo-cli.js complete backend-dev todo-789 \
  --notes="Full Stripe integration with webhooks, subscriptions, and error handling" \
  --result="Payment processing fully functional with 90% test coverage"
```

### Bug Fix Emergency Response

```bash
# 1. Incident Detection
node tools/scripts/shared-todo-cli.js create devops "PRODUCTION: Database connection pool exhausted" \
  --description="Users experiencing 500 errors, connection pool at 100%" \
  --priority=critical \
  --category=incident \
  --tags=production,database,urgent

# 2. Investigation
node tools/scripts/shared-todo-cli.js assign incident-manager todo-999 database-dev
node tools/scripts/shared-todo-cli.js start database-dev todo-999

# 3. Root Cause Analysis
node tools/scripts/shared-todo-cli.js comment database-dev todo-999 "Connection pool size: 20, active connections: 25, waiting: 50"
node tools/scripts/shared-todo-cli.js comment database-dev todo-999 "Traffic spike from marketing campaign caused pool exhaustion"

# 4. Emergency Fix
./tools/scripts/git-workflow.sh branch "HOTFIX: increase database connection pool"
# Make emergency changes...

# 5. Validation
node tools/scripts/coverage-analysis.js --ci --threshold 70  # Relaxed for hotfix
node tools/scripts/specification-validator.js

# 6. Deployment
./tools/scripts/git-workflow.sh commit "fix: increase database connection pool size

- Increased pool size from 20 to 50
- Added connection monitoring
- Emergency hotfix for production incident

Refs #999"

# 7. Resolution
node tools/scripts/shared-todo-cli.js complete database-dev todo-999 \
  --notes="Increased connection pool, added monitoring, deployed to production" \
  --result="Database connections stable, error rate dropped from 15% to 0.1%"
```

## Tool Integration Matrix

| Scenario          | Todo CLI               | Git Workflow          | Coverage Analysis     | Spec Validator         | Doc Sync         |
| ----------------- | ---------------------- | --------------------- | --------------------- | ---------------------- | ---------------- |
| New Feature       | ✅ Create/assign tasks | ✅ Branch management  | ✅ Coverage tracking  | ✅ Compliance check    | ✅ API docs      |
| Bug Fix           | ✅ Track investigation | ✅ Hotfix branches    | ✅ Regression testing | ✅ Standards check     | ✅ Update docs   |
| Code Review       | ✅ Progress updates    | ✅ PR management      | ✅ Coverage gates     | ✅ Architecture review | ✅ Doc review    |
| Release Prep      | ✅ Release tasks       | ✅ Version management | ✅ Quality gates      | ✅ Final validation    | ✅ Release notes |
| Incident Response | ✅ Incident tracking   | ✅ Emergency branches | ✅ Impact analysis    | ✅ Compliance check    | ✅ Incident docs |

## Best Practices

### 1. **Use Tools Together**

Don't use tools in isolation. The real power comes from their integration:

```bash
# Bad: Using tools separately
node tools/scripts/shared-todo-cli.js create dev "Add feature"
# ... work ...
node tools/scripts/coverage-analysis.js

# Good: Integrated workflow
node tools/scripts/shared-todo-cli.js create dev "Add feature"
./tools/scripts/git-workflow.sh branch "Add feature"
# ... work with regular coverage checks ...
node tools/scripts/coverage-analysis.js --ci --threshold 80
./tools/scripts/git-workflow.sh commit "feat: add feature"
```

### 2. **Establish Quality Gates**

Set up automated checks in your development process:

```bash
# Pre-commit quality gate
node tools/scripts/specification-validator.js
node tools/scripts/coverage-analysis.js --ci --threshold 80
npm run lint

# PR quality gate
npm run test
node tools/scripts/coverage-analysis.js --ci --threshold 85
node tools/scripts/documentation-sync.js --validate
```

### 3. **Monitor and Improve**

Use the tools to continuously improve your processes:

```bash
# Weekly coverage trend analysis
node tools/scripts/coverage-analysis.js --report

# Monthly specification compliance review
node tools/scripts/specification-validator.js

# Continuous documentation health monitoring
npm run docs:health
```

## Troubleshooting

### Common Issues

**"Command not found"**

```bash
# Ensure scripts are executable
chmod +x tools/scripts/*.js tools/scripts/*.sh

# Check Node.js installation
node --version
npm --version
```

**"Permission denied"**

```bash
# For Git hooks and scripts
chmod +x .git/hooks/*
chmod +x tools/scripts/*.sh
```

**"Coverage data not found"**

```bash
# Run tests first to generate coverage
npm test
node tools/scripts/coverage-analysis.js
```

**"Specification validation fails"**

```bash
# Check SPECIFICATION.md exists and is complete
ls -la SPECIFICATION.md
node tools/scripts/specification-validator.js
```

## Future Enhancements

The CLI tool suite is designed for extensibility:

- **Custom Workflows**: Organization-specific workflow templates
- **Integration APIs**: REST APIs for external tool integration
- **Advanced Analytics**: Predictive analytics for project planning
- **Multi-Repository Support**: Cross-repository workflow coordination
- **AI-Powered Insights**: Machine learning for process optimization

---

**Last Updated**: 2025-10-29
**Version**: 1.0.0
**Status**: 🟢 Production Ready
