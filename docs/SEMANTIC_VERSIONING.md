# Semantic Versioning Configuration

This document defines how we handle semantic versioning in the MCP Ecosystem.

## Version Format

We follow semantic versioning in the format: `MAJOR.MINOR.PATCH`

- `MAJOR` version: Incompatible API changes
- `MINOR` version: Added functionality in a backward-compatible manner
- `PATCH` version: Backward-compatible bug fixes

## Release Types

### Major Release (X.0.0)
- Breaking changes to public APIs
- Major architectural changes
- Removal of deprecated features

### Minor Release (X.Y.0)
- New features added in a backward-compatible manner
- New optional configuration options
- New optional dependencies

### Patch Release (X.Y.Z)
- Bug fixes that are backward-compatible
- Security patches
- Performance improvements without API changes

## Version Bump Guidelines

### When to bump MAJOR version:
- Breaking changes to MCP protocol implementation
- Breaking changes to REST API endpoints
- Removal of existing functionality
- Major architectural changes affecting integrations

### When to bump MINOR version:
- New MCP server implementations
- New API endpoints added
- New optional configuration parameters
- New documentation features
- Non-breaking changes to existing functionality

### When to bump PATCH version:
- Bug fixes in existing functionality
- Security patches
- Documentation corrections
- Performance optimizations
- Dependency updates without breaking changes

## Release Process

1. **Preparation**: Ensure all features for the release are completed and merged to develop
2. **Testing**: Run full test suite and perform manual testing
3. **Version Update**: Update version in package.json
4. **Changelog Update**: Update CHANGELOG.md with release notes
5. **Release Branch**: Create release branch from develop
6. **Final Review**: Perform final review and testing on release branch
7. **Merge to Main**: Create PR to merge release branch to main
8. **Tag Creation**: Create Git tag for the release
9. **Deployment**: Deploy to production
10. **Merge Back**: Merge release branch back to develop