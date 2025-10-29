/**
 * Input validation utilities for Rube MCP Server
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Common schemas
const schemas = {
  // User ID validation
  userId: {
    type: 'string',
    minLength: 1,
    maxLength: 100,
  },
  
  // Tool ID validation
  toolId: {
    type: 'string',
    minLength: 1,
    maxLength: 100,
    pattern: '^[a-zA-Z0-9_-]+$',
  },
  
  // Resource ID validation
  resourceId: {
    type: 'string',
    minLength: 1,
    maxLength: 100,
    pattern: '^[a-zA-Z0-9_-]+$',
  },
  
  // Resource template ID validation
  templateId: {
    type: 'string',
    minLength: 1,
    maxLength: 100,
    pattern: '^[a-zA-Z0-9_-]+$',
  },
  
  // Prompt ID validation
  promptId: {
    type: 'string',
    minLength: 1,
    maxLength: 100,
    pattern: '^[a-zA-Z0-9_-]+$',
  },
  
  // App ID validation
  appId: {
    type: 'string',
    minLength: 1,
    maxLength: 50,
    pattern: '^[a-z0-9_-]+$',
  },
  
  // Email validation
  email: {
    type: 'string',
    format: 'email',
    maxLength: 254,
  },
  
  // Generic name/title validation
  name: {
    type: 'string',
    minLength: 1,
    maxLength: 200,
  },
  
  // Generic description validation
  description: {
    type: 'string',
    maxLength: 1000,
  },
  
  // URI validation
  uri: {
    type: 'string',
    format: 'uri',
    maxLength: 2000,
  },
  
  // Content validation
  content: {
    type: 'string',
    maxLength: 100000, // 100KB max
  },
};

// Add all schemas to AJV
Object.keys(schemas).forEach(key => {
  ajv.addSchema(schemas[key], key);
});

/**
 * Validates data against a schema
 * @param {string|object} schema - Schema name or schema object
 * @param {any} data - Data to validate
 * @returns {object} - Validation result with valid flag and errors if any
 */
function validate(schema, data) {
  try {
    const isValid = typeof schema === 'string' 
      ? ajv.validate(schema, data)
      : ajv.validate(schema, data);
    
    return {
      valid: isValid,
      errors: isValid ? null : ajv.errors,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [{ message: error.message }],
    };
  }
}

/**
 * Middleware for validating request parameters
 */
function validateParams(validationRules) {
  return (req, res, next) => {
    if (validationRules.params) {
      const paramValidation = validate(validationRules.params, req.params);
      if (!paramValidation.valid) {
        const error = new Error('Invalid parameters');
        error.statusCode = 400;
        error.code = 'INVALID_PARAMETERS';
        error.validationErrors = paramValidation.errors;
        return next(error);
      }
    }
    
    if (validationRules.query) {
      const queryValidation = validate(validationRules.query, req.query);
      if (!queryValidation.valid) {
        const error = new Error('Invalid query parameters');
        error.statusCode = 400;
        error.code = 'INVALID_QUERY_PARAMETERS';
        error.validationErrors = queryValidation.errors;
        return next(error);
      }
    }
    
    if (validationRules.body) {
      const bodyValidation = validate(validationRules.body, req.body);
      if (!bodyValidation.valid) {
        const error = new Error('Invalid request body');
        error.statusCode = 400;
        error.code = 'INVALID_REQUEST_BODY';
        error.validationErrors = bodyValidation.errors;
        return next(error);
      }
    }
    
    next();
  };
}

module.exports = {
  validate,
  validateParams,
  schemas,
};