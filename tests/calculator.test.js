/**
 * Calculator tests - partial coverage for demonstration
 */

import { Calculator } from "../src/calculator.js";

describe("Calculator", () => {
  let calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  describe("Basic Operations", () => {
    it("should add two numbers correctly", () => {
      expect(calculator.add(2, 3)).toBe(5);
      expect(calculator.add(-1, 1)).toBe(0);
    });

    it("should subtract two numbers correctly", () => {
      expect(calculator.subtract(5, 3)).toBe(2);
      expect(calculator.subtract(0, 5)).toBe(-5);
    });

    it("should multiply two numbers correctly", () => {
      expect(calculator.multiply(3, 4)).toBe(12);
      expect(calculator.multiply(-2, 3)).toBe(-6);
    });

    it("should divide two numbers correctly", () => {
      expect(calculator.divide(10, 2)).toBe(5);
      expect(calculator.divide(-6, 3)).toBe(-2);
    });

    it("should throw error when dividing by zero", () => {
      expect(() => calculator.divide(5, 0)).toThrow(
        "Division by zero is not allowed",
      );
    });
  });

  describe("History Management", () => {
    it("should track operation history", () => {
      calculator.add(2, 3);
      calculator.subtract(5, 2);

      const history = calculator.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({
        operation: "add",
        a: 2,
        b: 3,
        result: 5,
      });
    });

    it("should clear history", () => {
      calculator.add(1, 2);
      calculator.clearHistory();
      expect(calculator.getHistory()).toHaveLength(0);
    });
  });

  // Note: We're intentionally not testing some methods to demonstrate coverage gaps
  // - percentage method
  // - isValidNumber method
  // - safeOperation method
});
