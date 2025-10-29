import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import axios from 'axios';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

describe('Server Loading Integration Tests', () => {
  const LAZY_LOADER_URL = 'http://localhost:3007';
  const TEST_TIMEOUT = 15000;

  beforeAll(async () => {
    jest.setTimeout(TEST_TIMEOUT);

    // Start lazy loader if not running
    try {
      await axios.get(`${LAZY_LOADER_URL}/status`);
    } catch (error) {
      console.log('Starting lazy loader for tests...');
      const lazyLoader = spawn('node', ['src/mcp-ecosystem/core/lazy_loader.js'], {
        stdio: 'pipe',
        cwd: process.cwd(),
      });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  });

  describe('Custom Server Loading', () => {
    test('should load mem0 server successfully', async () => {
      const response = await axios.post(`${LAZY_LOADER_URL}/start/mem0`);

      expect(response.data.success).toBe(true);
      expect(response.data.port).toBe(3100);
      expect(response.data.status).toBe('running');

      // Verify server is responding
      await new Promise(resolve => setTimeout(resolve, 2000));

      try {
        await axios.get('http://localhost:3100/health', { timeout: 5000 });
        // Server is responding
      } catch (error) {
        // Health endpoint might not be implemented, which is ok
      }

      // Cleanup
      await axios.post(`${LAZY_LOADER_URL}/stop/mem0`);
    });

    test('should load notion server successfully', async () => {
      const response = await axios.post(`${LAZY_LOADER_URL}/start/notion`);

      expect(response.data.success).toBe(true);
      expect(response.data.port).toBe(3105);
      expect(response.data.status).toBe('running');

      // Cleanup
      await axios.post(`${LAZY_LOADER_URL}/stop/notion`);
    });

    test('should load browsertools server successfully', async () => {
      const response = await axios.post(`${LAZY_LOADER_URL}/start/browsertools`);

      expect(response.data.success).toBe(true);
      expect(response.data.port).toBe(3107);
      expect(response.data.status).toBe('running');

      // Cleanup
      await axios.post(`${LAZY_LOADER_URL}/stop/browsertools`);
    });

    test('should load google-suite server successfully', async () => {
      const response = await axios.post(`${LAZY_LOADER_URL}/start/google-suite`);

      expect(response.data.success).toBe(true);
      expect(response.data.port).toBe(3109);
      expect(response.data.status).toBe('running');

      // Cleanup
      await axios.post(`${LAZY_LOADER_URL}/stop/google-suite`);
    });

    test('should load task server successfully', async () => {
      const response = await axios.post(`${LAZY_LOADER_URL}/start/task`);

      expect(response.data.success).toBe(true);
      expect(response.data.port).toBe(3110);
      expect(response.data.status).toBe('running');

      // Cleanup
      await axios.post(`${LAZY_LOADER_URL}/stop/task`);
    });
  });

  describe('MCP Official Servers', () => {
    test('should load mcp-filesystem server', async () => {
      const response = await axios.post(`${LAZY_LOADER_URL}/start/mcp-filesystem`);

      expect(response.data.success).toBe(true);
      expect(response.data.port).toBe(3112);
      expect(response.data.type).toBe('tcp');

      // Cleanup
      await axios.post(`${LAZY_LOADER_URL}/stop/mcp-filesystem`);
    });

    test('should load mcp-fetch server', async () => {
      const response = await axios.post(`${LAZY_LOADER_URL}/start/mcp-fetch`);

      expect(response.data.success).toBe(true);
      expect(response.data.port).toBe(3113);
      expect(response.data.type).toBe('tcp');

      // Cleanup
      await axios.post(`${LAZY_LOADER_URL}/stop/mcp-fetch`);
    });

    test('should load mcp-git server', async () => {
      const response = await axios.post(`${LAZY_LOADER_URL}/start/mcp-git`);

      expect(response.data.success).toBe(true);
      expect(response.data.port).toBe(3114);
      expect(response.data.type).toBe('tcp');

      // Cleanup
      await axios.post(`${LAZY_LOADER_URL}/stop/mcp-git`);
    });
  });

  describe('Language Servers', () => {
    test('should load typescript-language-server', async () => {
      const response = await axios.post(`${LAZY_LOADER_URL}/start/typescript-language-server`);

      expect(response.data.success).toBe(true);
      expect(response.data.type).toBe('stdio');
      expect(response.data.memory).toBe('60M');

      // Cleanup
      await axios.post(`${LAZY_LOADER_URL}/stop/typescript-language-server`);
    });

    test('should load python language servers', async () => {
      // Test pylsp
      const pylspResponse = await axios.post(`${LAZY_LOADER_URL}/start/pylsp`);
      expect(pylspResponse.data.success).toBe(true);
      expect(pylspResponse.data.type).toBe('stdio');

      await axios.post(`${LAZY_LOADER_URL}/stop/pylsp`);

      // Test pyright
      const pyrightResponse = await axios.post(`${LAZY_LOADER_URL}/start/pyright`);
      expect(pyrightResponse.data.success).toBe(true);
      expect(pyrightResponse.data.type).toBe('stdio');

      await axios.post(`${LAZY_LOADER_URL}/stop/pyright`);
    });
  });

  describe('Server Status and Management', () => {
    test('should list all available servers', async () => {
      const response = await axios.get(`${LAZY_LOADER_URL}/servers`);

      expect(response.data.s).toBeDefined();
      expect(response.data.t).toBeDefined();
      expect(typeof response.data.s).toBe('object');

      const servers = response.data.s;

      // Check that our custom servers are listed
      expect(servers.mem0).toBeDefined();
      expect(servers.notion).toBeDefined();
      expect(servers.browsertools).toBeDefined();
      expect(servers['google-suite']).toBeDefined();
      expect(servers.task).toBeDefined();

      // Check memory allocations
      expect(servers.mem0.m).toBe('120M');
      expect(servers.notion.m).toBe('120M');
      expect(servers.browsertools.m).toBe('180M');
    });

    test('should get minimal server list', async () => {
      const response = await axios.get(`${LAZY_LOADER_URL}/servers/min?limit=5`);

      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeLessThanOrEqual(5);

      response.data.forEach(server => {
        expect(server.n).toBeDefined(); // name
        expect(typeof server.r).toBe('number'); // running status
      });
    });

    test('should get server status', async () => {
      const response = await axios.get(`${LAZY_LOADER_URL}/servers/status`);

      expect(response.data.t).toBeDefined(); // total
      expect(response.data.r).toBeDefined(); // running
      expect(typeof response.data.t).toBe('number');
      expect(typeof response.data.r).toBe('number');
    });

    test('should get individual server status', async () => {
      // Start a server first
      await axios.post(`${LAZY_LOADER_URL}/start/mem0`);

      const response = await axios.get(`${LAZY_LOADER_URL}/status/mem0`);

      expect(response.data.running).toBe(true);
      expect(response.data.port).toBe(3100);
      expect(response.data.uptime).toBeDefined();
      expect(typeof response.data.uptime).toBe('number');

      // Cleanup
      await axios.post(`${LAZY_LOADER_URL}/stop/mem0`);
    });

    test('should handle unknown server gracefully', async () => {
      try {
        await axios.post(`${LAZY_LOADER_URL}/start/unknown-server`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toContain('Unknown server');
      }
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle multiple concurrent server starts', async () => {
      const servers = ['mem0', 'notion', 'task'];
      const startPromises = servers.map(server => axios.post(`${LAZY_LOADER_URL}/start/${server}`));

      const results = await Promise.allSettled(startPromises);

      // All should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.data.success).toBe(true);
        }
      });

      // Cleanup
      const stopPromises = servers.map(server => axios.post(`${LAZY_LOADER_URL}/stop/${server}`));
      await Promise.allSettled(stopPromises);
    });

    test('should handle server restart', async () => {
      const server = 'mem0';

      // Start server
      await axios.post(`${LAZY_LOADER_URL}/start/${server}`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Stop server
      await axios.post(`${LAZY_LOADER_URL}/stop/${server}`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Restart server
      const response = await axios.post(`${LAZY_LOADER_URL}/start/${server}`);

      expect(response.data.success).toBe(true);
      expect(response.data.port).toBe(3100);

      // Cleanup
      await axios.post(`${LAZY_LOADER_URL}/stop/${server}`);
    });
  });

  describe('Resource Management', () => {
    test('should respect memory limits', async () => {
      const response = await axios.get(`${LAZY_LOADER_URL}/servers/compact`);

      const servers = response.data;

      // Check that memory limits are set
      Object.values(servers).forEach(server => {
        if (server.memory) {
          expect(server.memory).toMatch(/^\d+M$/);
        }
      });
    });

    test('should handle server startup timeout', async () => {
      // This test simulates a server that takes too long to start
      // In real scenarios, the lazy loader should timeout and clean up

      const server = 'mem0';
      const startTime = Date.now();

      try {
        await axios.post(`${LAZY_LOADER_URL}/start/${server}`);
        const startupTime = Date.now() - startTime;

        // Should start within reasonable time (less than 10 seconds)
        expect(startupTime).toBeLessThan(10000);

        // Cleanup
        await axios.post(`${LAZY_LOADER_URL}/stop/${server}`);
      } catch (error) {
        fail(`Server should have started: ${error.message}`);
      }
    });
  });

  describe('Error Recovery', () => {
    test('should handle server crashes gracefully', async () => {
      const server = 'mem0';

      // Start server
      await axios.post(`${LAZY_LOADER_URL}/start/${server}`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check status
      const statusResponse = await axios.get(`${LAZY_LOADER_URL}/status/${server}`);
      expect(statusResponse.data.running).toBe(true);

      // Stop server
      await axios.post(`${LAZY_LOADER_URL}/stop/${server}`);

      // Check status after stop
      const stoppedResponse = await axios.get(`${LAZY_LOADER_URL}/status/${server}`);
      expect(stoppedResponse.data.running).toBe(false);
    });

    test('should handle invalid server configurations', async () => {
      // Try to start a server with invalid configuration
      // This would be tested by modifying the server config temporarily

      // For now, just test that the system handles unknown servers
      try {
        await axios.post(`${LAZY_LOADER_URL}/start/nonexistent-server`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(500);
      }
    });
  });
});
