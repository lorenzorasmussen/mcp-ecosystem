# Conventional Commits Configuration

This document defines our commit message standards based on the Conventional Commits specification.

## Format

Each commit message consists of a header, an optional body, and an optional footer. The header has a special format that includes a type, an optional scope, and a subject:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

## Types

### Core Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

### MCP-Specific Types
- `mcp`: Changes to MCP protocol implementation
- `coordination`: Changes to coordination system
- `orchestration`: Changes to orchestration system
- `spec`: Changes to specification or spec-kit integration

## Scope

The scope should be a single word that provides context for the change. Examples:
- `auth`: Authentication related changes
- `api`: API related changes
- `docs`: Documentation related changes
- `config`: Configuration related changes
- `deps`: Dependency related changes

## Subject

The subject contains a succinct description of the change. It should:
- Use the imperative, present tense: "change" not "changed" nor "changes"
- Not capitalize the first letter
- Not end with a period

## Body

The body should include the motivation for the change and contrast this with previous behavior. It should:
- Use the imperative, present tense
- Be as detailed as necessary
- Explain the "what" and "why" of the change

## Footer

The footer should contain information about breaking changes and is also the place to reference GitHub issues that this commit closes.

Breaking changes should start with the word `BREAKING CHANGE:` followed by a space, an uppercase letter, and a colon.

## Examples

### Feature Addition
```
feat(auth): add OAuth2 callback + state validation

- Add OAuth2 state parameter validation to prevent CSRF attacks
- Update authentication flow to include proper error handling
- Add unit tests for the new validation logic
```

### Bug Fix
```
fix(api): resolve timeout issue in data fetching

- Increase default timeout from 5s to 30s
- Add retry logic for transient network failures
- Update tests to reflect new timeout behavior

Closes: #123
```

### Breaking Change
```
refactor(api): update user model structure

BREAKING CHANGE: The user model has been updated to use a new structure.
The 'username' field has been replaced with 'userId' and 'displayName'.

Migration guide:
- Update all references to user.username to user.userId
- Use user.displayName for display purposes
```

### Documentation
```
docs: update API documentation for authentication endpoints

- Add examples for OAuth2 flow
- Update parameter descriptions
- Add security considerations section
```

## Validation

All commits must follow this convention. The CI/CD pipeline will validate commit messages and reject those that don't follow the format.