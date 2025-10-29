#!/bin/bash

# Git Hooks Setup Script for MCP Documentation System
# This script sets up git hooks to enforce documentation and code quality standards

set -e

echo "🔧 Setting up Git hooks for MCP Documentation System..."

# Create hooks directory if it doesn't exist
HOOKS_DIR=".git/hooks"
mkdir -p "$HOOKS_DIR"

# Pre-commit hook for documentation validation
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash

# Pre-commit hook for MCP Documentation System
# Validates documentation quality and runs basic checks

echo "🔍 Running pre-commit checks..."

# Check if we're committing documentation changes
DOCS_CHANGED=$(git diff --cached --name-only | grep -E '\.(md|rst|txt)$' | wc -l)
CODE_CHANGED=$(git diff --cached --name-only | grep -E '\.(js|ts|py|go|rs)$' | wc -l)

# Run documentation checks if docs are changing
if [ "$DOCS_CHANGED" -gt 0 ]; then
    echo "📝 Documentation changes detected, running validation..."
    
    # Check markdown formatting
    if command -v markdownlint-cli2 &> /dev/null; then
        echo "🔍 Checking markdown formatting..."
        markdownlint-cli2 "**/*.md" "#node_modules" "#.pnpm" || {
            echo "❌ Markdown formatting issues found. Please fix them before committing."
            exit 1
        }
    fi
    
    # Check for broken links
    if command -v markdown-link-check &> /dev/null; then
        echo "🔗 Checking for broken links..."
        git diff --cached --name-only --diff-filter=ACM | grep -E '\.md$' | while read file; do
            if [ -f "$file" ]; then
                markdown-link-check "$file" || {
                    echo "❌ Broken links found in $file. Please fix them before committing."
                    exit 1
                }
            fi
        done
    fi
    
    # Check writing quality
    if command -v write-good &> /dev/null; then
        echo "✍️ Checking writing quality..."
        git diff --cached --name-only --diff-filter=ACM | grep -E '\.md$' | while read file; do
            if [ -f "$file" ]; then
                write-good "$file" || echo "⚠️ Writing quality suggestions for $file"
            fi
        done
    fi
fi

# Run code checks if code is changing
if [ "$CODE_CHANGED" -gt 0 ]; then
    echo "💻 Code changes detected, running basic checks..."
    
    # Check if documentation needs updating
    echo "🔍 Checking if documentation needs updating..."
    node scripts/documentation-sync.js --dry-run || echo "⚠️ Consider updating documentation for code changes"
    
    # Check todo compliance for agent changes
    echo "📋 Checking todo compliance..."
    if [ -f "scripts/todo-enforcement-hook.js" ]; then
        node scripts/todo-enforcement-hook.js validate || echo "⚠️ Todo validation failed - consider creating todos for your changes"
    fi
fi

# Check file sizes to prevent large files
echo "📏 Checking file sizes..."
git diff --cached --name-only | while read file; do
    if [ -f "$file" ]; then
        SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
        if [ "$SIZE" -gt 10485760 ]; then # 10MB
            echo "❌ Large file detected: $file ($(($SIZE / 1048576))MB). Please use Git LFS for large files."
            exit 1
        fi
    fi
done

# Check for sensitive data
echo "🔒 Checking for sensitive data..."
git diff --cached --name-only | while read file; do
    if [ -f "$file" ]; then
        # Check for common sensitive patterns
        if grep -qE "(password|secret|key|token)\s*[:=]\s*['\"][^'\"]{8,}" "$file"; then
            echo "❌ Potential sensitive data found in $file. Please remove before committing."
            exit 1
        fi
    fi
done

echo "✅ Pre-commit checks passed!"
EOF

# Pre-push hook for comprehensive validation
cat > "$HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash

# Pre-push hook for MCP Documentation System
# Runs comprehensive checks before pushing to remote

echo "🚀 Running pre-push checks..."

