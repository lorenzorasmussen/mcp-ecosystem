// Mock data for testing MCP Client Bridge

// Mock server configurations
const mockServerConfig = {
  id: 'test-server',
  url: 'http://localhost:8080',
  timeout: 5000,
  headers: {
    'Authorization': 'Bearer test-token',
    'Content-Type': 'application/json'
  }
};

// Mock tool calls
const mockToolCall = {
  tool_name: 'read_file',
  parameters: {
    path: './test.txt'
  }
};

// Mock natural language requests
const mockNaturalLanguageRequests = [
  'Read the file README.md',
  'Store this in memory: User prefers Python for AI projects',
  'Create a task to review the MCP client bridge implementation',
  'Fetch the content from https://example.com'
];

// Mock server responses
const mockServerResponse = {
  success: true,
  data: {
    content: 'This is test file content',
    metadata: {
      size: 1024,
      modified: '2024-10-29T10:00:00Z'
    }
  }
};

// Mock discovery results
const mockDiscoveryResults = [
  {
    serverId: 'mcp.filesystem',
    serverName: 'File System Bridge',
    serverDescription: 'MCP bridge for file system operations',
    category: 'System',
    matchingTools: [
      {
        name: 'read_file',
        description: 'Read a file from the file system',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true
          }
        ]
      }
    ]
  }
];

// Mock metrics
const mockMetrics = {
  totalRequests: 10,
  successfulRequests: 8,
  failedRequests: 2,
  requestHistory: [
    {
      timestamp: '2024-10-29T10:00:00Z',
      request: 'Read the file README.md',
      result: true,
      serverId: 'mcp.filesystem',
      intent: 'read_file'
    }
  ],
  serverStats: {
    'mcp.filesystem': {
      requests: 5,
      successful: 4,
      failed: 1,
      avgResponseTime: 150
    }
  },
  performanceMetrics: {}
};

// Mock agent state
const mockAgentState = {
  lastStartup: '2024-10-29T10:00:00Z',
  lastShutdown: null,
  status: 'running',
  uptime: 0
};

// Mock cache stats
const mockCacheStats = {
  hits: 5,
  misses: 3,
  evictions: 0
};

module.exports = {
  mockServerConfig,
  mockToolCall,
  mockNaturalLanguageRequests,
  mockServerResponse,
  mockDiscoveryResults,
  mockMetrics,
  mockAgentState,
  mockCacheStats
};