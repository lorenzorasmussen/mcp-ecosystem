// Package client provides an implementation of the MCP Client interface.
//
// This package contains the concrete client implementation that handles
// communication with MCP servers, including initialization, tool calls,
// resource access, and prompt retrieval.
package client

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/anthropic/mcp-go-sdk/internal/errors"
	"github.com/anthropic/mcp-go-sdk/internal/jsonrpc"
	"github.com/anthropic/mcp-go-sdk/internal/logging"
	"github.com/anthropic/mcp-go-sdk/mcp"
)

// Client implements the MCP Client interface.
type Client struct {
	transport mcp.Transport
	handler   *jsonrpc.Handler
	logger    logging.Logger
	mu        sync.RWMutex
	closed    bool
}

// Options contains configuration for creating a new Client.
type Options struct {
	Transport mcp.Transport
	Logger    logging.Logger
}

// New creates a new MCP client with the given options.
func New(opts Options) *Client {
	logger := opts.Logger
	if logger == nil {
		logger = logging.GetDefaultLogger()
	}

	handler := jsonrpc.NewHandler()
	client := &Client{
		transport: opts.Transport,
		handler:   handler,
		logger:    logger,
	}

	// Register default request handlers
	handler.RegisterRequestHandler("initialize", client.handleInitialize)
	handler.RegisterRequestHandler("tools/list", client.handleListTools)
	handler.RegisterRequestHandler("tools/call", client.handleCallTool)
	handler.RegisterRequestHandler("resources/list", client.handleListResources)
	handler.RegisterRequestHandler("resources/read", client.handleReadResource)
	handler.RegisterRequestHandler("prompts/list", client.handleListPrompts)
	handler.RegisterRequestHandler("prompts/get", client.handleGetPrompt)

	return client
}

// Initialize performs the MCP handshake and initializes the session.
func (c *Client) Initialize(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.closed {
		return fmt.Errorf("client is closed")
	}

	// Create initialize request
	initReq := &mcp.Request{
		JSONRPC: "2.0",
		ID:      "init-1",
		Method:  "initialize",
		Params: json.RawMessage(`{
			"protocolVersion": "2024-11-05",
			"capabilities": {
				"tools": {},
				"resources": {},
				"prompts": {}
			},
			"clientInfo": {
				"name": "mcp-go-sdk",
				"version": "1.0.0"
			}
		}`),
	}

	// Send request through transport
	data, err := json.Marshal(initReq)
	if err != nil {
		return errors.WrapError(err, "failed to marshal initialize request")
	}

	if err := c.transport.Send(ctx, data); err != nil {
		return errors.WrapError(err, "failed to send initialize request")
	}

	c.logger.Info("Initialize request sent")
	return nil
}

// ListTools retrieves available tools from the server.
func (c *Client) ListTools(ctx context.Context) ([]*mcp.Tool, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	// For now, return empty list - this would be implemented with actual server communication
	c.logger.Info("Listing tools")
	return []*mcp.Tool{}, nil
}

// CallTool executes a tool with the given arguments.
func (c *Client) CallTool(ctx context.Context, name string, args map[string]interface{}) (interface{}, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	c.logger.Info("Calling tool", "name", name)
	// Implementation would send tools/call request and return result
	return nil, fmt.Errorf("not implemented")
}

// ListResources retrieves available resources from the server.
func (c *Client) ListResources(ctx context.Context) ([]*mcp.Resource, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	c.logger.Info("Listing resources")
	return []*mcp.Resource{}, nil
}

// ReadResource reads the contents of a resource.
func (c *Client) ReadResource(ctx context.Context, uri string) (interface{}, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	c.logger.Info("Reading resource", "uri", uri)
	return nil, fmt.Errorf("not implemented")
}

// ListPrompts retrieves available prompts from the server.
func (c *Client) ListPrompts(ctx context.Context) ([]*mcp.Prompt, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	c.logger.Info("Listing prompts")
	return []*mcp.Prompt{}, nil
}

// GetPrompt retrieves a prompt with the given arguments.
func (c *Client) GetPrompt(ctx context.Context, name string, args map[string]interface{}) (*mcp.PromptMessage, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	c.logger.Info("Getting prompt", "name", name)
	return nil, fmt.Errorf("not implemented")
}

// Close terminates the client connection.
func (c *Client) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.closed {
		return nil
	}

	c.closed = true
	if c.transport != nil {
		return c.transport.Close()
	}
	return nil
}

