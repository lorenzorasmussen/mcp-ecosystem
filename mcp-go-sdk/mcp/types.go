// Package mcp provides core types for the Model Context Protocol (MCP) SDK.
//
// This file defines the data structures used in MCP messages, including tools,
// resources, prompts, and other protocol-specific types. These types are used
// for JSON serialization and deserialization of MCP protocol messages.
package mcp

import (
	"encoding/json"
	"fmt"
)

// Tool represents a tool that can be called by MCP clients.
// Tools are functions that clients can invoke with specific arguments.
type Tool struct {
	// Name is the unique identifier for the tool.
	// It must be unique within the server's namespace.
	Name string `json:"name"`

	// Description provides a human-readable description of the tool.
	// It explains what the tool does and how to use it.
	Description string `json:"description"`

	// InputSchema defines the expected input format for the tool.
	// It's a JSON schema that describes the required and optional arguments.
	InputSchema map[string]interface{} `json:"inputSchema"`
}

// Resource represents a resource that can be read by MCP clients.
// Resources are static or dynamic data that clients can access by URI.
type Resource struct {
	// URI is the unique identifier for the resource.
	// It follows URI syntax and can reference files, APIs, or other data sources.
	URI string `json:"uri"`

	// Name is a human-readable name for the resource.
	// Optional, used for display purposes.
	Name string `json:"name,omitempty"`

	// Description provides details about the resource.
	// Explains what the resource contains and how it can be used.
	Description string `json:"description,omitempty"`

	// MimeType specifies the MIME type of the resource content.
	// Helps clients understand how to interpret the data.
	MimeType string `json:"mimeType,omitempty"`
}

// Prompt represents a prompt template that can be used by MCP clients.
// Prompts are reusable templates that can be filled with arguments.
type Prompt struct {
	// Name is the unique identifier for the prompt.
	// It must be unique within the server's namespace.
	Name string `json:"name"`

	// Description provides a human-readable description of the prompt.
	// Explains what the prompt is for and how to use it.
	Description string `json:"description"`

	// Arguments defines the expected arguments for the prompt.
	// Each argument specifies what data is needed to fill the template.
	Arguments []PromptArgument `json:"arguments,omitempty"`
}

// PromptArgument represents an argument for a prompt.
// It defines what data is required to populate a prompt template.
type PromptArgument struct {
	// Name is the argument name.
	// Used as a key when providing values for the prompt.
	Name string `json:"name"`

	// Description describes the argument.
	// Explains what kind of data should be provided.
	Description string `json:"description"`

	// Required indicates if the argument is mandatory.
	// If true, the argument must be provided when getting the prompt.
	Required bool `json:"required"`
}

