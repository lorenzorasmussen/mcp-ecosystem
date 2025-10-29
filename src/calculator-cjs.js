/**
 * Simple calculator utility for testing coverage - CommonJS version
 */

class Calculator {
  constructor() {
    this.history = [];
  }

  /**
   * Add two numbers
   * @param {number} a
   * @param {number} b
   * @returns {number}
   */
  add(a, b) {
    const result = a + b;
    this.history.push({ operation: "add", a, b, result });
    return result;
  }

  /**
   * Subtract two numbers
   * @param {number} a
   * @param {number} b
   * @returns {number}
   */
  subtract(a, b) {
    const result = a - b;
    this.history.push({ operation: "subtract", a, b, result });
    return result;
  }

  /**
   * Multiply two numbers
   * @param {number} a
   * @param {number} b
   * @returns {number}
   */
  multiply(a, b) {
    const result = a * b;
    this.history.push({ operation: "multiply", a, b, result });
    return result;
  }

  /**
   * Divide two numbers
   * @param {number} a
   * @param {number} b
   * @returns {number}
   * @throws {Error} When dividing by zero
   */
  divide(a, b) {
    if (b === 0) {
      throw new Error("Division by zero is not allowed");
    }

    const result = a / b;
    this.history.push({ operation: "divide", a, b, result });
    return result;
  }

  /**
   * Calculate percentage
   * @param {number} value
   * @param {number} total
   * @returns {number}
   */
  percentage(value, total) {
    if (total === 0) {
      return 0;
    }
    return (value / total) * 100;
  }

  /**
   * Get operation history
   * @returns {Array}
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Validate input numbers
   * @param {number} num
   * @returns {boolean}
   */
  isValidNumber(num) {
    return typeof num === "number" && !isNaN(num) && isFinite(num);
  }

  /**
   * Safe arithmetic operation with validation
   * @param {string} operation
   * @param {number} a
   * @param {number} b
   * @returns {number}
   */
  safeOperation(operation, a, b) {
    if (!this.isValidNumber(a) || !this.isValidNumber(b)) {
      throw new Error("Invalid numbers provided");
    }

    switch (operation) {
      case "add":
        return this.add(a, b);
      case "subtract":
        return this.subtract(a, b);
      case "multiply":
        return this.multiply(a, b);
      case "divide":
        return this.divide(a, b);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
}

module.exports = { Calculator };
