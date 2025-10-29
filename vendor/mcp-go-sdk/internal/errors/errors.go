// Package errors provides error handling utilities for the MCP SDK.
//
// This package defines common error types and utilities for creating,
// wrapping, and handling errors in MCP applications.
package errors

import (
	"fmt"

	"github.com/anthropic/mcp-go-sdk/mcp"
)

// ErrorCode represents standard JSON-RPC error codes used in MCP.
type ErrorCode int

const (
	// ParseError is returned when the request cannot be parsed.
	ParseError ErrorCode = -32700

	// InvalidRequest is returned when the request is malformed.
	InvalidRequest ErrorCode = -32600

	// MethodNotFound is returned when the requested method does not exist.
	MethodNotFound ErrorCode = -32601

	// InvalidParams is returned when the request parameters are invalid.
	InvalidParams ErrorCode = -32602

	// InternalError is returned when an internal error occurs.
	InternalError ErrorCode = -32603

	// ServerError is returned for application-specific errors.
	ServerError ErrorCode = -32000
)

// MCPError represents an error in the MCP protocol.
type MCPError struct {
	Code    ErrorCode
	Message string
	Data    interface{}
}

// Error implements the error interface.
func (e *MCPError) Error() string {
	if e.Data != nil {
		return fmt.Sprintf("MCP error %d: %s (data: %v)", e.Code, e.Message, e.Data)
	}
	return fmt.Sprintf("MCP error %d: %s", e.Code, e.Message)
}

// ToMCPError converts an MCPError to an mcp.Error.
func (e *MCPError) ToMCPError() *mcp.Error {
	return &mcp.Error{
		Code:    int(e.Code),
		Message: e.Message,
		Data:    e.Data,
	}
}

// NewMCPError creates a new MCPError with the given code and message.
func NewMCPError(code ErrorCode, message string, data interface{}) *MCPError {
	return &MCPError{
		Code:    code,
		Message: message,
		Data:    data,
	}
}

// NewParseError creates a parse error.
func NewParseError(message string) *MCPError {
	return NewMCPError(ParseError, message, nil)
}

// NewInvalidRequestError creates an invalid request error.
func NewInvalidRequestError(message string) *MCPError {
	return NewMCPError(InvalidRequest, message, nil)
}

// NewMethodNotFoundError creates a method not found error.
func NewMethodNotFoundError(method string) *MCPError {
	return NewMCPError(MethodNotFound, fmt.Sprintf("method not found: %s", method), nil)
}

// NewInvalidParamsError creates an invalid parameters error.
func NewInvalidParamsError(message string) *MCPError {
	return NewMCPError(InvalidParams, message, nil)
}

// NewInternalError creates an internal error.
func NewInternalError(message string) *MCPError {
	return NewMCPError(InternalError, message, nil)
}

// NewServerError creates a server error.
func NewServerError(message string, data interface{}) *MCPError {
	return NewMCPError(ServerError, message, data)
}

// WrapError wraps an existing error with additional context.
func WrapError(err error, message string) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("%s: %w", message, err)
}

// IsMCPError checks if an error is an MCPError.
func IsMCPError(err error) bool {
	_, ok := err.(*MCPError)
	return ok
}

// GetMCPErrorCode extracts the error code from an MCPError.
func GetMCPErrorCode(err error) (ErrorCode, bool) {
	if mcpErr, ok := err.(*MCPError); ok {
		return mcpErr.Code, true
	}
	return 0, false
}
