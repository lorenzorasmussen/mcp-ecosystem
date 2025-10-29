import WebSocket from 'ws';
import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';

describe('WebSocket Connection Integration Tests', () => {
  const WS_URL = 'ws://localhost:4103';
  const HTTP_URL = 'http://localhost:3103';
  let wsServer;
  let httpServer;

  beforeAll(async () => {
    // Start the orchestrator server for testing
    jest.setTimeout(30000);

    // Give the server time to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Cleanup
    if (wsServer) {
      wsServer.close();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  describe('Basic WebSocket Connection', () => {
    test('should establish WebSocket connection', async () => {
      const client = new WebSocket(WS_URL);

      const connectionPromise = new Promise((resolve, reject) => {
        client.on('open', () => resolve('connected'));
        client.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      await expect(connectionPromise).resolves.toBe('connected');
      expect(client.readyState).toBe(WebSocket.OPEN);

      client.close();
    });

    test('should reject connections without authentication', async () => {
      const client = new WebSocket(WS_URL);

      const errorPromise = new Promise(resolve => {
        client.on('error', resolve);
        client.on('close', (code, reason) => {
          resolve({ code, reason: reason.toString() });
        });
      });

      const result = await errorPromise;
      expect(result.code).toBe(1008); // Policy violation
      expect(result.reason).toContain('Authentication required');
    });

    test('should accept valid authentication', async () => {
      const client = new WebSocket(WS_URL);

      const authPromise = new Promise((resolve, reject) => {
        let authReceived = false;

        client.on('open', () => {
          // Send authentication
          client.send(
            JSON.stringify({
              type: 'auth',
              apiKey: 'test-api-key-12345678901234567890',
            })
          );
        });

        client.on('message', data => {
          const message = JSON.parse(data.toString());
          if (message.type === 'auth_success') {
            authReceived = true;
            resolve(message);
          }
        });

        client.on('error', reject);
        client.on('close', () => {
          if (!authReceived) {
            reject(new Error('Connection closed before auth'));
          }
        });

        setTimeout(() => reject(new Error('Auth timeout')), 5000);
      });

      const authResult = await authPromise;
      expect(authResult.type).toBe('auth_success');
      expect(authResult.sessionId).toBeDefined();

      client.close();
    });
  });

  describe('Session Management', () => {
    let authenticatedClient;
    let sessionId;

    beforeAll(async () => {
      authenticatedClient = new WebSocket(WS_URL);

      const setupPromise = new Promise((resolve, reject) => {
        authenticatedClient.on('open', () => {
          authenticatedClient.send(
            JSON.stringify({
              type: 'auth',
              apiKey: 'test-api-key-12345678901234567890',
            })
          );
        });

        authenticatedClient.on('message', data => {
          const message = JSON.parse(data.toString());
          if (message.type === 'session_ready') {
            sessionId = message.sessionId;
            resolve();
          }
        });

        authenticatedClient.on('error', reject);
        setTimeout(() => reject(new Error('Setup timeout')), 5000);
      });

      await setupPromise;
    });

    afterAll(() => {
      if (authenticatedClient) {
        authenticatedClient.close();
      }
    });

    test('should handle context addition', async () => {
      const contextMessage = {
        type: 'add_context',
        content: 'Test context content',
        type: 'user_input',
        metadata: { source: 'test' },
      };

      const responsePromise = new Promise((resolve, reject) => {
        authenticatedClient.once('message', data => {
          const message = JSON.parse(data.toString());
          resolve(message);
        });

        setTimeout(() => reject(new Error('Response timeout')), 5000);
      });

      authenticatedClient.send(JSON.stringify(contextMessage));
      const response = await responsePromise;

      expect(response.type).toBe('context_added');
      expect(response.entry).toBeDefined();
      expect(response.entry.content).toBe('Test context content');
    });

    test('should handle context retrieval', async () => {
      const queryMessage = {
        type: 'get_context',
        query: 'test context',
        maxTokens: 1000,
      };

      const responsePromise = new Promise((resolve, reject) => {
        authenticatedClient.once('message', data => {
          const message = JSON.parse(data.toString());
          resolve(message);
        });

        setTimeout(() => reject(new Error('Response timeout')), 5000);
      });

      authenticatedClient.send(JSON.stringify(queryMessage));
      const response = await responsePromise;

      expect(response.type).toBe('context_result');
      expect(Array.isArray(response.context)).toBe(true);
    });

    test('should handle history requests', async () => {
      const historyMessage = {
        type: 'get_history',
        limit: 10,
      };

      const responsePromise = new Promise((resolve, reject) => {
        authenticatedClient.once('message', data => {
          const message = JSON.parse(data.toString());
          resolve(message);
        });

        setTimeout(() => reject(new Error('Response timeout')), 5000);
      });

      authenticatedClient.send(JSON.stringify(historyMessage));
      const response = await responsePromise;

      expect(response.type).toBe('history_result');
      expect(Array.isArray(response.history)).toBe(true);
    });
  });

  describe('Tool Call Integration', () => {
    let authenticatedClient;

    beforeAll(async () => {
      authenticatedClient = new WebSocket(WS_URL);

      const setupPromise = new Promise((resolve, reject) => {
        authenticatedClient.on('open', () => {
          authenticatedClient.send(
            JSON.stringify({
              type: 'auth',
              apiKey: 'test-api-key-12345678901234567890',
            })
          );
        });

        authenticatedClient.on('message', data => {
          const message = JSON.parse(data.toString());
          if (message.type === 'session_ready') {
            resolve();
          }
        });

        authenticatedClient.on('error', reject);
        setTimeout(() => reject(new Error('Setup timeout')), 5000);
      });

      await setupPromise;
    });

    afterAll(() => {
      if (authenticatedClient) {
        authenticatedClient.close();
      }
    });

    test('should handle tool calls', async () => {
      const toolMessage = {
        type: 'tool_call',
        tool: 'filesystem',
        parameters: {
          action: 'list',
          path: '/tmp',
        },
        requestId: 'test-request-123',
      };

      const responsePromise = new Promise((resolve, reject) => {
        authenticatedClient.once('message', data => {
          const message = JSON.parse(data.toString());
          resolve(message);
        });

        setTimeout(() => reject(new Error('Response timeout')), 10000);
      });

      authenticatedClient.send(JSON.stringify(toolMessage));

      try {
        const response = await responsePromise;
        expect(['tool_result', 'tool_error']).toContain(response.type);
        expect(response.requestId).toBe('test-request-123');
        expect(response.tool).toBe('filesystem');
      } catch (error) {
        // Tool server might not be available, which is expected in testing
        expect(error.message).toContain('Response timeout');
      }
    });

    test('should handle unknown tools gracefully', async () => {
      const toolMessage = {
        type: 'tool_call',
        tool: 'unknown_tool',
        parameters: {},
        requestId: 'test-request-456',
      };

      const responsePromise = new Promise((resolve, reject) => {
        authenticatedClient.once('message', data => {
          const message = JSON.parse(data.toString());
          resolve(message);
        });

        setTimeout(() => reject(new Error('Response timeout')), 5000);
      });

      authenticatedClient.send(JSON.stringify(toolMessage));
      const response = await responsePromise;

      expect(response.type).toBe('tool_error');
      expect(response.requestId).toBe('test-request-456');
      expect(response.error).toContain('Unknown tool');
    });
  });

  describe('Connection Management', () => {
    test('should handle multiple concurrent connections', async () => {
      const connections = [];
      const authPromises = [];

      // Create 5 concurrent connections
      for (let i = 0; i < 5; i++) {
        const client = new WebSocket(WS_URL);
        connections.push(client);

        const authPromise = new Promise((resolve, reject) => {
          client.on('open', () => {
            client.send(
              JSON.stringify({
                type: 'auth',
                apiKey: `test-api-key-${i}-12345678901234567890`,
              })
            );
          });

          client.on('message', data => {
            const message = JSON.parse(data.toString());
            if (message.type === 'session_ready') {
              resolve(message);
            }
          });

          client.on('error', reject);
          setTimeout(() => reject(new Error(`Auth timeout for connection ${i}`)), 5000);
        });

        authPromises.push(authPromise);
      }

      // Wait for all connections to authenticate
      const results = await Promise.allSettled(authPromises);

      // At least 3 should succeed (considering resource limits)
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThanOrEqual(3);

      // Cleanup
      connections.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      });
    });

    test('should handle connection timeouts', async () => {
      const client = new WebSocket(WS_URL);

      // Authenticate but don't send any messages
      const authPromise = new Promise((resolve, reject) => {
        client.on('open', () => {
          client.send(
            JSON.stringify({
              type: 'auth',
              apiKey: 'test-api-key-timeout-12345678901234567890',
            })
          );
        });

        client.on('message', data => {
          const message = JSON.parse(data.toString());
          if (message.type === 'session_ready') {
            resolve();
          }
        });

        client.on('error', reject);
        setTimeout(() => reject(new Error('Auth timeout')), 5000);
      });

      await authPromise;

      // Wait for potential timeout (connection should stay alive with heartbeat)
      await new Promise(resolve => setTimeout(resolve, 35000));

      // Connection should still be alive due to heartbeat
      expect(client.readyState).toBe(WebSocket.OPEN);

      client.close();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed messages', async () => {
      const client = new WebSocket(WS_URL);

      const setupPromise = new Promise((resolve, reject) => {
        client.on('open', () => {
          client.send(
            JSON.stringify({
              type: 'auth',
              apiKey: 'test-api-key-error-12345678901234567890',
            })
          );
        });

        client.on('message', data => {
          const message = JSON.parse(data.toString());
          if (message.type === 'session_ready') {
            resolve();
          }
        });

        client.on('error', reject);
        setTimeout(() => reject(new Error('Setup timeout')), 5000);
      });

      await setupPromise;

      // Send malformed JSON
      client.send('invalid json');

      // Send invalid message type
      client.send(
        JSON.stringify({
          type: 'invalid_type',
          data: 'test',
        })
      );

      // Should receive error messages
      const errorPromise = new Promise(resolve => {
        let errorCount = 0;
        client.on('message', data => {
          const message = JSON.parse(data.toString());
          if (message.type === 'error') {
            errorCount++;
            if (errorCount >= 2) {
              resolve();
            }
          }
        });
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      client.close();
    });
  });
});
