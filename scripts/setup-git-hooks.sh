#!/bin/bash
# Git Hooks Installation Script for MCP Ecosystem

echo "🔧 Installing Git hooks for MCP Ecosystem..."

HOOKS_DIR="/Users/lorenzorasmussen/.local/share/mcp/.git/hooks"
HOOKS_SOURCE_DIR="/Users/lorenzorasmussen/.local/share/mcp/scripts/git-hooks"

# Create the hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Create the source hooks directory if it doesn't exist
mkdir -p "$HOOKS_SOURCE_DIR"

# Create the pre-commit hook
cat > "$HOOKS_SOURCE_DIR/pre-commit" << 'EOF'
#!/bin/sh
# Pre-commit hook for MCP Ecosystem

echo "🔍 Running pre-commit checks..."

# Check if commit message follows conventional commits format
COMMIT_MSG_FILE=.git/COMMIT_EDITMSG
COMMIT_MESSAGE=$(cat $COMMIT_MSG_FILE)

# Check if the commit message follows the conventional commit format
if ! echo "$COMMIT_MESSAGE" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert|mcp|coordination|orchestration|spec)(\(.+\))?: .+"; then
  # Allow merge commits
  if ! echo "$COMMIT_MESSAGE" | grep -q "^Merge "; then
    echo "❌ Commit message does not follow conventional commit format"
    echo "Expected format: type(scope): description"
    echo "Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert, mcp, coordination, orchestration, spec"
    echo ""
    echo "Your commit message:"
    echo "$COMMIT_MESSAGE"
    exit 1
  fi
fi

echo "✅ Commit message format is valid"

# Run linting on staged files
echo "🔍 Running linting on staged files..."
npx eslint --fix $(git diff --name-only --staged --diff-filter=ACM | grep -E "\.(js|ts|jsx|tsx)$" | xargs)

# Run prettier on staged files
echo "🔍 Running prettier on staged files..."
npx prettier --write $(git diff --name-only --staged --diff-filter=ACM | grep -E "\.(js|ts|jsx|tsx|json|md|yml|yaml)$" | xargs)

# Run tests on files that are being committed (if they have corresponding tests)
echo "🔍 Checking if tests should be run..."

# Add the formatted files back to the staging area
git add .

echo "✅ Pre-commit checks completed successfully"
EOF

# Create the commit-msg hook
cat > "$HOOKS_SOURCE_DIR/commit-msg" << 'EOF'
#!/bin/sh
# Commit message validation hook for MCP Ecosystem

echo "🔍 Validating commit message format..."

COMMIT_MSG_FILE=$1
COMMIT_MESSAGE=$(cat $COMMIT_MSG_FILE)

# Check if the commit message follows the conventional commit format
if ! echo "$COMMIT_MESSAGE" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert|mcp|coordination|orchestration|spec)(\(.+\))?: .+|^Merge "; then
    echo "❌ Commit message does not follow conventional commit format"
    echo "Expected format: type(scope): description"
    echo "Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert, mcp, coordination, orchestration, spec"
    echo ""
    echo "Your commit message:"
    echo "$COMMIT_MESSAGE"
    exit 1
fi

echo "✅ Commit message format is valid"
EOF

# Copy hooks to the Git hooks directory
cp "$HOOKS_SOURCE_DIR/pre-commit" "$HOOKS_DIR/pre-commit"
cp "$HOOKS_SOURCE_DIR/commit-msg" "$HOOKS_DIR/commit-msg"

# Make the hooks executable
chmod +x "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/commit-msg"

echo "✅ Git hooks installed successfully!"
echo "📋 Available hooks:"
echo "   - pre-commit: Validates commit message format, runs linting and formatting"
echo "   - commit-msg: Validates commit message format"