// PromptMessage represents a prompt with resolved content.
// It's the result of filling a prompt template with arguments.
type PromptMessage struct {
	// Role indicates the role of the message (e.g., "user", "assistant").
	// Typically "user" for prompts sent to language models.
	Role string `json:"role"`

	// Content is the message content.
	// The actual text of the prompt after argument substitution.
	Content string `json:"content"`

	// Metadata provides additional information about the prompt.
	// Can include information like the original template, arguments used, etc.
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// Request represents an MCP request message.
// Requests are sent from clients to servers to invoke methods.
type Request struct {
	// JSONRPC specifies the JSON-RPC version.
	// Always "2.0" for MCP.
	JSONRPC string `json:"jsonrpc"`

	// ID is the request identifier.
	// Used to match requests with responses.
	ID string `json:"id"`

	// Method is the method being called.
	// For MCP, this includes "initialize", "tools/call", "resources/read", etc.
	Method string `json:"method"`

	// Params contains the request parameters.
	// The structure depends on the method being called.
	Params json.RawMessage `json:"params,omitempty"`
}

// Response represents an MCP response message.
// Responses are sent from servers to clients in reply to requests.
type Response struct {
	// JSONRPC specifies the JSON-RPC version.
	// Always "2.0" for MCP.
	JSONRPC string `json:"jsonrpc"`

	// ID is the response identifier matching the request.
	// Must match the ID of the corresponding request.
	ID string `json:"id"`

	// Result contains the response result.
	// Present if the request succeeded.
	Result json.RawMessage `json:"result,omitempty"`

	// Error contains error information if the request failed.
	// Present if the request failed.
	Error *Error `json:"error,omitempty"`
}

// Notification represents an MCP notification message.
// Notifications are sent from servers to clients for events or updates.
type Notification struct {
	// JSONRPC specifies the JSON-RPC version.
	// Always "2.0" for MCP.
	JSONRPC string `json:"jsonrpc"`

	// Method is the notification method.
	// For MCP, this might include progress updates or logging.
	Method string `json:"method"`

	// Params contains the notification parameters.
	// The structure depends on the notification type.
	Params json.RawMessage `json:"params,omitempty"`
}

// Error represents an error in an MCP response.
// Used to indicate failure conditions in a structured way.
type Error struct {
	// Code is the error code.
	// Standard JSON-RPC error codes are used where applicable.
	Code int `json:"code"`

	// Message is a human-readable error message.
	// Provides details about what went wrong.
	Message string `json:"message"`

	// Data provides additional error information.
	// Can include stack traces, context, or other debugging data.
	Data interface{} `json:"data,omitempty"`
}

// Error implements the error interface for MCP errors.
func (e *Error) Error() string {
	if e.Data != nil {
		return fmt.Sprintf("MCP error %d: %s (data: %v)", e.Code, e.Message, e.Data)
	}
	return fmt.Sprintf("MCP error %d: %s", e.Code, e.Message)
}

// MessageType represents the type of an MCP message.
// Used for type-safe message classification and processing.
type MessageType int

const (
	// RequestMessage indicates a request.
	// Requests expect a response from the recipient.
	RequestMessage MessageType = iota

	// ResponseMessage indicates a response.
	// Responses are answers to previous requests.
	ResponseMessage

	// NotificationMessage indicates a notification.
	// Notifications are one-way messages that don't expect a response.
	NotificationMessage
)

// String returns the string representation of the message type.
// Useful for logging and debugging.
func (mt MessageType) String() string {
	switch mt {
	case RequestMessage:
		return "request"
	case ResponseMessage:
		return "response"
	case NotificationMessage:
		return "notification"
	default:
		return "unknown"
	}
}

// GetMessageType returns the MessageType for a given message.
// This is a helper function for type-safe message handling.
func GetMessageType(msg Message) MessageType {
	if msg.IsRequest() {
		return RequestMessage
	}
	if msg.IsResponse() {
		return ResponseMessage
	}
	if msg.IsNotification() {
		return NotificationMessage
	}
	return -1 // Invalid
}

// IsRequest returns true if this is a request message.
func (r *Request) IsRequest() bool { return true }

// IsResponse returns true if this is a response message.
func (r *Request) IsResponse() bool { return false }

// IsNotification returns true if this is a notification message.
func (r *Request) IsNotification() bool { return false }

// GetID returns the message ID (for requests and responses).
func (r *Request) GetID() (string, bool) { return r.ID, r.ID != "" }

// GetMethod returns the method name (for requests and notifications).
func (r *Request) GetMethod() (string, bool) { return r.Method, r.Method != "" }

// IsRequest returns true if this is a request message.
func (r *Response) IsRequest() bool { return false }

// IsResponse returns true if this is a response message.
func (r *Response) IsResponse() bool { return true }

// IsNotification returns true if this is a notification message.
func (r *Response) IsNotification() bool { return false }

// GetID returns the message ID (for requests and responses).
func (r *Response) GetID() (string, bool) { return r.ID, r.ID != "" }

// GetMethod returns the method name (for requests and notifications).
func (r *Response) GetMethod() (string, bool) { return "", false }

// IsRequest returns true if this is a request message.
func (n *Notification) IsRequest() bool { return false }

// IsResponse returns true if this is a response message.
func (n *Notification) IsResponse() bool { return false }

// IsNotification returns true if this is a notification message.
func (n *Notification) IsNotification() bool { return true }

// GetID returns the message ID (for requests and responses).
func (n *Notification) GetID() (string, bool) { return "", false }

// GetMethod returns the method name (for requests and notifications).
func (n *Notification) GetMethod() (string, bool) { return n.Method, n.Method != "" }
