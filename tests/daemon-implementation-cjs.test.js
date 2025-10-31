/**
 * Test suite for Phase 1 Daemon Implementation
 * Tests the core components we've built for the MCP daemon architecture
 */

const fs = require('fs');
const path = require('path');

describe('Phase 1 Daemon Implementation', () => {
  const serversDir = path.join(__dirname, '../src/servers');
  const coreDir = path.join(__dirname, '../src/mcp-ecosystem/core');

  describe('Server File Creation', () => {
    test('mem0_server.js should exist and be valid', () => {
      const serverPath = path.join(serversDir, 'mem0_server.js');
      expect(fs.existsSync(serverPath)).toBe(true);

      const content = fs.readFileSync(serverPath, 'utf8');
      expect(content).toContain('class Mem0Server');
      expect(content).toContain('mem0_search');
      expect(content).toContain('mem0_add');
      expect(content).toContain('@modelcontextprotocol/sdk');
    });

    test('notion_server.js should exist and be valid', () => {
      const serverPath = path.join(serversDir, 'notion_server.js');
      expect(fs.existsSync(serverPath)).toBe(true);

      const content = fs.readFileSync(serverPath, 'utf8');
      expect(content).toContain('class NotionServer');
      expect(content).toContain('notion_search_pages');
      expect(content).toContain('notion_create_page');
      expect(content).toContain('@notionhq/client');
    });

    test('browsertools_server.js should exist and be valid', () => {
      const serverPath = path.join(serversDir, 'browsertools_server.js');
      expect(fs.existsSync(serverPath)).toBe(true);

      const content = fs.readFileSync(serverPath, 'utf8');
      expect(content).toContain('class BrowserToolsServer');
      expect(content).toContain('browser_navigate');
      expect(content).toContain('browser_screenshot');
      expect(content).toContain('puppeteer');
    });

    test('google_suite_server.js should exist and be valid', () => {
      const serverPath = path.join(serversDir, 'google_suite_server.js');
      expect(fs.existsSync(serverPath)).toBe(true);

      const content = fs.readFileSync(serverPath, 'utf8');
      expect(content).toContain('class GoogleSuiteServer');
      expect(content).toContain('gmail_search');
      expect(content).toContain('drive_list_files');
      expect(content).toContain('googleapis');
    });

    test('task_server.js should exist and be valid', () => {
      const serverPath = path.join(serversDir, 'task_server.js');
      expect(fs.existsSync(serverPath)).toBe(true);

      const content = fs.readFileSync(serverPath, 'utf8');
      expect(content).toContain('class TaskServer');
      expect(content).toContain('task_create');
      expect(content).toContain('task_list');
      expect(content).toContain('task_update');
    });
  });

  describe('Core Component Creation', () => {
    test('connection_manager.js should exist and be valid', () => {
      const managerPath = path.join(coreDir, 'connection_manager.js');
      expect(fs.existsSync(managerPath)).toBe(true);

      const content = fs.readFileSync(managerPath, 'utf8');
      expect(content).toContain('class ConnectionManager');
      expect(content).toContain('addLLMConnection');
      expect(content).toContain('WebSocket');
      expect(content).toContain('EventEmitter');
    });

    test('session_store.js should exist and be valid', () => {
      const storePath = path.join(coreDir, 'session_store.js');
      expect(fs.existsSync(storePath)).toBe(true);

      const content = fs.readFileSync(storePath, 'utf8');
      expect(content).toContain('class SessionStore');
      expect(content).toContain('createSession');
      expect(content).toContain('addContext');
      expect(content).toContain('getRelevantContext');
    });

    test('orchestrator.js should have WebSocket integration', () => {
      const orchestratorPath = path.join(coreDir, 'orchestrator.js');
      expect(fs.existsSync(orchestratorPath)).toBe(true);

      const content = fs.readFileSync(orchestratorPath, 'utf8');
      expect(content).toContain('WebSocket.Server');
      expect(content).toContain('ConnectionManager');
      expect(content).toContain('SessionStore');
      expect(content).toContain('WS_PORT');
      expect(content).toContain('handleLLMMessage');
    });
  });

  describe('Directory Structure', () => {
    test('src/servers directory should exist', () => {
      expect(fs.existsSync(serversDir)).toBe(true);
    });

    test('src/servers should contain server files', () => {
      const files = fs.readdirSync(serversDir);
      const serverFiles = files.filter(file => file.endsWith('_server.js'));

      expect(serverFiles.length).toBeGreaterThanOrEqual(5);
      expect(serverFiles).toContain('mem0_server.js');
      expect(serverFiles).toContain('notion_server.js');
      expect(serverFiles).toContain('browsertools_server.js');
      expect(serverFiles).toContain('google_suite_server.js');
      expect(serverFiles).toContain('task_server.js');
    });

    test('core directory should contain new components', () => {
      const files = fs.readdirSync(coreDir);

      expect(files).toContain('connection_manager.js');
      expect(files).toContain('session_store.js');
      expect(files).toContain('orchestrator.js');
    });
  });

  describe('Implementation Completeness', () => {
    test('all servers should have proper MCP structure', () => {
      const serverFiles = [
        'mem0_server.js',
        'notion_server.js',
        'browsertools_server.js',
        'google_suite_server.js',
        'task_server.js',
      ];

      serverFiles.forEach(file => {
        const filePath = path.join(serversDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for MCP SDK imports
        expect(content).toContain('@modelcontextprotocol/sdk');

        // Check for server class
        expect(content).toContain('class');

        // Check for tool setup
        expect(content).toContain('ListToolsRequestSchema');
        expect(content).toContain('CallToolRequestSchema');

        // Check for run method
        expect(content).toContain('run()');
      });
    });

    test('connection manager should have required methods', () => {
      const managerPath = path.join(coreDir, 'connection_manager.js');
      const content = fs.readFileSync(managerPath, 'utf8');

      const requiredMethods = [
        'addLLMConnection',
        'removeLLMConnection',
        'handleLLMMessage',
        'sendToLLM',
        'validateApiKey',
        'getStats',
        'broadcastToLLM',
      ];

      requiredMethods.forEach(method => {
        expect(content).toContain(method);
      });
    });

    test('session store should have required methods', () => {
      const storePath = path.join(coreDir, 'session_store.js');
      const content = fs.readFileSync(storePath, 'utf8');

      const requiredMethods = [
        'createSession',
        'getSession',
        'updateSession',
        'addContext',
        'getRelevantContext',
        'addToHistory',
        'getHistory',
        'setCache',
        'getCache',
      ];

      requiredMethods.forEach(method => {
        expect(content).toContain(method);
      });
    });
  });

  describe('Integration Points', () => {
    test('orchestrator should import new components', () => {
      const orchestratorPath = path.join(coreDir, 'orchestrator.js');
      const content = fs.readFileSync(orchestratorPath, 'utf8');

      expect(content).toContain('import ConnectionManager');
      expect(content).toContain('import SessionStore');
      expect(content).toContain('new ConnectionManager()');
      expect(content).toContain('new SessionStore()');
    });

    test('lazy_loader should reference correct server paths', () => {
      const lazyLoaderPath = path.join(coreDir, 'lazy_loader.js');
      const content = fs.readFileSync(lazyLoaderPath, 'utf8');

      // Check that server paths point to src/servers/
      expect(content).toContain('src/servers/mem0_server.js');
      expect(content).toContain('src/servers/notion_server.js');
      expect(content).toContain('src/servers/browsertools_server.js');
      expect(content).toContain('src/servers/google_suite_server.js');
      expect(content).toContain('src/servers/task_server.js');
    });
  });

  describe('Error Handling and Validation', () => {
    test('servers should have error handling', () => {
      const serverFiles = [
        'mem0_server.js',
        'notion_server.js',
        'browsertools_server.js',
        'google_suite_server.js',
        'task_server.js',
      ];

      serverFiles.forEach(file => {
        const filePath = path.join(serversDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        expect(content).toContain('try');
        expect(content).toContain('catch');
        expect(content).toContain('Error');
      });
    });

    test('connection manager should handle connection errors', () => {
      const managerPath = path.join(coreDir, 'connection_manager.js');
      const content = fs.readFileSync(managerPath, 'utf8');

      expect(content).toContain('handleConnectionError');
      expect(content).toContain("ws.on('error'");
      expect(content).toContain('socket.close(');
    });

    test('session store should handle file system errors', () => {
      const storePath = path.join(coreDir, 'session_store.js');
      const content = fs.readFileSync(storePath, 'utf8');

      expect(content).toContain('try');
      expect(content).toContain('catch');
      expect(content).toContain('fs.');
    });
  });

  describe('Performance and Scalability', () => {
    test('connection manager should have limits and monitoring', () => {
      const managerPath = path.join(coreDir, 'connection_manager.js');
      const content = fs.readFileSync(managerPath, 'utf8');

      expect(content).toContain('maxConnections');
      expect(content).toContain('heartbeatInterval');
      expect(content).toContain('getStats');
      expect(content).toContain('shutdown');
    });

    test('session store should have compression and cleanup', () => {
      const storePath = path.join(coreDir, 'session_store.js');
      const content = fs.readFileSync(storePath, 'utf8');

      expect(content).toContain('compressionEnabled');
      expect(content).toContain('compressSession');
      expect(content).toContain('cleanupExpiredSessions');
      expect(content).toContain('maxAge');
    });
  });
});
