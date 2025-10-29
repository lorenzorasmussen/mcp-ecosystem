// Package server provides an implementation of the MCP Server interface.
//
// This package contains the concrete server implementation that handles
// incoming MCP requests, manages tools, resources, and prompts, and
// communicates with MCP clients.
package server

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/anthropic/mcp-go-sdk/internal/errors"
	"github.com/anthropic/mcp-go-sdk/internal/jsonrpc"
	"github.com/anthropic/mcp-go-sdk/internal/logging"
	"github.com/anthropic/mcp-go-sdk/mcp"
)

// Server implements the MCP Server interface.
type Server struct {
	transport mcp.Transport
	handler   *jsonrpc.Handler
	logger    logging.Logger
	mu        sync.RWMutex
	closed    bool

	// Registered handlers
	tools     map[string]mcp.ToolHandler
	resources map[string]mcp.ResourceHandler
	prompts   map[string]mcp.PromptHandler
}

// Options contains configuration for creating a new Server.
type Options struct {
	Transport mcp.Transport
	Logger    logging.Logger
}

// New creates a new MCP server with the given options.
func New(opts Options) *Server {
	logger := opts.Logger
	if logger == nil {
		logger = logging.GetDefaultLogger()
	}

	handler := jsonrpc.NewHandler()
	server := &Server{
		transport: opts.Transport,
		handler:   handler,
		logger:    logger,
		tools:     make(map[string]mcp.ToolHandler),
		resources: make(map[string]mcp.ResourceHandler),
		prompts:   make(map[string]mcp.PromptHandler),
	}

	// Register default request handlers
	handler.RegisterRequestHandler("initialize", server.handleInitialize)
	handler.RegisterRequestHandler("tools/list", server.handleListTools)
	handler.RegisterRequestHandler("tools/call", server.handleCallTool)
	handler.RegisterRequestHandler("resources/list", server.handleListResources)
	handler.RegisterRequestHandler("resources/read", server.handleReadResource)
	handler.RegisterRequestHandler("prompts/list", server.handleListPrompts)
	handler.RegisterRequestHandler("prompts/get", server.handleGetPrompt)

	return server
}

// Listen starts the server and begins accepting connections.
func (s *Server) Listen(ctx context.Context) error {
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		return fmt.Errorf("server is closed")
	}
	s.mu.Unlock()

	s.logger.Info("Starting MCP server")

	// Start the transport
	if err := s.transport.Start(ctx); err != nil {
		return errors.WrapError(err, "failed to start transport")
	}

	// Listen for incoming messages
	go s.listenForMessages(ctx)

	// Keep the server alive for PM2/long-running scenarios
	go s.keepAlive(ctx)

	s.logger.Info("MCP server is listening for connections")

	// Keep the server running until context is cancelled
	<-ctx.Done()
	s.logger.Info("Server shutting down")
	return nil
}

// keepAlive keeps the server running continuously
func (s *Server) keepAlive(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			s.logger.Info("Keep-alive stopped")
			return
		case <-ticker.C:
			s.logger.Debug("Server keep-alive tick")
		}
	}
}

// RegisterTool registers a tool that clients can call.
func (s *Server) RegisterTool(name, description string, handler mcp.ToolHandler) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.tools[name] = handler
	s.logger.Info("Registered tool", "name", name, "description", description)
}

// RegisterResource registers a resource that clients can read.
func (s *Server) RegisterResource(uri string, handler mcp.ResourceHandler) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.resources[uri] = handler
	s.logger.Info("Registered resource", "uri", uri)
}

// RegisterPrompt registers a prompt that clients can get.
func (s *Server) RegisterPrompt(name, description string, handler mcp.PromptHandler) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.prompts[name] = handler
	s.logger.Info("Registered prompt", "name", name, "description", description)
}

// Close shuts down the server.
func (s *Server) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return nil
	}

	s.closed = true
	if s.transport != nil {
		return s.transport.Close()
	}
	return nil
}

// listenForMessages listens for incoming messages on the transport.
func (s *Server) listenForMessages(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			s.logger.Info("Message listener stopped")
			return
		default:
			// Receive messages from transport
			messageChan := s.transport.Receive()
			select {
			case data, ok := <-messageChan:
				if !ok {
					s.logger.Info("Transport closed, continuing to listen")
					// Don't return, keep listening for new connections
					continue
				}

				s.logger.Info("Received message", "size", len(data))
				// Handle the message (data is []byte)
				response, err := s.handler.HandleMessage(ctx, data)
				if err != nil {
					s.logger.Error("Failed to handle message", "error", err)
					continue
				}

				// Send response if we have one
				if response != nil {
					if err := s.transport.Send(ctx, response); err != nil {
						s.logger.Error("Failed to send response", "error", err)
					}
				}
			case <-ctx.Done():
				return
			}
		}
	}
}

// Request handlers

