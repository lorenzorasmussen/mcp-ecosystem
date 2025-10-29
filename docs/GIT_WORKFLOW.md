# Git Workflow and Branching Strategy

This document outlines the Git workflow and branching strategy for the MCP Ecosystem project.

## 🌳 Branching Model

We follow a modified Git Flow branching model optimized for the MCP Ecosystem:

### Main Branches

- **`main`**: Production-ready code. Only stable releases are merged here.
- **`develop`**: Integration branch for features. All features are merged here before release.

### Supporting Branches

- **`feature/*`**: Feature development branches (e.g., `feature/user-authentication`)
- **`bugfix/*`**: Bug fixes for non-critical issues (e.g., `bugfix/login-validation`)
- **`hotfix/*`**: Critical fixes for production (e.g., `hotfix/security-patch`)
- **`release/v*.*.*`**: Release preparation branches (e.g., `release/v1.2.0`)

## 🔄 Workflow

### Feature Development

1. Create a feature branch from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-new-feature
   ```

2. Develop and commit changes following conventional commits:
   ```bash
   git add .
   git commit -m "feat(auth): add OAuth2 callback + state validation"
   ```

3. Push feature branch and create a pull request to `develop`:
   ```bash
   git push origin feature/my-new-feature
   ```

### Release Process

1. Create a release branch from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/vX.Y.Z
   ```

2. Update version numbers and finalize release notes in the release branch.

3. Create a pull request from the release branch to `main` (for production) and to `develop` (to merge back changes).

4. After merging to `main`, create a Git tag:
   ```bash
   git tag -a vX.Y.Z -m "Release version X.Y.Z"
   git push origin vX.Y.Z
   ```

### Hotfix Process

1. Create a hotfix branch from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-fix
   ```

2. Implement the fix and update version if needed.

3. Create pull requests to both `main` and `develop`.

## 📝 Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

### Examples

```
feat(auth): add OAuth2 callback + state validation

- Add OAuth2 state parameter validation to prevent CSRF attacks
- Update authentication flow to include proper error handling
- Add unit tests for the new validation logic
```

```
fix(api): resolve timeout issue in data fetching

- Increase default timeout from 5s to 30s
- Add retry logic for transient network failures
- Update tests to reflect new timeout behavior
```

## 🔒 Branch Protection Rules

### `main` branch:
- Require pull request reviews before merging
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Restrict who can push to matching branches

### `develop` branch:
- Require pull request reviews before merging
- Require status checks to pass before merging
- Require branches to be up to date before merging

## 🚀 CI/CD Integration

- All commits to `main` and `develop` trigger automated tests
- Pull requests require passing tests before merging
- Code coverage must meet minimum thresholds
- Documentation quality checks are performed
- Todo enforcement validation is required

## 📊 Release Process

1. **Pre-release**: All features for the release are merged into `develop`
2. **Release branch**: Create release branch from `develop` and finalize release
3. **Testing**: Thorough testing on release branch
4. **Merge to main**: Create pull request to merge release into `main`
5. **Tagging**: Create Git tag for the release
6. **Deployment**: Deploy tagged version to production
7. **Merge back**: Merge release changes back into `develop`