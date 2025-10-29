// Package mcp provides core interfaces and types for the Model Context Protocol (MCP) SDK.
//
// This package defines the fundamental abstractions for MCP clients, servers, and transports,
// providing a clean separation of concerns and extensibility for different implementations.
// It serves as the foundation for building MCP-compliant applications in Go.
package mcp

import "context"

// Transport represents a communication channel for MCP messages.
// It handles the low-level details of message serialization, transmission, and reception.
// Implementations may include stdio, SSE, and HTTP-based transports.
type Transport interface {
	// Start begins the transport's operation, typically starting listeners or connections.
	// The provided context can be used for cancellation and lifecycle management.
	Start(ctx context.Context) error

	// Send transmits a message through the transport.
	// The message will be serialized according to the transport's protocol.
	Send(ctx context.Context, message interface{}) error

	// Receive returns a channel for incoming messages.
	// The channel will be closed when the transport is shut down.
	Receive() <-chan []byte

	// Close shuts down the transport and releases resources.
	// It should be called to ensure proper cleanup.
	Close() error
}

// Message represents any MCP message that can be sent or received.
// It provides a common interface for requests, responses, and notifications.
type Message interface {
	// IsRequest returns true if this is a request message.
	IsRequest() bool

	// IsResponse returns true if this is a response message.
	IsResponse() bool

	// IsNotification returns true if this is a notification message.
	IsNotification() bool

	// GetID returns the message ID (for requests and responses).
	// The boolean indicates whether an ID is present.
	GetID() (string, bool)

	// GetMethod returns the method name (for requests and notifications).
	// The boolean indicates whether a method is present.
	GetMethod() (string, bool)
}

// Client represents an MCP client that can send requests and receive responses.
// It provides methods for interacting with MCP servers, including tool execution,
// resource access, and prompt retrieval.
type Client interface {
	// Initialize performs the MCP handshake and initializes the session.
	// This must be called before any other operations.
	Initialize(ctx context.Context) error

	// ListTools retrieves available tools from the server.
	// Returns a list of tools with their metadata.
	ListTools(ctx context.Context) ([]*Tool, error)

	// CallTool executes a tool with the given arguments.
	// The arguments should match the tool's input schema.
	CallTool(ctx context.Context, name string, args map[string]interface{}) (interface{}, error)

	// ListResources retrieves available resources from the server.
	// Returns a list of resources with their URIs and metadata.
	ListResources(ctx context.Context) ([]*Resource, error)

	// ReadResource reads the contents of a resource.
	// The URI should match one returned by ListResources.
	ReadResource(ctx context.Context, uri string) (interface{}, error)

	// ListPrompts retrieves available prompts from the server.
	// Returns a list of prompts with their metadata.
	ListPrompts(ctx context.Context) ([]*Prompt, error)

	// GetPrompt retrieves a prompt with the given arguments.
	// The arguments are used to populate the prompt template.
	GetPrompt(ctx context.Context, name string, args map[string]interface{}) (*PromptMessage, error)

	// Close terminates the client connection and releases resources.
	Close() error
}

// Server represents an MCP server that handles client requests.
// It listens for incoming connections and dispatches requests to registered handlers.
type Server interface {
	// Listen starts the server and begins accepting connections.
	// This blocks until the server is shut down.
	Listen(ctx context.Context) error

	// RegisterTool registers a tool that clients can call.
	// The handler will be invoked when clients call the tool.
	RegisterTool(name, description string, handler ToolHandler)

	// RegisterResource registers a resource that clients can read.
	// The handler will be invoked when clients read the resource.
	RegisterResource(uri string, handler ResourceHandler)

	// RegisterPrompt registers a prompt that clients can get.
	// The handler will be invoked when clients request the prompt.
	RegisterPrompt(name, description string, handler PromptHandler)

	// Close shuts down the server and releases resources.
	Close() error
}

// ToolHandler is a function type for handling tool calls.
// It receives the tool arguments and returns the result or an error.
type ToolHandler func(args map[string]interface{}) (interface{}, error)

// ResourceHandler is a function type for handling resource reads.
// It returns the resource content or an error.
type ResourceHandler func() (interface{}, error)

// PromptHandler is a function type for handling prompt requests.
// It receives the prompt arguments and returns the formatted prompt or an error.
type PromptHandler func(args map[string]interface{}) (*PromptMessage, error)

// Middleware allows for request/response processing in the transport layer.
// It can be used for logging, authentication, rate limiting, etc.
type Middleware interface {
	// ProcessRequest processes outgoing requests.
	// It can modify the request or return an error to stop processing.
	ProcessRequest(ctx context.Context, req Message) (Message, error)

	// ProcessResponse processes incoming responses.
	// It can modify the response or return an error to stop processing.
	ProcessResponse(ctx context.Context, resp Message) (Message, error)
}

// Logger provides logging functionality for MCP operations.
// It supports structured logging with key-value pairs.
type Logger interface {
	// Debug logs debug information, typically only visible at high verbosity.
	Debug(msg string, args ...interface{})

	// Info logs general information about normal operations.
	Info(msg string, args ...interface{})

	// Warn logs warnings that don't stop execution but may indicate issues.
	Warn(msg string, args ...interface{})

	// Error logs errors that prevent normal operation.
	Error(msg string, args ...interface{})
}

// Options contains configuration for MCP clients and servers.
// It allows customization of transport, logging, middleware, and capabilities.
type Options struct {
	// Transport specifies the transport to use for communication.
	Transport Transport

	// Logger specifies the logger to use for operations.
	Logger Logger

	// Middleware specifies middleware to apply to requests and responses.
	Middleware []Middleware

	// Capabilities specifies the client's or server's capabilities.
	// This is sent during initialization to negotiate features.
	Capabilities map[string]interface{}
}
