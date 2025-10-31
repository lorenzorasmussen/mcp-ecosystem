#!/usr/bin/env node

import fs from "fs";
import path from "path";

class LinkChecker {
  constructor() {
    this.issues = [];
    this.checkedFiles = new Set();
    this.projectRoot = "/Users/lorenzorasmussen/.local/share/mcp";
  }

  async checkAllMarkdownFiles() {
    const markdownFiles = this.getAllMarkdownFiles();

    console.log(`Found ${markdownFiles.length} markdown files to check...\n`);

    // Prioritize important files first
    const priorityFiles = markdownFiles.filter(
      (file) =>
        file.includes("README.md") ||
        file.includes("/docs/") ||
        file.includes("/SPECIFICATION/") ||
        file.includes("/specs/"),
    );

    const otherFiles = markdownFiles.filter(
      (file) => !priorityFiles.includes(file),
    );

    const filesToCheck = [...priorityFiles, ...otherFiles];

    for (const filePath of filesToCheck) {
      await this.checkFile(filePath);
    }

    this.generateReport();
  }

  getAllMarkdownFiles() {
    const files = [];

    function walkDir(dir) {
      try {
        const items = fs.readdirSync(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);

          try {
            const stat = fs.statSync(fullPath);

            if (
              stat.isDirectory() &&
              !item.includes("node_modules") &&
              !item.includes(".git") &&
              !item.includes(".pnpm")
            ) {
              walkDir(fullPath);
            } else if (stat.isFile() && item.endsWith(".md")) {
              files.push(fullPath);
            }
          } catch (statError) {
            // Skip files/directories that can't be accessed
          }
        }
      } catch (dirError) {
        // Skip directories that can't be read
      }
    }

