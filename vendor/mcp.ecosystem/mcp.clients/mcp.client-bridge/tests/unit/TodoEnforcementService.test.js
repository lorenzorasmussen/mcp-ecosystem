// tests/unit/TodoEnforcementService.test.js
const TodoEnforcementService = require('../../src/services/TodoEnforcementService');
const fs = require('fs').promises;
const path = require('path');

// Mock logger to avoid console output in tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
  },
  middleware: jest.fn()
}));

// Mock fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
  }
}));

describe('TodoEnforcementService Unit Tests', () => {
  let todoService;

  beforeEach(() => {
    // Set environment variable for strict mode testing
    process.env.TODO_ENFORCEMENT_STRICT = 'false';
    todoService = new TodoEnforcementService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.TODO_ENFORCEMENT_STRICT;
  });

  describe('Initialization', () => {
    test('should initialize with default paths', () => {
      expect(todoService.sharedKnowledgePath).toContain('.mcp-shared-knowledge');
      expect(todoService.todosPath).toContain('shared_tasks.json');
      expect(todoService.strictMode).toBe(false);
    });

    test('should enable strict mode when environment variable is set', () => {
      process.env.TODO_ENFORCEMENT_STRICT = 'true';
      const strictService = new TodoEnforcementService();
      expect(strictService.strictMode).toBe(true);
    });
  });

  describe('Todo Validation', () => {
    test('should validate successfully when there are active todos', async () => {
      const mockTodos = [
        { id: '1', status: 'in_progress', content: 'Test todo for MCP' }
      ];
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockTodos));

      const result = await todoService.validateTodosForOperation('test-operation');

      expect(result.valid).toBe(true);
      expect(result.warning).toBe(false);
    });

    test('should return warning when no active todos exist in non-strict mode', async () => {
      const mockTodos = [
        { id: '1', status: 'completed', content: 'Completed todo' }
      ];
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockTodos));

      const result = await todoService.validateTodosForOperation('test-operation');

      expect(result.valid).toBe(true);
      expect(result.warning).toBe(true);
    });

    test('should throw error when no active todos exist in strict mode', async () => {
      process.env.TODO_ENFORCEMENT_STRICT = 'true';
      todoService = new TodoEnforcementService();
      
      const mockTodos = [
        { id: '1', status: 'completed', content: 'Completed todo' }
      ];
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockTodos));

      await expect(todoService.validateTodosForOperation('test-operation'))
        .rejects
        .toThrow('Todo Enforcement: MCP Bridge must have active todos before executing test-operation');
    });

    test('should find relevant todos based on operation', async () => {
      const mockTodos = [
        { id: '1', status: 'in_progress', content: 'MCP Bridge: test-operation - Test task' },
        { id: '2', status: 'in_progress', content: 'Other operation' }
      ];
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockTodos));

      const result = await todoService.validateTodosForOperation('test-operation');

      expect(result.valid).toBe(true);
      expect(result.relevantTodos).toHaveLength(1);
      expect(result.relevantTodos[0].id).toBe('1');
    });

    test('should find relevant todos based on context', async () => {
      const mockTodos = [
        { id: '1', status: 'in_progress', content: 'Work on server1' },
        { id: '2', status: 'in_progress', content: 'Other task' }
      ];
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockTodos));

      const result = await todoService.validateTodosForOperation('test-operation', { serverId: 'server1' });

      expect(result.valid).toBe(true);
      expect(result.relevantTodos).toHaveLength(1);
      expect(result.relevantTodos[0].id).toBe('1');
    });

    test('should handle file access errors gracefully', async () => {
      fs.promises.access.mockRejectedValue(new Error('File not found'));

      const result = await todoService.validateTodosForOperation('test-operation');

      expect(result.valid).toBe(true);
      expect(result.warning).toBe(true);
    });
  });

  describe('Todo Creation', () => {
    test('should create a new todo for an operation', async () => {
      const mockTodos = [
        { id: '1', status: 'completed', content: 'Completed todo' }
      ];
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockTodos));
      fs.promises.writeFile.mockResolvedValue();

      const details = {
        description: 'Test operation details',
        priority: 'high'
      };
      
      const newTodo = await todoService.createTodoForOperation('test-operation', details);

      expect(newTodo).toHaveProperty('id');
      expect(newTodo).toHaveProperty('content');
      expect(newTodo).toHaveProperty('status', 'in_progress');
      expect(newTodo).toHaveProperty('agentId', 'mcp-client-bridge');
      expect(newTodo).toHaveProperty('operation', 'test-operation');
      expect(newTodo.content).toContain('test-operation');
      expect(newTodo.priority).toBe('high');
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    test('should create todo with default values when details not provided', async () => {
      const mockTodos = [];
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockTodos));
      fs.promises.writeFile.mockResolvedValue();

      const newTodo = await todoService.createTodoForOperation('simple-operation');

      expect(newTodo.status).toBe('in_progress');
      expect(newTodo.priority).toBe('medium');
      expect(newTodo.content).toContain('simple-operation');
    });
  });

  describe('Todo Status Updates', () => {
    test('should update todo status for successful operation', async () => {
      const mockTodos = [
        { id: '1', operation: 'test-operation', status: 'in_progress', content: 'Test todo' },
        { id: '2', operation: 'other-operation', status: 'in_progress', content: 'Other todo' }
      ];
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockTodos));
      fs.promises.writeFile.mockResolvedValue();

      const result = { success: true, responseTime: 100 };
      const updatedTodo = await todoService.updateTodoStatus('test-operation', result);

      expect(updatedTodo).toBeDefined();
      expect(updatedTodo.id).toBe('1');
      expect(updatedTodo.status).toBe('completed');
      expect(updatedTodo.result).toEqual(result);
      expect(updatedTodo.updatedAt).toBeDefined();
    });

    test('should update todo status for failed operation', async () => {
      const mockTodos = [
        { id: '1', operation: 'test-operation', status: 'in_progress', content: 'Test todo' }
      ];
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockTodos));
      fs.promises.writeFile.mockResolvedValue();

      const result = { success: false, error: 'Test error' };
      const updatedTodo = await todoService.updateTodoStatus('test-operation', result);

      expect(updatedTodo.status).toBe('cancelled');
      expect(updatedTodo.result).toEqual(result);
    });

    test('should update specific todo by ID if provided', async () => {
      const mockTodos = [
        { id: '1', operation: 'test-operation', status: 'in_progress', content: 'Test todo' },
        { id: '2', operation: 'test-operation', status: 'in_progress', content: 'Another test todo' }
      ];
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockTodos));
      fs.promises.writeFile.mockResolvedValue();

      const result = { success: true };
      const updatedTodo = await todoService.updateTodoStatus('test-operation', result, '2');

      expect(updatedTodo.id).toBe('2');
      expect(updatedTodo.status).toBe('completed');
    });

    test('should return null if no matching todo found', async () => {
      const mockTodos = [
        { id: '1', operation: 'other-operation', status: 'in_progress', content: 'Other todo' }
      ];
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockTodos));

      const result = { success: true };
      const updatedTodo = await todoService.updateTodoStatus('test-operation', result);

      expect(updatedTodo).toBeNull();
    });
  });

  describe('Todo Search and Matching', () => {
    test('should find relevant todos by operation match', () => {
      const todos = [
        { content: 'MCP Bridge: test-operation - Do something' },
        { content: 'Other operation' }
      ];
      const context = {};

      const results = todoService.findRelevantTodos('test-operation', todos, context);

      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('test-operation');
    });

    test('should find relevant todos by context serverId', () => {
      const todos = [
        { content: 'Work on server1' },
        { content: 'Work on server2' }
      ];
      const context = { serverId: 'server1' };

      const results = todoService.findRelevantTodos('operation', todos, context);

      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('server1');
    });

    test('should find relevant todos by context toolName', () => {
      const todos = [
        { content: 'Work with toolA' },
        { content: 'Work with toolB' }
      ];
      const context = { toolName: 'toolA' };

      const results = todoService.findRelevantTodos('operation', todos, context);

      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('toolA');
    });

    test('should find relevant todos by MCP context', () => {
      const todos = [
        { content: 'MCP related task' },
        { content: 'Other task' }
      ];
      const context = {};

      const results = todoService.findRelevantTodos('mcp-operation', todos, context);

      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('mcp');
    });
  });

  describe('Data Management', () => {
    test('should load todos from file', async () => {
      const mockTodos = [
        { id: '1', content: 'Test todo', status: 'in_progress' }
      ];
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockTodos));

      const todos = await todoService.loadTodos();

      expect(todos).toEqual(mockTodos);
    });

    test('should return empty array if file does not exist', async () => {
      fs.promises.access.mockRejectedValue({ code: 'ENOENT' });

      const todos = await todoService.loadTodos();

      expect(todos).toEqual([]);
    });

    test('should return empty array if file reading fails', async () => {
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockRejectedValue(new Error('Read error'));

      const todos = await todoService.loadTodos();

      expect(todos).toEqual([]);
    });

    test('should save todos to file', async () => {
      const todos = [
        { id: '1', content: 'Test todo', status: 'in_progress' }
      ];
      fs.promises.mkdir.mockResolvedValue();
      fs.promises.writeFile.mockResolvedValue();

      await todoService.saveTodos(todos);

      expect(fs.promises.mkdir).toHaveBeenCalledWith(
        path.dirname(todoService.todosPath), 
        { recursive: true }
      );
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        todoService.todosPath,
        JSON.stringify(todos, null, 2)
      );
    });

    test('should throw error when saving todos fails', async () => {
      const todos = [
        { id: '1', content: 'Test todo', status: 'in_progress' }
      ];
      fs.promises.mkdir.mockResolvedValue();
      fs.promises.writeFile.mockRejectedValue(new Error('Write error'));

      await expect(todoService.saveTodos(todos)).rejects.toThrow('Write error');
    });

    test('should check if file exists', async () => {
      fs.promises.access.mockResolvedValue();

      const exists = await todoService.fileExists('test-path');

      expect(exists).toBe(true);
    });

    test('should return false if file does not exist', async () => {
      fs.promises.access.mockRejectedValue({ code: 'ENOENT' });

      const exists = await todoService.fileExists('test-path');

      expect(exists).toBe(false);
    });
  });

  describe('Compliance Metrics', () => {
    test('should calculate compliance metrics', async () => {
      const mockTodos = [
        { id: '1', agentId: 'mcp-client-bridge', status: 'in_progress', content: 'Active todo' },
        { id: '2', agentId: 'mcp-client-bridge', status: 'completed', content: 'Completed todo' },
        { id: '3', agentId: 'other-agent', status: 'completed', content: 'Other agent todo' }
      ];
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockTodos));

      const metrics = await todoService.getComplianceMetrics();

      expect(metrics.totalTodos).toBe(2); // Only MCP bridge todos
      expect(metrics.activeTodos).toBe(1);
      expect(metrics.completedTodos).toBe(1);
      expect(metrics.complianceRate).toBe(50); // 1 completed out of 2 total
    });

    test('should handle empty todos list for compliance metrics', async () => {
      fs.promises.access.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue(JSON.stringify([]));

      const metrics = await todoService.getComplianceMetrics();

      expect(metrics.totalTodos).toBe(0);
      expect(metrics.complianceRate).toBe(0);
    });
  });
});