// Request handlers for the JSON-RPC layer

func (c *Client) handleInitialize(ctx context.Context, req *mcp.Request) (*mcp.Response, error) {
	c.logger.Info("Handling initialize request")
	// This would parse the initialize params and respond accordingly
	return jsonrpc.CreateSuccessResponse(req.ID, map[string]interface{}{
		"protocolVersion": "2024-11-05",
		"capabilities": map[string]interface{}{
			"tools":     map[string]interface{}{},
			"resources": map[string]interface{}{},
			"prompts":   map[string]interface{}{},
		},
		"serverInfo": map[string]interface{}{
			"name":    "mcp-go-sdk-server",
			"version": "1.0.0",
		},
	})
}

func (c *Client) handleListTools(ctx context.Context, req *mcp.Request) (*mcp.Response, error) {
	tools := []*mcp.Tool{
		{
			Name:        "example-tool",
			Description: "An example tool for demonstration",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"input": map[string]interface{}{
						"type":        "string",
						"description": "Input text to process",
					},
				},
				"required": []string{"input"},
			},
		},
	}

	return jsonrpc.CreateSuccessResponse(req.ID, map[string]interface{}{
		"tools": tools,
	})
}

func (c *Client) handleCallTool(ctx context.Context, req *mcp.Request) (*mcp.Response, error) {
	// Parse tool call parameters
	var params struct {
		Name      string                 `json:"name"`
		Arguments map[string]interface{} `json:"arguments"`
	}

	if err := json.Unmarshal(req.Params, &params); err != nil {
		return nil, errors.NewInvalidParamsError("invalid tool call parameters")
	}

	c.logger.Info("Tool call received", "name", params.Name)

	// For demonstration, just echo the arguments
	result := map[string]interface{}{
		"result": fmt.Sprintf("Called tool %s with arguments: %v", params.Name, params.Arguments),
	}

	return jsonrpc.CreateSuccessResponse(req.ID, result)
}

func (c *Client) handleListResources(ctx context.Context, req *mcp.Request) (*mcp.Response, error) {
	resources := []*mcp.Resource{
		{
			URI:         "file:///example.txt",
			Name:        "Example Resource",
			Description: "An example resource file",
			MimeType:    "text/plain",
		},
	}

	return jsonrpc.CreateSuccessResponse(req.ID, map[string]interface{}{
		"resources": resources,
	})
}

func (c *Client) handleReadResource(ctx context.Context, req *mcp.Request) (*mcp.Response, error) {
	var params struct {
		URI string `json:"uri"`
	}

	if err := json.Unmarshal(req.Params, &params); err != nil {
		return nil, errors.NewInvalidParamsError("invalid resource read parameters")
	}

	c.logger.Info("Resource read requested", "uri", params.URI)

	// For demonstration, return example content
	content := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"uri":      params.URI,
				"mimeType": "text/plain",
				"text":     "This is the content of the example resource.",
			},
		},
	}

	return jsonrpc.CreateSuccessResponse(req.ID, content)
}

func (c *Client) handleListPrompts(ctx context.Context, req *mcp.Request) (*mcp.Response, error) {
	prompts := []*mcp.Prompt{
		{
			Name:        "example-prompt",
			Description: "An example prompt template",
			Arguments: []mcp.PromptArgument{
				{
					Name:        "topic",
					Description: "The topic to generate a prompt for",
					Required:    true,
				},
			},
		},
	}

	return jsonrpc.CreateSuccessResponse(req.ID, map[string]interface{}{
		"prompts": prompts,
	})
}

func (c *Client) handleGetPrompt(ctx context.Context, req *mcp.Request) (*mcp.Response, error) {
	var params struct {
		Name      string                 `json:"name"`
		Arguments map[string]interface{} `json:"arguments"`
	}

	if err := json.Unmarshal(req.Params, &params); err != nil {
		return nil, errors.NewInvalidParamsError("invalid prompt get parameters")
	}

	c.logger.Info("Prompt get requested", "name", params.Name)

	// For demonstration, return a simple prompt message
	promptMessage := &mcp.PromptMessage{
		Role:    "user",
		Content: fmt.Sprintf("Please provide information about: %v", params.Arguments["topic"]),
	}

	return jsonrpc.CreateSuccessResponse(req.ID, promptMessage)
}
