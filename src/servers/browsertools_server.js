#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import puppeteer from 'puppeteer';

class BrowserToolsServer {
  constructor() {
    this.server = new Server(
      {
        name: 'browsertools-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.browser = null;
    this.page = null;
    this.setupTools();
  }

  setupTools() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'browser_navigate',
            description: 'Navigate to a URL in the browser',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to navigate to',
                },
                waitUntil: {
                  type: 'string',
                  enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
                  description: 'When to consider navigation complete',
                  default: 'networkidle2',
                },
                timeout: {
                  type: 'number',
                  description: 'Navigation timeout in milliseconds',
                  default: 30000,
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'browser_screenshot',
            description: 'Take a screenshot of the current page',
            inputSchema: {
              type: 'object',
              properties: {
                format: {
                  type: 'string',
                  enum: ['png', 'jpeg'],
                  description: 'Screenshot format',
                  default: 'png',
                },
                quality: {
                  type: 'number',
                  description: 'Screenshot quality (1-100, for JPEG only)',
                  default: 80,
                },
                fullPage: {
                  type: 'boolean',
                  description: 'Whether to capture the full page',
                  default: false,
                },
                selector: {
                  type: 'string',
                  description: 'CSS selector to screenshot specific element',
                },
              },
            },
          },
          {
            name: 'browser_click',
            description: 'Click an element on the page',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector of element to click',
                },
                waitForSelector: {
                  type: 'boolean',
                  description: 'Whether to wait for selector to appear',
                  default: true,
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds',
                  default: 5000,
                },
              },
              required: ['selector'],
            },
          },
          {
            name: 'browser_type',
            description: 'Type text into an input field',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector of input field',
                },
                text: {
                  type: 'string',
                  description: 'Text to type',
                },
                clear: {
                  type: 'boolean',
                  description: 'Whether to clear field before typing',
                  default: true,
                },
                delay: {
                  type: 'number',
                  description: 'Delay between keystrokes in milliseconds',
                  default: 0,
                },
              },
              required: ['selector', 'text'],
            },
          },
          {
            name: 'browser_get_text',
            description: 'Extract text content from the page',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description:
                    'CSS selector to extract text from (optional, defaults to entire page)',
                },
                property: {
                  type: 'string',
                  description: 'Property to extract (textContent, innerText, innerHTML)',
                  default: 'textContent',
                },
              },
            },
          },
          {
            name: 'browser_wait_for',
            description: 'Wait for an element or condition',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector to wait for',
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds',
                  default: 10000,
                },
                visible: {
                  type: 'boolean',
                  description: 'Whether element should be visible',
                  default: true,
                },
              },
              required: ['selector'],
            },
          },
          {
            name: 'browser_evaluate',
            description: 'Execute JavaScript in the page context',
            inputSchema: {
              type: 'object',
              properties: {
                script: {
                  type: 'string',
                  description: 'JavaScript code to execute',
                },
                args: {
                  type: 'array',
                  description: 'Arguments to pass to the script',
                  items: { type: 'any' },
                },
              },
              required: ['script'],
            },
          },
          {
            name: 'browser_get_page_info',
            description: 'Get information about the current page',
            inputSchema: {
              type: 'object',
              properties: {
                includeMetrics: {
                  type: 'boolean',
                  description: 'Whether to include performance metrics',
                  default: false,
                },
              },
            },
          },
          {
            name: 'browser_close',
            description: 'Close the browser',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'browser_navigate':
            return await this.navigate(args);
          case 'browser_screenshot':
            return await this.screenshot(args);
          case 'browser_click':
            return await this.click(args);
          case 'browser_type':
            return await this.type(args);
          case 'browser_get_text':
            return await this.getText(args);
          case 'browser_wait_for':
            return await this.waitFor(args);
          case 'browser_evaluate':
            return await this.evaluate(args);
          case 'browser_get_page_info':
            return await this.getPageInfo(args);
          case 'browser_close':
            return await this.close(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async ensureBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: process.env.HEADLESS !== 'false',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
      });
      this.page = await this.browser.newPage();

      // Set viewport
      await this.page.setViewport({
        width: parseInt(process.env.VIEWPORT_WIDTH) || 1920,
        height: parseInt(process.env.VIEWPORT_HEIGHT) || 1080,
      });
    }
  }

  async navigate(args) {
    const { url, waitUntil = 'networkidle2', timeout = 30000 } = args;

    await this.ensureBrowser();

    try {
      await this.page.goto(url, { waitUntil, timeout });

      return {
        content: [
          {
            type: 'text',
            text: `Successfully navigated to ${url}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to navigate to ${url}: ${error.message}`);
    }
  }

  async screenshot(args) {
    const { format = 'png', quality = 80, fullPage = false, selector } = args;

    if (!this.page) {
      throw new Error('No page loaded. Please navigate to a URL first.');
    }

    try {
      const options = {
        type: format,
        fullPage,
      };

      if (format === 'jpeg') {
        options.quality = quality;
      }

      let screenshot;
      if (selector) {
        const element = await this.page.$(selector);
        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }
        screenshot = await element.screenshot(options);
      } else {
        screenshot = await this.page.screenshot(options);
      }

      // Convert to base64 for text response
      const base64 = screenshot.toString('base64');

      return {
        content: [
          {
            type: 'text',
            text: `Screenshot captured (${format} format, ${screenshot.length} bytes)`,
          },
          {
            type: 'image',
            data: base64,
            mimeType: `image/${format}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to take screenshot: ${error.message}`);
    }
  }

  async click(args) {
    const { selector, waitForSelector = true, timeout = 5000 } = args;

    if (!this.page) {
      throw new Error('No page loaded. Please navigate to a URL first.');
    }

    try {
      if (waitForSelector) {
        await this.page.waitForSelector(selector, { timeout });
      }

      await this.page.click(selector);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully clicked element: ${selector}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to click ${selector}: ${error.message}`);
    }
  }

  async type(args) {
    const { selector, text, clear = true, delay = 0 } = args;

    if (!this.page) {
      throw new Error('No page loaded. Please navigate to a URL first.');
    }

    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });

      if (clear) {
        await this.page.click(selector, { clickCount: 3 });
      }

      await this.page.type(selector, text, { delay });

      return {
        content: [
          {
            type: 'text',
            text: `Successfully typed "${text}" into ${selector}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to type in ${selector}: ${error.message}`);
    }
  }

  async getText(args) {
    const { selector, property = 'textContent' } = args;

    if (!this.page) {
      throw new Error('No page loaded. Please navigate to a URL first.');
    }

    try {
      let element;
      if (selector) {
        element = await this.page.$(selector);
        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }
      } else {
        element = this.page;
      }

      const text = await element.evaluate((el, prop) => {
        return el[prop];
      }, property);

      return {
        content: [
          {
            type: 'text',
            text: selector ? `Text from ${selector}:\n\n${text}` : `Page text:\n\n${text}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get text: ${error.message}`);
    }
  }

  async waitFor(args) {
    const { selector, timeout = 10000, visible = true } = args;

    if (!this.page) {
      throw new Error('No page loaded. Please navigate to a URL first.');
    }

    try {
      await this.page.waitForSelector(selector, { timeout, visible });

      return {
        content: [
          {
            type: 'text',
            text: `Element ${selector} is now ${visible ? 'visible' : 'present'}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to wait for ${selector}: ${error.message}`);
    }
  }

  async evaluate(args) {
    const { script, args: scriptArgs = [] } = args;

    if (!this.page) {
      throw new Error('No page loaded. Please navigate to a URL first.');
    }

    try {
      const result = await this.page.evaluate(script, ...scriptArgs);

      return {
        content: [
          {
            type: 'text',
            text: `Script result:\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to evaluate script: ${error.message}`);
    }
  }

  async getPageInfo(args) {
    const { includeMetrics = false } = args;

    if (!this.page) {
      throw new Error('No page loaded. Please navigate to a URL first.');
    }

    try {
      const info = {
        url: this.page.url(),
        title: await this.page.title(),
      };

      if (includeMetrics) {
        const metrics = await this.page.metrics();
        info.metrics = metrics;
      }

      return {
        content: [
          {
            type: 'text',
            text: `Page information:\n\n${JSON.stringify(info, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get page info: ${error.message}`);
    }
  }

  async close(args) {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
      }

      return {
        content: [
          {
            type: 'text',
            text: 'Browser closed successfully',
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to close browser: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Browser Tools MCP server running on stdio');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  if (global.browserServer) {
    await global.browserServer.cleanup();
  }
  process.exit(0);
});

// Start server
const server = new BrowserToolsServer();
global.browserServer = server;
server.run().catch(console.error);
