#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';

class GoogleSuiteServer {
  constructor() {
    this.server = new Server(
      {
        name: 'google-suite-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupAuth();
    this.setupTools();
  }

  setupAuth() {
    // Setup Google authentication
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentials) {
      console.warn('GOOGLE_APPLICATION_CREDENTIALS not set, some features may not work');
    }

    // Initialize Google APIs
    this.gmail = google.gmail({ version: 'v1' });
    this.drive = google.drive({ version: 'v3' });
    this.docs = google.docs({ version: 'v1' });
    this.sheets = google.sheets({ version: 'v4' });
  }

  setupTools() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'gmail_search',
            description: 'Search Gmail messages',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Gmail search query',
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of results',
                  default: 10,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'gmail_send',
            description: 'Send an email via Gmail',
            inputSchema: {
              type: 'object',
              properties: {
                to: {
                  type: 'string',
                  description: 'Recipient email address',
                },
                subject: {
                  type: 'string',
                  description: 'Email subject',
                },
                body: {
                  type: 'string',
                  description: 'Email body',
                },
                cc: {
                  type: 'string',
                  description: 'CC recipients (optional)',
                },
                bcc: {
                  type: 'string',
                  description: 'BCC recipients (optional)',
                },
              },
              required: ['to', 'subject', 'body'],
            },
          },
          {
            name: 'drive_list_files',
            description: 'List files in Google Drive',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for files',
                },
                pageSize: {
                  type: 'number',
                  description: 'Number of files to return',
                  default: 10,
                },
                orderBy: {
                  type: 'string',
                  description: 'Sort order',
                  default: 'modifiedTime desc',
                },
              },
            },
          },
          {
            name: 'drive_upload',
            description: 'Upload a file to Google Drive',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to file to upload',
                },
                fileName: {
                  type: 'string',
                  description: 'Name for the file in Drive',
                },
                parents: {
                  type: 'array',
                  description: 'Folder IDs to upload to',
                  items: { type: 'string' },
                },
              },
              required: ['filePath', 'fileName'],
            },
          },
          {
            name: 'docs_create',
            description: 'Create a Google Doc',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Document title',
                },
                content: {
                  type: 'string',
                  description: 'Document content',
                },
              },
              required: ['title'],
            },
          },
          {
            name: 'sheets_create',
            description: 'Create a Google Sheet',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Sheet title',
                },
                data: {
                  type: 'array',
                  description: 'Sheet data (2D array)',
                  items: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
              required: ['title'],
            },
          },
          {
            name: 'sheets_read',
            description: 'Read data from a Google Sheet',
            inputSchema: {
              type: 'object',
              properties: {
                spreadsheetId: {
                  type: 'string',
                  description: 'Spreadsheet ID',
                },
                range: {
                  type: 'string',
                  description: 'Range to read (e.g., "Sheet1!A1:C10")',
                  default: 'Sheet1!A1:Z1000',
                },
              },
              required: ['spreadsheetId'],
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
          case 'gmail_search':
            return await this.searchGmail(args);
          case 'gmail_send':
            return await this.sendGmail(args);
          case 'drive_list_files':
            return await this.listDriveFiles(args);
          case 'drive_upload':
            return await this.uploadToDrive(args);
          case 'docs_create':
            return await this.createDoc(args);
          case 'sheets_create':
            return await this.createSheet(args);
          case 'sheets_read':
            return await this.readSheet(args);
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

  async searchGmail(args) {
    const { query, maxResults = 10 } = args;

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });

      const messages = [];
      if (response.data.messages) {
        for (const message of response.data.messages) {
          const msg = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Date', 'To'],
          });

          messages.push({
            id: msg.data.id,
            subject: this.getHeader(msg.data, 'Subject'),
            from: this.getHeader(msg.data, 'From'),
            date: this.getHeader(msg.data, 'Date'),
            to: this.getHeader(msg.data, 'To'),
            snippet: msg.data.snippet,
          });
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `Found ${messages.length} messages:\n\n${JSON.stringify(messages, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to search Gmail: ${error.message}`);
    }
  }

  async sendGmail(args) {
    const { to, subject, body, cc, bcc } = args;

    try {
      const email = [`To: ${to}`, `Subject: ${subject}`];

      if (cc) email.push(`Cc: ${cc}`);
      if (bcc) email.push(`Bcc: ${bcc}`);

      email.push('', body);

      const encodedMessage = Buffer.from(email.join('\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      return {
        content: [
          {
            type: 'text',
            text: `Email sent successfully. Message ID: ${response.data.id}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async listDriveFiles(args) {
    const { query, pageSize = 10, orderBy = 'modifiedTime desc' } = args;

    try {
      const response = await this.drive.files.list({
        q: query,
        pageSize,
        orderBy,
        fields: 'files(id, name, mimeType, size, modifiedTime, createdTime, parents)',
      });

      return {
        content: [
          {
            type: 'text',
            text: `Found ${response.data.files.length} files:\n\n${JSON.stringify(response.data.files, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to list Drive files: ${error.message}`);
    }
  }

  async uploadToDrive(args) {
    const { filePath, fileName, parents } = args;

    try {
      const fs = await import('fs');
      const media = {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(filePath),
      };

      const requestBody = {
        name: fileName,
      };

      if (parents && parents.length > 0) {
        requestBody.parents = parents;
      }

      const response = await this.drive.files.create({
        requestBody,
        media,
        fields: 'id,name,size,mimeType,createdTime',
      });

      return {
        content: [
          {
            type: 'text',
            text: `File uploaded successfully:\n\n${JSON.stringify(response.data, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async createDoc(args) {
    const { title, content = '' } = args;

    try {
      const response = await this.docs.documents.create({
        requestBody: {
          title,
        },
      });

      if (content) {
        await this.docs.documents.batchUpdate({
          documentId: response.data.documentId,
          requestBody: {
            requests: [
              {
                insertText: {
                  location: {
                    index: 1,
                  },
                  text: content,
                },
              },
            ],
          },
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: `Document created successfully:\n\n${JSON.stringify(response.data, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }

  async createSheet(args) {
    const { title, data } = args;

    try {
      const response = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title,
          },
        },
      });

      const spreadsheetId = response.data.spreadsheetId;

      if (data && data.length > 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'Sheet1!A1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: data,
          },
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: `Sheet created successfully:\n\n${JSON.stringify(response.data, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to create sheet: ${error.message}`);
    }
  }

  async readSheet(args) {
    const { spreadsheetId, range = 'Sheet1!A1:Z1000' } = args;

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Sheet data:\n\n${JSON.stringify(response.data, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to read sheet: ${error.message}`);
    }
  }

  getHeader(message, headerName) {
    const header = message.payload.headers.find(h => h.name === headerName);
    return header ? header.value : '';
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Google Suite MCP server running on stdio');
  }
}

// Start server
const server = new GoogleSuiteServer();
server.run().catch(console.error);
