/**
 * Tests for Coverage Analysis System
 */

import { CoverageAnalysisSystem } from "../tools/scripts/coverage-analysis.js";
import { existsSync, writeFileSync, mkdirSync } from "fs";

describe("CoverageAnalysisSystem", () => {
  let system;

  beforeEach(() => {
    system = new CoverageAnalysisSystem({
      coverageThreshold: 80,
      generateReport: false,
      autoImprove: false,
      ciMode: true,
    });
  });

  describe("Project Detection", () => {
    it("should detect JavaScript project type", () => {
      expect(system.projectType).toBe("javascript");
    });

    it("should detect Jest test framework", () => {
      expect(system.testFramework).toBe("jest");
    });

    it("should detect Jest coverage tool", () => {
      expect(system.coverageTool).toBe("jest");
    });
  });

  describe("Configuration", () => {
    it("should use default options", () => {
      const defaultSystem = new CoverageAnalysisSystem();
      expect(defaultSystem.options.coverageThreshold).toBe(80);
      expect(defaultSystem.options.generateReport).toBe(true);
      expect(defaultSystem.options.autoImprove).toBe(false);
    });

    it("should accept custom options", () => {
      const customSystem = new CoverageAnalysisSystem({
        threshold: 90,
        improve: true,
        ci: true,
      });
      expect(customSystem.options.coverageThreshold).toBe(90);
      expect(customSystem.options.autoImprove).toBe(true);
      expect(customSystem.options.ciMode).toBe(true);
    });
  });

  describe("Metrics Initialization", () => {
    it("should initialize metrics with zeros", () => {
      expect(system.metrics.totalCoverage).toBe(0);
      expect(system.metrics.linesCoverage).toBe(0);
      expect(system.metrics.functionsCoverage).toBe(0);
      expect(system.metrics.branchesCoverage).toBe(0);
      expect(system.metrics.statementsCoverage).toBe(0);
    });

    it("should initialize empty file arrays", () => {
      expect(system.uncoveredFiles).toEqual([]);
      expect(system.lowCoverageFiles).toEqual([]);
    });
  });

  describe("Coverage Extraction", () => {
    beforeEach(() => {
      // Create mock coverage directory and file
      if (!existsSync("coverage")) {
        mkdirSync("coverage", { recursive: true });
      }

      const mockCoverage = {
        total: {
          lines: { pct: 75, covered: 150, total: 200 },
          functions: { pct: 80, covered: 16, total: 20 },
          branches: { pct: 70, covered: 14, total: 20 },
          statements: { pct: 75, covered: 150, total: 200 },
        },
        "tools/scripts/test-file.js": {
          lines: { pct: 50, covered: 10, total: 20 },
          functions: { pct: 100, covered: 2, total: 2 },
          branches: { pct: 0, covered: 0, total: 5 },
          statements: { pct: 50, covered: 10, total: 20 },
        },
        "src/uncovered.js": {
          lines: { pct: 0, covered: 0, total: 10 },
          functions: { pct: 0, covered: 0, total: 2 },
          branches: { pct: 0, covered: 0, total: 3 },
          statements: { pct: 0, covered: 0, total: 10 },
        },
      };

      writeFileSync(
        "coverage/coverage-summary.json",
        JSON.stringify(mockCoverage, null, 2),
      );
    });

    afterEach(() => {
      // Clean up mock files
      if (existsSync("coverage/coverage-summary.json")) {
        const fs = require("fs");
        fs.unlinkSync("coverage/coverage-summary.json");
      }
    });

    it("should extract JavaScript coverage metrics correctly", async () => {
      await system.extractJavaScriptCoverage();

      expect(system.metrics.totalCoverage).toBe(75);
      expect(system.metrics.linesCoverage).toBe(75);
      expect(system.metrics.functionsCoverage).toBe(80);
      expect(system.metrics.branchesCoverage).toBe(70);
      expect(system.metrics.statementsCoverage).toBe(75);
    });
  });

  describe("File Analysis", () => {
    beforeEach(() => {
      // Create mock coverage data
      if (!existsSync("coverage")) {
        mkdirSync("coverage", { recursive: true });
      }

      const mockCoverage = {
        total: {
          lines: { pct: 60, covered: 120, total: 200 },
          functions: { pct: 70, covered: 14, total: 20 },
          branches: { pct: 50, covered: 10, total: 20 },
          statements: { pct: 60, covered: 120, total: 200 },
        },
        "tools/scripts/well-covered.js": {
          lines: { pct: 90, covered: 18, total: 20 },
          functions: { pct: 100, covered: 4, total: 4 },
          branches: { pct: 80, covered: 8, total: 10 },
          statements: { pct: 90, covered: 18, total: 20 },
        },
        "src/low-coverage.js": {
          lines: { pct: 30, covered: 6, total: 20 },
          functions: { pct: 50, covered: 2, total: 4 },
          branches: { pct: 20, covered: 2, total: 10 },
          statements: { pct: 30, covered: 6, total: 20 },
        },
        "src/uncovered.js": {
          lines: { pct: 0, covered: 0, total: 15 },
          functions: { pct: 0, covered: 0, total: 3 },
          branches: { pct: 0, covered: 0, total: 5 },
          statements: { pct: 0, covered: 0, total: 15 },
        },
      };

      writeFileSync(
        "coverage/coverage-summary.json",
        JSON.stringify(mockCoverage, null, 2),
      );
    });

    afterEach(() => {
      if (existsSync("coverage/coverage-summary.json")) {
        const fs = require("fs");
        fs.unlinkSync("coverage/coverage-summary.json");
      }
    });

    it("should identify uncovered files correctly", async () => {
      await system.extractJavaScriptCoverage();
      system.analyzeJavaScriptFileCoverage();

      expect(system.uncoveredFiles).toContain("src/uncovered.js");
      expect(system.uncoveredFiles.length).toBe(1);
    });

    it("should identify low coverage files correctly", async () => {
      await system.extractJavaScriptCoverage();
      system.analyzeJavaScriptFileCoverage();

      expect(system.lowCoverageFiles).toContain("src/low-coverage.js");
      expect(system.lowCoverageFiles.length).toBe(1);
    });
  });

  describe("Test Template Generation", () => {
    it("should generate basic test template", () => {
      const template = system.generateTestTemplate("src/calculator.js");

      expect(template).toContain("import { calculator } from './calculator'");
      expect(template).toContain("describe('calculator', () => {");
      expect(template).toContain("expect(calculator).toBeDefined()");
    });

    it("should handle different file extensions", () => {
      const jsTemplate = system.generateTestTemplate("src/utils.js");
      const tsTemplate = system.generateTestTemplate("src/utils.ts");

      expect(jsTemplate).toContain("./utils.test.js");
      expect(tsTemplate).toContain("./utils.test.ts");
    });
  });

  describe("Report Generation", () => {
    it("should generate comprehensive report content", () => {
      system.metrics.totalCoverage = 75;
      system.metrics.linesCoverage = 75;
      system.metrics.functionsCoverage = 80;
      system.metrics.branchesCoverage = 70;
      system.metrics.statementsCoverage = 75;
      system.uncoveredFiles = ["src/uncovered.js"];
      system.lowCoverageFiles = ["src/low-coverage.js"];

      const report = system.generateReportContent();

      expect(report).toContain("Current Coverage: 75%");
      expect(report).toContain("Target Threshold: 80%");
      expect(report).toContain("src/uncovered.js");
      expect(report).toContain("src/low-coverage.js");
      expect(report).toContain("Coverage Analysis System");
    });
  });

  describe("GitHub Workflow Generation", () => {
    it("should generate valid GitHub Actions workflow", () => {
      const workflow = system.generateGitHubWorkflow();

      expect(workflow).toContain("name: Test Coverage");
      expect(workflow).toContain("on: [push, pull_request]");
      expect(workflow).toContain("npm run test:coverage");
      expect(workflow).toContain("codecov/codecov-action@v3");
      expect(workflow).toContain("COVERAGE_THRESHOLD=80");
    });
  });
});
