# MCP Documentation Orchestration System

An advanced documentation orchestration system with GitHub Spec-Kit integration that maintains living documentation synchronized with code changes through intelligent drift detection and automated updates.

## 🚀 Features

### Living Documentation
- **Intelligent Synchronization**: Automatically detects code changes and updates documentation
- **Drift Detection**: Identifies when documentation diverges from implementation
- **Automated Updates**: Creates pull requests for critical documentation changes
- **Real-time Monitoring**: Continuous health monitoring and metrics

### Spec-Kit Integration
- **4-Phase Workflow**: Specify → Plan → Tasks → Implement
- **AI-Assisted Generation**: Consistent specification creation
- **Template System**: Standardized documentation formats
- **Version Control**: Full audit trail of specification changes

### Quality Assurance
- **Automated Validation**: Link checking, formatting, and content validation
- **Health Dashboard**: Real-time metrics and coverage analysis
- **CI/CD Integration**: Quality gates and automated testing
- **Comprehensive Reporting**: Detailed health and quality reports

## 📋 Quick Start

### Prerequisites
- Node.js 18+
- Git repository
- GitHub CLI (gh)
- Python 3.11+ (for Spec-Kit)

### Installation

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd mcp-documentation-orchestration
   npm install
   ```

2. **Initialize Spec-Kit**
   ```bash
   npm run docs:init
   ```

3. **Configure Git Hooks**
   ```bash
   npm run docs:setup-hooks
   ```

### Basic Usage

#### Check Documentation Health
```bash
npm run docs:health
```

#### Sync Documentation with Code
```bash
npm run docs:sync
```

#### Validate Specifications
```bash
npm run docs:validate
```

#### Run Complete Check
```bash
npm run docs:check
```

## 🏗️ Architecture

### Core Components

1. **Documentation Sync Engine** (`scripts/documentation-sync.js`)
   - Monitors Git repository for changes
   - Classifies changes by impact (critical/standard/minor)
   - Triggers automated documentation updates
   - Creates pull requests for critical changes

2. **Health Monitor** (`scripts/documentation-health.js`)
   - Calculates documentation coverage metrics
   - Detects drift between code and documentation
   - Generates quality scores and recommendations
   - Provides real-time health reporting

3. **Specification Validator** (`scripts/validate-specs.js`)
   - Validates specification completeness and consistency
   - Checks adherence to templates and standards
   - Identifies missing sections and metadata
   - Generates detailed validation reports

4. **CI/CD Integration** (`.github/workflows/`)
   - Automated synchronization on code changes
   - Quality gates and validation checks
   - Health reporting and notifications
   - Spec-Kit validation and testing

### Directory Structure

```
.
├── .specify/                 # Spec-Kit configuration
│   ├── constitution.md       # Project documentation principles
│   ├── templates/           # Specification templates
│   └── config.json          # Sync engine configuration
├── .github/                 # GitHub integration
│   ├── workflows/           # CI/CD workflows
│   ├── specify.prompt.md    # AI prompts for /specify
│   ├── plan.prompt.md       # AI prompts for /plan
│   └── tasks.prompt.md      # AI prompts for /tasks
├── specs/                   # Feature specifications
│   └── 001-*/               # Individual feature specs
├── scripts/                 # Automation scripts
│   ├── documentation-sync.js
│   ├── documentation-health.js
│   └── validate-specs.js
└── docs/                    # Generated documentation
```

## 📊 Health Metrics

The system tracks four key metrics:

### Coverage (30% weight)
- Percentage of components with documentation
- API endpoints, database models, services
- Inline documentation detection

### Freshness (25% weight)
- Age of documentation files
- Stale content identification
- Update frequency analysis

### Drift (25% weight)
- Undocumented API endpoints
- Outdated specifications
- Code-documentation misalignment

### Quality (20% weight)
- Broken links and formatting
- Spelling and grammar validation
- Template adherence

## 🔧 Configuration

### Sync Engine Configuration

Edit `.specify/config.json`:

```json
{
  "sync": {
    "enabled": true,
    "autoUpdate": true,
    "criticalChanges": {
      "autoPR": true,
      "reviewers": ["documentation-team"],
      "labels": ["documentation", "auto-generated"]
    },
    "standardChanges": {
      "notifyOnly": true,
      "slackChannel": "#documentation"
    },
    "minorChanges": {
      "backgroundUpdate": true
    }
  },
  "monitoring": {
    "healthCheckInterval": 300000,
    "driftDetection": true,
    "metricsRetention": 30
  }
}
```

### GitHub Actions

The system includes comprehensive CI/CD workflows:

- **Documentation Synchronization**: Runs on every push and PR
- **Quality Validation**: Checks formatting, links, and content
- **Spec-Kit Validation**: Validates specifications and templates
- **Health Reporting**: Generates and reports health metrics

## 📝 Specification Workflow

### 1. Specify (What & Why)
```bash
# Create new feature specification
gh issue create --title "Feature: User Authentication" --body "Use /specify command"
```

### 2. Plan (How)
```bash
# Generate technical plan
gh issue comment "Use /plan command"
```

### 3. Tasks (Breakdown)
```bash
# Create task breakdown
gh issue comment "Use /tasks command"
```

### 4. Implement (Build)
- Develop according to specifications
- Automated sync keeps documentation updated
- Quality gates ensure compliance

## 🎯 Best Practices

### Documentation Standards
- All public APIs must be documented
- Specifications precede implementation
- Use consistent formatting and templates
- Include examples and acceptance criteria

### Development Workflow
- Run `npm run docs:check` before committing
- Address documentation drift immediately
- Review auto-generated PRs promptly
- Keep specifications up to date

### Quality Assurance
- Monitor health dashboard regularly
- Address quality issues proactively
- Validate specifications before implementation
- Use automated testing for examples

## 📈 Monitoring and Alerts

### Health Dashboard
Access real-time metrics via:
```bash
npm run docs:health
```

### Automated Alerts
- Critical drift detection creates immediate PRs
- Quality below 80% triggers team notifications
- Stale documentation warnings after 30 days
- Weekly health reports to stakeholders

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Run documentation checks (`npm run docs:check`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/mcp-ecosystem/documentation-orchestration/issues)
- **Documentation**: [Project Wiki](https://github.com/mcp-ecosystem/documentation-orchestration/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/mcp-ecosystem/documentation-orchestration/discussions)

---

**Built with ❤️ by the MCP Documentation Team**