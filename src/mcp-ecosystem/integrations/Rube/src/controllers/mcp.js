/**
 * MCP Controller for Rube MCP Server
 * Implements Model Context Protocol specification
 */

const { logger } = require('../utils/logger');
const { toolService } = require('../services/toolService');
const { resourceService } = require('../services/resourceService');
const { promptService } = require('../services/promptService');
const { validate } = require('../utils/validation');

const mcpController = {
  // List all available tools
  async listTools(req, res, next) {
    try {
      const tools = await toolService.listTools(req.user?.id);
      res.json({
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        })),
        // Add pagination if needed
      });
    } catch (error) {
      next(error);
    }
  },

  // Get specific tool details
  async getTool(req, res, next) {
    try {
      const { toolId } = req.params;
      
      // Validate toolId
      const toolIdValidation = validate('toolId', toolId);
      if (!toolIdValidation.valid) {
        const error = new Error('Invalid tool ID format');
        error.statusCode = 400;
        error.code = 'INVALID_TOOL_ID';
        error.validationErrors = toolIdValidation.errors;
        return next(error);
      }
      
      const tool = await toolService.getTool(toolId, req.user?.id);
      
      if (!tool) {
        const error = new Error(`Tool ${toolId} not found`);
        error.statusCode = 404;
        error.code = 'TOOL_NOT_FOUND';
        return next(error);
      }
      
      res.json({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      });
    } catch (error) {
      next(error);
    }
  },

  // Execute a tool
  async callTool(req, res, next) {
    try {
      const { toolId } = req.params;
      const { arguments: args } = req.body;
      
      // Validate toolId
      const toolIdValidation = validate('toolId', toolId);
      if (!toolIdValidation.valid) {
        const error = new Error('Invalid tool ID format');
        error.statusCode = 400;
        error.code = 'INVALID_TOOL_ID';
        error.validationErrors = toolIdValidation.errors;
        return next(error);
      }
      
      // Validate input against tool schema
      await toolService.validateToolInput(toolId, args);
      
      // Execute the tool
      const result = await toolService.executeTool(toolId, args, req.user?.id);
      
      res.json({
        result,
        is_error: false,
      });
    } catch (error) {
      next(error);
    }
  },

  // List all resources
  async listResources(req, res, next) {
    try {
      const resources = await resourceService.listResources(req.user?.id);
      res.json({
        resources: resources.map(resource => ({
          id: resource.id,
          name: resource.name,
          uri: resource.uri,
          created_at: resource.createdAt,
          updated_at: resource.updatedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  },

  // Get specific resource
  async getResource(req, res, next) {
    try {
      const { resourceId } = req.params;
      
      // Validate resourceId
      const resourceIdValidation = validate('resourceId', resourceId);
      if (!resourceIdValidation.valid) {
        const error = new Error('Invalid resource ID format');
        error.statusCode = 400;
        error.code = 'INVALID_RESOURCE_ID';
        error.validationErrors = resourceIdValidation.errors;
        return next(error);
      }
      
      const resource = await resourceService.getResource(resourceId, req.user?.id);
      
      if (!resource) {
        const error = new Error(`Resource ${resourceId} not found`);
        error.statusCode = 404;
        error.code = 'RESOURCE_NOT_FOUND';
        return next(error);
      }
      
      res.json({
        id: resource.id,
        name: resource.name,
        uri: resource.uri,
        content: resource.content,
        created_at: resource.createdAt,
        updated_at: resource.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  },

  // Create a resource
  async createResource(req, res, next) {
    try {
      const { name, uri, content } = req.body;
      
      // Validate required fields
      if (!name) {
        const error = new Error('Resource name is required');
        error.statusCode = 400;
        error.code = 'MISSING_RESOURCE_NAME';
        return next(error);
      }
      
      // Validate name
      const nameValidation = validate('name', name);
      if (!nameValidation.valid) {
        const error = new Error('Invalid resource name');
        error.statusCode = 400;
        error.code = 'INVALID_RESOURCE_NAME';
        error.validationErrors = nameValidation.errors;
        return next(error);
      }
      
      // Validate URI if provided
      if (uri) {
        const uriValidation = validate('uri', uri);
        if (!uriValidation.valid) {
          const error = new Error('Invalid resource URI');
          error.statusCode = 400;
          error.code = 'INVALID_RESOURCE_URI';
          error.validationErrors = uriValidation.errors;
          return next(error);
        }
      }
      
      // Validate content if provided
      if (content) {
        const contentValidation = validate('content', content);
        if (!contentValidation.valid) {
          const error = new Error('Invalid resource content');
          error.statusCode = 400;
          error.code = 'INVALID_RESOURCE_CONTENT';
          error.validationErrors = contentValidation.errors;
          return next(error);
        }
      }
      
      const resource = await resourceService.createResource({
        name,
        uri,
        content,
        userId: req.user?.id,
      });
      
      res.status(201).json({
        id: resource.id,
        name: resource.name,
        uri: resource.uri,
        created_at: resource.createdAt,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update a resource
  async updateResource(req, res, next) {
    try {
      const { resourceId } = req.params;
      const updates = req.body;
      
      // Validate resourceId
      const resourceIdValidation = validate('resourceId', resourceId);
      if (!resourceIdValidation.valid) {
        const error = new Error('Invalid resource ID format');
        error.statusCode = 400;
        error.code = 'INVALID_RESOURCE_ID';
        error.validationErrors = resourceIdValidation.errors;
        return next(error);
      }
      
      // Validate updates
      if (updates.name !== undefined) {
        const nameValidation = validate('name', updates.name);
        if (!nameValidation.valid) {
          const error = new Error('Invalid resource name');
          error.statusCode = 400;
          error.code = 'INVALID_RESOURCE_NAME';
          error.validationErrors = nameValidation.errors;
          return next(error);
        }
      }
      
      if (updates.uri !== undefined) {
        const uriValidation = validate('uri', updates.uri);
        if (!uriValidation.valid) {
          const error = new Error('Invalid resource URI');
          error.statusCode = 400;
          error.code = 'INVALID_RESOURCE_URI';
          error.validationErrors = uriValidation.errors;
          return next(error);
        }
      }
      
      if (updates.content !== undefined) {
        const contentValidation = validate('content', updates.content);
        if (!contentValidation.valid) {
          const error = new Error('Invalid resource content');
          error.statusCode = 400;
          error.code = 'INVALID_RESOURCE_CONTENT';
          error.validationErrors = contentValidation.errors;
          return next(error);
        }
      }
      
      const resource = await resourceService.updateResource(
        resourceId, 
        updates, 
        req.user?.id
      );
      
      if (!resource) {
        const error = new Error(`Resource ${resourceId} not found`);
        error.statusCode = 404;
        error.code = 'RESOURCE_NOT_FOUND';
        return next(error);
      }
      
      res.json({
        id: resource.id,
        name: resource.name,
        uri: resource.uri,
        updated_at: resource.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete a resource
  async deleteResource(req, res, next) {
    try {
      const { resourceId } = req.params;
      
      // Validate resourceId
      const resourceIdValidation = validate('resourceId', resourceId);
      if (!resourceIdValidation.valid) {
        const error = new Error('Invalid resource ID format');
        error.statusCode = 400;
        error.code = 'INVALID_RESOURCE_ID';
        error.validationErrors = resourceIdValidation.errors;
        return next(error);
      }
      
      const deleted = await resourceService.deleteResource(
        resourceId, 
        req.user?.id
      );
      
      if (!deleted) {
        const error = new Error(`Resource ${resourceId} not found`);
        error.statusCode = 404;
        error.code = 'RESOURCE_NOT_FOUND';
        return next(error);
      }
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  // List resource templates
  async listResourceTemplates(req, res, next) {
    try {
      const templates = await resourceService.listResourceTemplates();
      res.json({
        resource_templates: templates.map(template => ({
          name: template.name,
          description: template.description,
          mime_type: template.mimeType,
        })),
      });
    } catch (error) {
      next(error);
    }
  },

  // Get specific resource template
  async getResourceTemplate(req, res, next) {
    try {
      const { templateId } = req.params;
      
      // Validate templateId
      const templateIdValidation = validate('templateId', templateId);
      if (!templateIdValidation.valid) {
        const error = new Error('Invalid resource template ID format');
        error.statusCode = 400;
        error.code = 'INVALID_TEMPLATE_ID';
        error.validationErrors = templateIdValidation.errors;
        return next(error);
      }
      
      const template = await resourceService.getResourceTemplate(templateId);
      
      if (!template) {
        const error = new Error(`Resource template ${templateId} not found`);
        error.statusCode = 404;
        error.code = 'RESOURCE_TEMPLATE_NOT_FOUND';
        return next(error);
      }
      
      res.json({
        name: template.name,
        description: template.description,
        mime_type: template.mimeType,
        properties: template.properties,
      });
    } catch (error) {
      next(error);
    }
  },

  // List prompts
  async listPrompts(req, res, next) {
    try {
      const prompts = await promptService.listPrompts();
      res.json({
        prompts: prompts.map(prompt => ({
          name: prompt.name,
          description: prompt.description,
        })),
      });
    } catch (error) {
      next(error);
    }
  },

  // Get specific prompt
  async getPrompt(req, res, next) {
    try {
      const { promptId } = req.params;
      
      // Validate promptId
      const promptIdValidation = validate('promptId', promptId);
      if (!promptIdValidation.valid) {
        const error = new Error('Invalid prompt ID format');
        error.statusCode = 400;
        error.code = 'INVALID_PROMPT_ID';
        error.validationErrors = promptIdValidation.errors;
        return next(error);
      }
      
      const prompt = await promptService.getPrompt(promptId);
      
      if (!prompt) {
        const error = new Error(`Prompt ${promptId} not found`);
        error.statusCode = 404;
        error.code = 'PROMPT_NOT_FOUND';
        return next(error);
      }
      
      res.json({
        name: prompt.name,
        description: prompt.description,
        template: prompt.template,
      });
    } catch (error) {
      next(error);
    }
  },

  // Expand a prompt
  async expandPrompt(req, res, next) {
    try {
      const { promptId } = req.params;
      const { arguments: args } = req.body;
      
      // Validate promptId
      const promptIdValidation = validate('promptId', promptId);
      if (!promptIdValidation.valid) {
        const error = new Error('Invalid prompt ID format');
        error.statusCode = 400;
        error.code = 'INVALID_PROMPT_ID';
        error.validationErrors = promptIdValidation.errors;
        return next(error);
      }
      
      const expandedPrompt = await promptService.expandPrompt(promptId, args);
      
      res.json({
        expanded: expandedPrompt,
      });
    } catch (error) {
      next(error);
    }
  },

  // Stream response for streamable HTTP
  async streamResponse(req, res, next) {
    try {
      const { toolId, arguments: args } = req.body;
      
      // Validate toolId
      const toolIdValidation = validate('toolId', toolId);
      if (!toolIdValidation.valid) {
        const error = new Error('Invalid tool ID format');
        error.statusCode = 400;
        error.code = 'INVALID_TOOL_ID';
        error.validationErrors = toolIdValidation.errors;
        return next(error);
      }
      
      // Set up streaming response following Server-Sent Events format
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Transfer-Encoding', 'chunked');
      
      // Execute tool with streaming
      const stream = await toolService.executeToolStream(toolId, args, req.user?.id);
      
      // Pipe the stream to the response following SSE format
      stream.on('data', (data) => {
        res.write(data);
      });
      
      stream.on('end', () => {
        // Stream already ended with completion event
        res.end();
      });
      
      stream.on('error', (error) => {
        logger.error('Stream error:', error);
        // Error already sent via stream
        res.end();
      });
      
    } catch (error) {
      next(error);
    }
  },
};

module.exports = {
  mcpController,
};