func (s *Server) handleInitialize(ctx context.Context, req *mcp.Request) (*mcp.Response, error) {
	s.logger.Info("Handling initialize request")

	// Parse initialize parameters
	var params struct {
		ProtocolVersion string                 `json:"protocolVersion"`
		Capabilities    map[string]interface{} `json:"capabilities"`
		ClientInfo      map[string]interface{} `json:"clientInfo"`
	}

	if err := json.Unmarshal(req.Params, &params); err != nil {
		return nil, errors.NewInvalidParamsError("invalid initialize parameters")
	}

	s.logger.Info("Client initialized",
		"protocolVersion", params.ProtocolVersion,
		"clientName", params.ClientInfo["name"])

	// Respond with server capabilities
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

func (s *Server) handleListTools(ctx context.Context, req *mcp.Request) (*mcp.Response, error) {
	s.logger.Info("Handling list tools request", "id", req.ID, "method", req.Method)
	s.mu.RLock()
	defer s.mu.RUnlock()

	tools := make([]*mcp.Tool, 0, len(s.tools))
	for name := range s.tools {
		// For now, create basic tool info - in a real implementation,
		// this would be stored when registering the tool
		tools = append(tools, &mcp.Tool{
			Name:        name,
			Description: fmt.Sprintf("Tool: %s", name),
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		})
	}

	s.logger.Info("Listed tools", "count", len(tools))
	return jsonrpc.CreateSuccessResponse(req.ID, map[string]interface{}{
		"tools": tools,
	})
}

func (s *Server) handleCallTool(ctx context.Context, req *mcp.Request) (*mcp.Response, error) {
	var params struct {
		Name      string                 `json:"name"`
		Arguments map[string]interface{} `json:"arguments"`
	}

	if err := json.Unmarshal(req.Params, &params); err != nil {
		return nil, errors.NewInvalidParamsError("invalid tool call parameters")
	}

	s.mu.RLock()
	_, exists := s.tools[params.Name]
	s.mu.RUnlock()

	if !exists {
		return nil, errors.NewMethodNotFoundError(params.Name)
	}

	s.logger.Info("Calling tool", "name", params.Name)

	// For now, return a simple response - in a real implementation,
	// this would call the registered handler
	result := map[string]interface{}{
		"result": fmt.Sprintf("Tool %s called successfully", params.Name),
	}

	return jsonrpc.CreateSuccessResponse(req.ID, result)
}

func (s *Server) handleListResources(ctx context.Context, req *mcp.Request) (*mcp.Response, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	resources := make([]*mcp.Resource, 0, len(s.resources))
	for uri := range s.resources {
		resources = append(resources, &mcp.Resource{
			URI:         uri,
			Name:        fmt.Sprintf("Resource: %s", uri),
			Description: "A registered resource",
			MimeType:    "application/json",
		})
	}

	s.logger.Info("Listed resources", "count", len(resources))
	return jsonrpc.CreateSuccessResponse(req.ID, map[string]interface{}{
		"resources": resources,
	})
}

func (s *Server) handleReadResource(ctx context.Context, req *mcp.Request) (*mcp.Response, error) {
	var params struct {
		URI string `json:"uri"`
	}

	if err := json.Unmarshal(req.Params, &params); err != nil {
		return nil, errors.NewInvalidParamsError("invalid resource read parameters")
	}

	s.mu.RLock()
	_, exists := s.resources[params.URI]
	s.mu.RUnlock()

	if !exists {
		return nil, errors.NewInvalidParamsError("resource not found")
	}

	s.logger.Info("Reading resource", "uri", params.URI)

	// For now, return example content - in a real implementation,
	// this would call the registered handler
	return jsonrpc.CreateSuccessResponse(req.ID, map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"uri":      params.URI,
				"mimeType": "application/json",
				"text":     fmt.Sprintf("Content of resource %s", params.URI),
			},
		},
	})
}

func (s *Server) handleListPrompts(ctx context.Context, req *mcp.Request) (*mcp.Response, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	prompts := make([]*mcp.Prompt, 0, len(s.prompts))
	for name := range s.prompts {
		prompts = append(prompts, &mcp.Prompt{
			Name:        name,
			Description: fmt.Sprintf("Prompt: %s", name),
			Arguments:   []mcp.PromptArgument{}, // Would be stored during registration
		})
	}

	s.logger.Info("Listed prompts", "count", len(prompts))
	return jsonrpc.CreateSuccessResponse(req.ID, map[string]interface{}{
		"prompts": prompts,
	})
}

func (s *Server) handleGetPrompt(ctx context.Context, req *mcp.Request) (*mcp.Response, error) {
	var params struct {
		Name      string                 `json:"name"`
		Arguments map[string]interface{} `json:"arguments"`
	}

	if err := json.Unmarshal(req.Params, &params); err != nil {
		return nil, errors.NewInvalidParamsError("invalid prompt get parameters")
	}

	s.mu.RLock()
	_, exists := s.prompts[params.Name]
	s.mu.RUnlock()

	if !exists {
		return nil, errors.NewMethodNotFoundError(params.Name)
	}

	s.logger.Info("Getting prompt", "name", params.Name)

	// For now, return example prompt - in a real implementation,
	// this would call the registered handler
	prompt := &mcp.PromptMessage{
		Role:    "user",
		Content: fmt.Sprintf("Prompt for %s with arguments: %v", params.Name, params.Arguments),
	}

	return jsonrpc.CreateSuccessResponse(req.ID, prompt)
}