    walkDir(this.projectRoot);
    return files;
  }

  async checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      console.log(`Checking: ${path.relative(this.projectRoot, filePath)}`);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // Check different types of links
        this.checkInlineLinks(line, filePath, lineNumber);
        this.checkReferenceLinks(line, filePath, lineNumber);
        this.checkImageLinks(line, filePath, lineNumber);
        this.checkAnchorLinks(line, filePath, lineNumber);
      }

      // Check reference definitions at the end
      this.checkReferenceDefinitions(content, filePath);
    } catch (error) {
      this.addIssue(
        "error",
        filePath,
        0,
        `Failed to read file: ${error.message}`,
      );
    }
  }

  checkInlineLinks(line, filePath, lineNumber) {
    // Match [text](url) format
    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(line)) !== null) {
      const url = match[2];

      if (url.startsWith("http://") || url.startsWith("https://")) {
        // External link - we'll note it but can't easily check accessibility
        this.addIssue(
          "external",
          filePath,
          lineNumber,
          `External link: ${url}`,
          "info",
        );
      } else if (url.startsWith("#")) {
        // Anchor link - check if anchor exists in current file
        this.checkAnchorInFile(url.substring(1), filePath, lineNumber);
      } else if (
        url.startsWith("./") ||
        url.startsWith("../") ||
        !url.includes("://")
      ) {
        // Internal relative link
        this.checkInternalLink(url, filePath, lineNumber);
      }
    }
  }

  checkReferenceLinks(line, filePath, lineNumber) {
    // Match [text][ref] format
    const refRegex = /\[([^\]]*)\]\[([^\]]*)\]/g;
    let match;

    while ((match = refRegex.exec(line)) !== null) {
      const ref = match[2] || match[1]; // If no second part, use first part
      this.addIssue(
        "reference",
        filePath,
        lineNumber,
        `Reference link used: [${ref}]`,
        "pending",
      );
    }
  }

  checkImageLinks(line, filePath, lineNumber) {
    // Match ![alt](url) format
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;

    while ((match = imageRegex.exec(line)) !== null) {
      const url = match[2];

      if (url.startsWith("http://") || url.startsWith("https://")) {
        this.addIssue(
          "external-image",
          filePath,
          lineNumber,
          `External image: ${url}`,
          "info",
        );
      } else {
        // Internal image
        this.checkInternalLink(url, filePath, lineNumber, "image");
      }
    }
  }

  checkAnchorLinks(line, filePath, lineNumber) {
    // Match direct anchor links like [text](#anchor)
    const anchorRegex = /\[([^\]]*)\]\(#([^)]+)\)/g;
    let match;

    while ((match = anchorRegex.exec(line)) !== null) {
      const anchor = match[2];
      this.checkAnchorInFile(anchor, filePath, lineNumber);
    }
  }

  checkInternalLink(url, filePath, lineNumber, type = "link") {
    const currentDir = path.dirname(filePath);
    let targetPath;

    if (url.startsWith("./")) {
      targetPath = path.resolve(currentDir, url.substring(2));
    } else if (url.startsWith("../")) {
      targetPath = path.resolve(currentDir, url);
    } else {
      targetPath = path.resolve(currentDir, url);
    }

    // Handle fragment identifiers (file.md#anchor)
    const [filePathPart, anchor] = targetPath.split("#");
    const actualTargetPath = filePathPart || targetPath;

    if (!fs.existsSync(actualTargetPath)) {
      this.addIssue(
        "broken-internal",
        filePath,
        lineNumber,
        `Broken internal ${type}: ${url} -> ${actualTargetPath} (file not found)`,
      );
    } else if (anchor) {
      // Check if anchor exists in the target file
      this.checkAnchorInFile(anchor, actualTargetPath, lineNumber, filePath);
    }
  }

  checkAnchorInFile(anchor, filePath, lineNumber, sourceFile = filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");

      // Convert anchor to match possible heading formats
      // GitHub-style anchors: lowercase, hyphens instead of spaces, remove punctuation
      const normalizedAnchor = anchor
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");

      // Look for headings that match the anchor
      const headingRegex = new RegExp(
        `^#{1,6}\\s+.*${anchor}|^#{1,6}\\s+.*${normalizedAnchor}`,
        "gim",
      );
      const found = headingRegex.test(content);

      if (!found) {
        // Also check for exact anchor matches
        const exactAnchorRegex = new RegExp(`{#${anchor}}`, "g");
        const exactMatch = exactAnchorRegex.test(content);

        if (!exactMatch) {
          this.addIssue(
            "broken-anchor",
            sourceFile,
            lineNumber,
            `Broken anchor: #${anchor} in ${path.relative(this.projectRoot, filePath)}`,
          );
        }
      }
    } catch (error) {
      this.addIssue(
        "error",
        sourceFile,
        lineNumber,
        `Failed to check anchor in ${path.relative(this.projectRoot, filePath)}: ${error.message}`,
      );
    }
  }

  checkReferenceDefinitions(content, filePath) {
    // Match reference definitions: [ref]: url
    const definitionRegex = /^\s*\[([^\]]+)\]:\s*(.+)$/gm;
    const definitions = new Map();
    const usedReferences = new Set();

    let match;
    while ((match = definitionRegex.exec(content)) !== null) {
      const ref = match[1];
      const url = match[2].trim();
      definitions.set(ref, url);
    }

    // Find all reference usages
    const usageRegex = /\[([^\]]+)\](?!\()\]/g;
    while ((match = usageRegex.exec(content)) !== null) {
      const ref = match[1];
      usedReferences.add(ref);
    }

    // Check for undefined references
    for (const ref of usedReferences) {
      if (!definitions.has(ref)) {
        this.addIssue(
          "undefined-reference",
          filePath,
          0,
          `Undefined reference: [${ref}]`,
        );
      }
    }

    // Check for unused definitions
    for (const [ref, url] of definitions) {
      if (!usedReferences.has(ref)) {
        this.addIssue(
          "unused-reference",
          filePath,
          0,
          `Unused reference definition: [${ref}]: ${url}`,
          "warning",
        );
      }
    }
  }

  addIssue(type, filePath, lineNumber, message, severity = "error") {
    this.issues.push({
      type,
      filePath: path.relative(this.projectRoot, filePath),
      lineNumber,
      message,
      severity,
    });
  }

  generateReport() {
    console.log("\n" + "=".repeat(80));
    console.log("LINK ANALYSIS REPORT");
    console.log("=".repeat(80));

    const errors = this.issues.filter((i) => i.severity === "error");
    const warnings = this.issues.filter((i) => i.severity === "warning");
    const info = this.issues.filter((i) => i.severity === "info");
    const pending = this.issues.filter((i) => i.severity === "pending");

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Errors: ${errors.length}`);
    console.log(`   Warnings: ${warnings.length}`);
    console.log(`   Info: ${info.length}`);
    console.log(`   Pending: ${pending.length}`);

    if (errors.length > 0) {
      console.log(`\n❌ ERRORS (${errors.length}):`);
      errors.forEach((issue) => {
        console.log(
          `   ${issue.filePath}:${issue.lineNumber} - ${issue.message}`,
        );
      });
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
      warnings.forEach((issue) => {
        console.log(
          `   ${issue.filePath}:${issue.lineNumber} - ${issue.message}`,
        );
      });
    }

    if (pending.length > 0) {
      console.log(`\n🔄 PENDING REVIEW (${pending.length}):`);
      pending.forEach((issue) => {
        console.log(
          `   ${issue.filePath}:${issue.lineNumber} - ${issue.message}`,
        );
      });
    }

    if (info.length > 0 && info.length <= 10) {
      console.log(`\nℹ️  INFO (${info.length}):`);
      info.forEach((issue) => {
        console.log(
          `   ${issue.filePath}:${issue.lineNumber} - ${issue.message}`,
        );
      });
    } else if (info.length > 10) {
      console.log(
        `\nℹ️  INFO (${info.length} external links found - not displayed)`,
      );
    }

    // Group by type for analysis
    const typeGroups = {};
    this.issues.forEach((issue) => {
      if (!typeGroups[issue.type]) {
        typeGroups[issue.type] = [];
      }
      typeGroups[issue.type].push(issue);
    });

    console.log(`\n📈 ISSUE BREAKDOWN BY TYPE:`);
    Object.entries(typeGroups).forEach(([type, issues]) => {
      console.log(`   ${type}: ${issues.length}`);
    });

    console.log("\n" + "=".repeat(80));
  }
}

// Run the checker
const checker = new LinkChecker();
checker.checkAllMarkdownFiles().catch(console.error);
