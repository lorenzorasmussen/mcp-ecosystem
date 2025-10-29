#!/bin/bash
# MCP Ecosystem Release Script

set -e  # Exit on any error

echo "🚀 Starting MCP Ecosystem release process..."

# Function to print usage
usage() {
    echo "Usage: $0 <version_type>"
    echo "  version_type: major | minor | patch"
    echo ""
    echo "Examples:"
    echo "  $0 patch    # 1.0.0 -> 1.0.1"
    echo "  $0 minor    # 1.0.1 -> 1.1.0"
    echo "  $0 major    # 1.1.0 -> 2.0.0"
    exit 1
}

# Check if version type is provided
if [ $# -ne 1 ]; then
    usage
fi

VERSION_TYPE=$1

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(major|minor|patch)$ ]]; then
    echo "❌ Invalid version type: $VERSION_TYPE"
    usage
fi

# Check if we're on the develop branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "develop" ]; then
    echo "❌ Please run this script from the develop branch"
    exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Working directory is not clean. Please commit or stash your changes."
    exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📊 Current version: $CURRENT_VERSION"

# Calculate new version
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
V_MAJOR=${VERSION_PARTS[0]}
V_MINOR=${VERSION_PARTS[1]}
V_PATCH=${VERSION_PARTS[2]}

case $VERSION_TYPE in
    major)
        NEW_VERSION="$((V_MAJOR + 1)).0.0"
        ;;
    minor)
        NEW_VERSION="${V_MAJOR}.$((V_MINOR + 1)).0"
        ;;
    patch)
        NEW_VERSION="${V_MAJOR}.${V_MINOR}.$((V_PATCH + 1))"
        ;;
esac

echo "🎯 New version: $NEW_VERSION"

# Confirm release
read -p "Proceed with release $NEW_VERSION? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Release cancelled"
    exit 1
fi

# Run tests to ensure everything is working
echo "🧪 Running tests..."
npm run test:ci

# Update package version
echo "📦 Updating package version..."
npm version $NEW_VERSION --no-git-tag-version

# Update changelog
echo "📝 Updating changelog..."
DATE=$(date +%Y-%m-%d)

# Create a temporary file with the new changelog entry
cat > /tmp/new_changelog.md << EOF
## [Unreleased]

### Added
- 

### Changed
- 

### Deprecated
- 

### Removed
- 

### Fixed
- 

### Security
- 

## [$NEW_VERSION] - $DATE

### Added
- 

### Changed
- 

### Deprecated
- 

### Removed
- 

### Fixed
- 

### Security
- 

EOF

# Insert the new entry after the first line of CHANGELOG.md
sed -i.bak '1r /tmp/new_changelog.md' CHANGELOG.md
sed -i.bak '2d' CHANGELOG.md
rm CHANGELOG.md.bak /tmp/new_changelog.md

# Commit the changes
echo " committing changes..."
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): prepare for version $NEW_VERSION"

# Create release branch
RELEASE_BRANCH="release/v$NEW_VERSION"
echo "SetBranch $RELEASE_BRANCH..."
git checkout -b $RELEASE_BRANCH

# Run final checks
echo "🔍 Running final checks..."
npm run build
npm run docs:check

echo "✅ Release branch $RELEASE_BRANCH created successfully!"
echo "📋 Next steps:"
echo "   1. Make any final adjustments to the release"
echo "   2. Run final tests: npm run test:ci"
echo "   3. Create a pull request from $RELEASE_BRANCH to main"
echo "   4. After merging to main, create a pull request from $RELEASE_BRANCH to develop to merge back changes"
echo "   5. Create Git tag: git tag -a v$NEW_VERSION -m \"Release version $NEW_VERSION\""
echo "   6. Push tag: git push origin v$NEW_VERSION"

echo "🎉 Release preparation completed!"