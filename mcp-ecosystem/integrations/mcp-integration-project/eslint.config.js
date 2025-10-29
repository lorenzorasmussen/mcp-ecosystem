import js from "@eslint/js";
import unicorn from "eslint-plugin-unicorn";

export default [
  js.configs.recommended,
  unicorn.configs.recommended,
  {
    rules: {
      // additional rules
    },
  },
];
