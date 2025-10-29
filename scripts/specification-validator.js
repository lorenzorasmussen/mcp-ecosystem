#!/usr/bin/env node

/**
 * MCP Specification Validator
 *
 * Validates that all development aligns with the MCP specification
 * as defined in SPECIFICATION.md and related documents.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SpecificationValidator {
  constructor() {
    this.specPath = path.join(process.cwd(), "SPECIFICATION.md");
    this.specDir = path.join(process.cwd(), "SPECIFICATION");
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  async validate() {
    console.log("🔍 Starting MCP Specification Validation...\n");

    // Core validation checks
    await this.validateSpecificationExists();
    await this.validateSpecificationStructure();
    await this.validateConstitution();
    await this.validateTemplates();
    await this.validateDocumentationAlignment();
    await this.validateCodeCompliance();

    // Generate report
    this.generateReport();
  }

  async validateSpecificationExists() {
    console.log("📋 Checking specification files...");

    if (!fs.existsSync(this.specPath)) {
      this.errors.push("SPECIFICATION.md not found at project root");
      return;
    }

    if (!fs.existsSync(this.specDir)) {
      this.errors.push("SPECIFICATION/ directory not found");
      return;
    }

    this.info.push("✅ Main specification files found");
  }

  async validateSpecificationStructure() {
    console.log("🏗️ Validating specification structure...");

    const specContent = fs.readFileSync(this.specPath, "utf8");

    // Check required sections
    const requiredSections = [
      "Purpose & Scope",
      "Specification Structure",
      "Specification Lifecycle",
      "Compliance & Validation",
      "Architecture Overview",
      "Development Standards",
      "Governance",
    ];

    for (const section of requiredSections) {
      if (!specContent.includes(section)) {
        this.errors.push(`Missing required section: ${section}`);
      }
    }

    // Check for source of truth declaration
    if (!specContent.includes("Source of Truth")) {
      this.warnings.push(
        "Specification should declare itself as source of truth",
      );
    }

    this.info.push("✅ Specification structure validated");
  }

  async validateConstitution() {
    console.log("📜 Validating constitution...");

    const constitutionPath = path.join(this.specDir, "constitution.md");
    if (!fs.existsSync(constitutionPath)) {
      this.errors.push(
        "Constitution not found in SPECIFICATION/constitution.md",
      );
      return;
    }

    const constitutionContent = fs.readFileSync(constitutionPath, "utf8");

    // Check core principles
    const requiredPrinciples = [
      "Documentation as Code",
      "Living Documentation",
      "Single Source of Truth",
      "Developer Experience First",
    ];

    for (const principle of requiredPrinciples) {
      if (!constitutionContent.includes(principle)) {
        this.warnings.push(`Constitution missing principle: ${principle}`);
      }
    }

    this.info.push("✅ Constitution validated");
  }

  async validateTemplates() {
    console.log("📝 Validating specification templates...");

    const templatesDir = path.join(this.specDir, "templates");
    const requiredTemplates = [
      "spec-template.md",
      "plan-template.md",
      "tasks-template.md",
    ];

    for (const template of requiredTemplates) {
      const templatePath = path.join(templatesDir, template);
      if (!fs.existsSync(templatePath)) {
        this.errors.push(`Missing template: ${template}`);
        continue;
      }

      const templateContent = fs.readFileSync(templatePath, "utf8");

      // Check for template placeholders
      if (template === "spec-template.md") {
        const requiredFields = [
          "{{FEATURE_NAME}}",
          "{{USER_STORY_TITLE}}",
          "{{SPEC_ID}}",
        ];
        for (const field of requiredFields) {
          if (!templateContent.includes(field)) {
            this.warnings.push(`Template ${template} missing field: ${field}`);
          }
        }
      }
    }

    this.info.push("✅ Templates validated");
  }

  async validateDocumentationAlignment() {
    console.log("📚 Validating documentation alignment...");

    // Check if README references specification
    const readmePath = path.join(process.cwd(), "README.md");
    if (fs.existsSync(readmePath)) {
      const readmeContent = fs.readFileSync(readmePath, "utf8");
      if (!readmeContent.includes("SPECIFICATION.md")) {
        this.warnings.push(
          "README.md should reference SPECIFICATION.md as source of truth",
        );
      }
    }

    // Check docs directory structure
    const docsDir = path.join(process.cwd(), "docs");
    if (fs.existsSync(docsDir)) {
      const requiredDocs = ["architecture", "api", "development"];
      for (const doc of requiredDocs) {
        const docPath = path.join(docsDir, doc);
        if (!fs.existsSync(docPath)) {
          this.warnings.push(`Missing documentation directory: docs/${doc}`);
        }
      }
    }

    this.info.push("✅ Documentation alignment validated");
  }

  async validateCodeCompliance() {
    console.log("💻 Validating code compliance...");

    // Check for package.json and scripts
    const packageJsonPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      // Check for specification-related scripts
      const requiredScripts = ["docs:validate-spec", "docs:check", "docs:sync"];

      for (const script of requiredScripts) {
        if (!packageJson.scripts || !packageJson.scripts[script]) {
          this.warnings.push(`Missing npm script: ${script}`);
        }
      }
    }

    // Check for .gitignore compliance
    const gitignorePath = path.join(process.cwd(), ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
      const requiredIgnores = ["node_modules", ".env", "*.log"];

      for (const ignore of requiredIgnores) {
        if (!gitignoreContent.includes(ignore)) {
          this.warnings.push(`.gitignore should include: ${ignore}`);
        }
      }
    }

    this.info.push("✅ Code compliance validated");
  }

  generateReport() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 SPECIFICATION VALIDATION REPORT");
    console.log("=".repeat(60));

    // Summary
    const totalIssues = this.errors.length + this.warnings.length;
    const status = this.errors.length === 0 ? "✅ PASS" : "❌ FAIL";

    console.log(`\n📈 SUMMARY:`);
    console.log(`Status: ${status}`);
    console.log(`Errors: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}`);
    console.log(`Info: ${this.info.length}`);
    console.log(`Total Issues: ${totalIssues}`);

    // Errors
    if (this.errors.length > 0) {
      console.log(`\n❌ ERRORS (${this.errors.length}):`);
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log(`\n⚠️ WARNINGS (${this.warnings.length}):`);
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }

    // Info
    if (this.info.length > 0) {
      console.log(`\n✅ INFO (${this.info.length}):`);
      this.info.forEach((info, index) => {
        console.log(`  ${index + 1}. ${info}`);
      });
    }

    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    if (this.errors.length > 0) {
      console.log("  • Fix all errors before proceeding with development");
      console.log("  • Ensure SPECIFICATION.md is complete and accurate");
      console.log("  • Verify all templates are properly configured");
    }
    if (this.warnings.length > 0) {
      console.log("  • Address warnings to improve specification quality");
      console.log("  • Consider adding missing documentation sections");
      console.log("  • Review and update development scripts");
    }
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log("  • Specification is in excellent condition");
      console.log("  • Continue with specification-driven development");
    }

    console.log("\n" + "=".repeat(60));

    // Exit with appropriate code
    process.exit(this.errors.length > 0 ? 1 : 0);
  }
}

// CLI interface
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const validator = new SpecificationValidator();
  validator.validate().catch((error) => {
    console.error("❌ Validation failed:", error.message);
    process.exit(1);
  });
}

export default SpecificationValidator;
