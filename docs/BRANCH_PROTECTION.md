# Branch Protection Configuration

This document outlines the recommended branch protection rules for the MCP Ecosystem repository.

## Branch Protection Rules

### Main Branch (`main`)

- **Require pull request reviews before merging**
  - Required number of approving reviews: 1
  - Dismiss stale pull request approvals when new commits are pushed
  - Require review from Code Owners (if CODEOWNERS file exists)

- **Require status checks to pass before merging**
  - Require branches to be up to date before merging
  - Required status checks:
    - `build` - Build process must pass
    - `unit-tests` - Unit tests must pass
    - `integration-tests` - Integration tests must pass
    - `security-scan` - Security scan must pass
    - `documentation-quality` - Documentation quality checks must pass
    - `source-control-validation` - Source control best practices must pass
    - `todo-enforcement-validation` - Todo enforcement must pass

- **Require conversation resolution before merging**
  - All conversations on code must be resolved before merging

- **Restrict who can push to matching branches**
  - Allow specified actors to bypass required pull requests

### Develop Branch (`develop`)

- **Require pull request reviews before merging**
  - Required number of approving reviews: 1
  - Dismiss stale pull request approvals when new commits are pushed

- **Require status checks to pass before merging**
  - Require branches to be up to date before merging
  - Required status checks:
    - `build` - Build process must pass
    - `unit-tests` - Unit tests must pass
    - `source-control-validation` - Source control best practices must pass
    - `todo-enforcement-validation` - Todo enforcement must pass

- **Require conversation resolution before merging**
  - All conversations on code must be resolved before merging

### Release Branches (`release/*`)

- **Require pull request reviews before merging**
  - Required number of approving reviews: 1

- **Require status checks to pass before merging**
  - Require branches to be up to date before merging
  - Required status checks:
    - `build` - Build process must pass
    - `unit-tests` - Unit tests must pass
    - `integration-tests` - Integration tests must pass

## Code Owners

The following CODEOWNERS file should be placed in the `.github/` directory:

```
# Code owners for MCP Ecosystem

# Everyone in the organization can review pull requests
* @mcp-ecosystem/maintainers

# Specific components
/src/mcp-ecosystem/orchestration/ @mcp-ecosystem/orchestration-team
/src/mcp-ecosystem/coordination/ @mcp-ecosystem/coordination-team
/docs/ @mcp-ecosystem/documentation-team
/specs/ @mcp-ecosystem/specification-team
/tests/ @mcp-ecosystem/testing-team
```

## Enforcement Scripts

The repository includes scripts to help enforce these rules:

- `scripts/setup-git-hooks.sh` - Sets up client-side Git hooks
- `scripts/setup-git-workflow.sh` - Configures Git settings and aliases
- `.github/workflows/source-control.yml` - Validates commit messages and branch names
- `.github/workflows/todo-enforcement.yml` - Enforces todo tracking