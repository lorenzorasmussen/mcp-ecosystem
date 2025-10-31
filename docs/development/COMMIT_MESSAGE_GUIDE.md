# Commit Message Standards

## Overview

This guide defines the standard commit message format for the MCP Ecosystem project to ensure clear, consistent, and searchable commit history.

## Format

All commit messages must follow the conventional commit format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

## Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD related changes
- `build`: Build system changes
- `revert`: Reverting previous changes

## Scopes

Common scopes include:

- `docs`: Documentation changes
- `tools`: Tool updates
- `tests`: Test modifications
- `config`: Configuration changes
- `mcp`: MCP server/client changes
- `sync`: Documentation sync changes

## Examples

### Good Examples

```
feat(docs): add coverage analysis guide
fix(tools): resolve broken link detection
test(sync): add unit tests for documentation sync
docs(readme): update installation instructions
```

### Bad Examples

```
fixed stuff
update docs
bug fix
```

## Description Rules

- Use present tense ("add" not "added")
- Use lowercase
- Be concise but descriptive
- No period at the end

## Body (Optional)

If needed, provide additional context:

```
feat(mcp): add new server integration

This commit adds support for the new MCP server integration
with improved error handling and connection management.

Closes #123
```

## Footer (Optional)

Use for breaking changes or issue references:

```
feat(api): breaking change to authentication endpoint

BREAKING CHANGE: The authentication endpoint now requires
API key instead of basic auth.

Closes #456
```

## Enforcement

- Pre-commit hooks validate commit message format
- CI pipeline rejects non-compliant commits
- Use `git commit -m "type(scope): description"` for simple commits
- Use `git commit` without `-m` for multi-line messages

## Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Commitizen CLI Tool](https://github.com/commitizen/cz-cli)
- [Semantic Versioning](https://semver.org/)