# Get the current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Skip checks for certain branches
if [[ "$CURRENT_BRANCH" =~ ^(dependabot/|renovate/) ]]; then
    echo "⏭️ Skipping pre-push checks for automated branch: $CURRENT_BRANCH"
    exit 0
fi

# Run tests if available
if [ -f "package.json" ] && npm run test --silent 2>/dev/null; then
    echo "🧪 Running tests..."
    npm test || {
        echo "❌ Tests failed. Please fix them before pushing."
        exit 1
    }
fi

# Run documentation health check
if [ -f "scripts/documentation-health.js" ]; then
    echo "📊 Running documentation health check..."
    node scripts/documentation-health.js || {
        echo "⚠️ Documentation health check found issues. Consider addressing them."
    }
fi

# Check for merge conflicts
echo "🔍 Checking for merge conflict markers..."
if git diff --name-only --diff-filter=U | grep -q .; then
    echo "❌ Merge conflict markers found. Please resolve conflicts before pushing."
    exit 1
fi

# Check if branch is up to date with main
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "🔄 Checking if branch is up to date with main..."
    git fetch origin main
    if [ "$(git rev-list HEAD..origin/main --count)" -gt 0 ]; then
        echo "⚠️ Your branch is behind main. Consider rebasing:"
        echo "   git fetch origin"
        echo "   git rebase origin/main"
    fi
fi

echo "✅ Pre-push checks passed!"
EOF

# Commit message hook for conventional commits
cat > "$HOOKS_DIR/commit-msg" << 'EOF'
#!/bin/bash

# Commit message hook for MCP Documentation System
# Enforces conventional commit format

COMMIT_MSG_FILE="$1"
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Skip validation for merge commits
if [[ "$COMMIT_MSG" =~ ^Merge ]]; then
    exit 0
fi

# Check conventional commit format
if [[ ! "$COMMIT_MSG" =~ ^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{10,} ]]; then
    echo "❌ Invalid commit message format!"
    echo ""
    echo "Expected format: type(scope): description"
    echo ""
    echo "Types:"
    echo "  feat:     New feature"
    echo "  fix:      Bug fix"
    echo "  docs:     Documentation changes"
    echo "  style:    Code style changes (formatting, etc.)"
    echo "  refactor: Code refactoring"
    echo "  test:     Test additions or changes"
    echo "  chore:    Maintenance tasks"
    echo "  perf:     Performance improvements"
    echo "  ci:       CI/CD changes"
    echo "  build:    Build system changes"
    echo "  revert:   Revert previous commit"
    echo ""
    echo "Examples:"
    echo "  feat(auth): add OAuth2 support"
    echo "  fix(api): resolve null pointer exception"
    echo "  docs(readme): update installation instructions"
    echo ""
    echo "Description should be at least 10 characters and written in present tense."
    exit 1
fi

# Check for proper capitalization
if [[ ! "$COMMIT_MSG" =~ ^[a-z].* ]]; then
    echo "❌ Commit message should start with a lowercase letter."
    exit 1
fi

# Check for trailing period
if [[ "$COMMIT_MSG" =~ \.$ ]]; then
    echo "❌ Commit message should not end with a period."
    exit 1
fi

echo "✅ Commit message format is valid!"
EOF

# Make hooks executable
chmod +x "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/pre-push"
chmod +x "$HOOKS_DIR/commit-msg"

echo "✅ Git hooks installed successfully!"
echo ""
echo "📋 Installed hooks:"
echo "  • pre-commit: Documentation validation and basic checks"
echo "  • pre-push: Comprehensive validation and tests"
echo "  • commit-msg: Conventional commit format enforcement"
echo ""
echo "🔧 To bypass hooks (not recommended):"
echo "  git commit --no-verify"
echo "  git push --no-verify"
echo ""
echo "⚠️  Bypassing hooks should only be done in exceptional circumstances."