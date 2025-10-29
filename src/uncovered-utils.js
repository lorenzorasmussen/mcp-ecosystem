/**
 * Utility functions with no test coverage
 * This file is intentionally uncovered to demonstrate the coverage analysis system
 */

export class StringUtils {
  /**
   * Convert string to title case
   * @param {string} str
   * @returns {string}
   */
  static toTitleCase(str) {
    if (!str || typeof str !== "string") {
      return "";
    }
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
    );
  }

  /**
   * Check if string is palindrome
   * @param {string} str
   * @returns {boolean}
   */
  static isPalindrome(str) {
    if (!str || typeof str !== "string") {
      return false;
    }
    const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, "");
    return cleaned === cleaned.split("").reverse().join("");
  }

  /**
   * Generate random string
   * @param {number} length
   * @returns {string}
   */
  static randomString(length = 10) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Truncate string to specified length
   * @param {string} str
   * @param {number} length
   * @param {string} suffix
   * @returns {string}
   */
  static truncate(str, length = 50, suffix = "...") {
    if (!str || typeof str !== "string") {
      return "";
    }
    if (str.length <= length) {
      return str;
    }
    return str.substring(0, length - suffix.length) + suffix;
  }
}

export class NumberUtils {
  /**
   * Check if number is prime
   * @param {number} num
   * @returns {boolean}
   */
  static isPrime(num) {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;

    for (let i = 5; i * i <= num; i += 6) {
      if (num % i === 0 || num % (i + 2) === 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calculate factorial
   * @param {number} num
   * @returns {number}
   */
  static factorial(num) {
    if (num < 0) {
      throw new Error("Factorial is not defined for negative numbers");
    }
    if (num === 0 || num === 1) {
      return 1;
    }
    let result = 1;
    for (let i = 2; i <= num; i++) {
      result *= i;
    }
    return result;
  }

  /**
   * Calculate greatest common divisor
   * @param {number} a
   * @param {number} b
   * @returns {number}
   */
  static gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }

  /**
   * Generate Fibonacci sequence
   * @param {number} n
   * @returns {Array}
   */
  static fibonacci(n) {
    if (n <= 0) return [];
    if (n === 1) return [0];
    if (n === 2) return [0, 1];

    const sequence = [0, 1];
    for (let i = 2; i < n; i++) {
      sequence.push(sequence[i - 1] + sequence[i - 2]);
    }
    return sequence;
  }
}

export class ArrayUtils {
  /**
   * Remove duplicates from array
   * @param {Array} arr
   * @returns {Array}
   */
  static unique(arr) {
    if (!Array.isArray(arr)) {
      return [];
    }
    return [...new Set(arr)];
  }

  /**
   * Shuffle array
   * @param {Array} arr
   * @returns {Array}
   */
  static shuffle(arr) {
    if (!Array.isArray(arr)) {
      return [];
    }
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Chunk array into smaller arrays
   * @param {Array} arr
   * @param {number} size
   * @returns {Array}
   */
  static chunk(arr, size = 2) {
    if (!Array.isArray(arr) || size <= 0) {
      return [];
    }
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Flatten nested array
   * @param {Array} arr
   * @param {number} depth
   * @returns {Array}
   */
  static flatten(arr, depth = 1) {
    if (!Array.isArray(arr)) {
      return [];
    }
    return depth > 0
      ? arr.reduce(
          (flat, item) =>
            flat.concat(
              Array.isArray(item) ? this.flatten(item, depth - 1) : item,
            ),
          [],
        )
      : arr.slice();
  }
}

export default {
  StringUtils,
  NumberUtils,
  ArrayUtils,
};
