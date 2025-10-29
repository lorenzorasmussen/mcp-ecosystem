// Package jsonrpc provides JSON-RPC 2.0 message handling for MCP.
//
// This package implements basic JSON-RPC 2.0 protocol handling,
// including message parsing, validation, and response generation.
// It integrates with the MCP message types defined in the mcp package.
package jsonrpc

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/anthropic/mcp-go-sdk/mcp"
)

// Handler handles JSON-RPC messages for MCP.
type Handler struct {
	// requestHandlers maps method names to request handlers
	requestHandlers map[string]RequestHandler

	// notificationHandlers maps method names to notification handlers
	notificationHandlers map[string]NotificationHandler
}

// RequestHandler handles JSON-RPC requests.
type RequestHandler func(ctx context.Context, req *mcp.Request) (*mcp.Response, error)

// NotificationHandler handles JSON-RPC notifications.
type NotificationHandler func(ctx context.Context, notif *mcp.Notification) error

// NewHandler creates a new JSON-RPC handler.
func NewHandler() *Handler {
	return &Handler{
		requestHandlers:      make(map[string]RequestHandler),
		notificationHandlers: make(map[string]NotificationHandler),
	}
}

// RegisterRequestHandler registers a handler for a specific method.
func (h *Handler) RegisterRequestHandler(method string, handler RequestHandler) {
	h.requestHandlers[method] = handler
}

// RegisterNotificationHandler registers a handler for a specific notification method.
func (h *Handler) RegisterNotificationHandler(method string, handler NotificationHandler) {
	h.notificationHandlers[method] = handler
}

// HandleMessage processes a JSON-RPC message and returns a response if applicable.
func (h *Handler) HandleMessage(ctx context.Context, data []byte) ([]byte, error) {
	// Parse the message to determine its type
	var rawMessage map[string]interface{}
	if err := json.Unmarshal(data, &rawMessage); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}

	// Determine message type based on presence of fields
	if _, hasID := rawMessage["id"]; hasID {
		if _, hasMethod := rawMessage["method"]; hasMethod {
			// It's a request
			return h.handleRequest(ctx, data)
		} else {
			// It's a response
			return nil, fmt.Errorf("responses not yet supported")
		}
	} else {
		if _, hasMethod := rawMessage["method"]; hasMethod {
			// It's a notification
			return h.handleNotification(ctx, data)
		} else {
			return nil, fmt.Errorf("invalid message: missing method")
		}
	}
}

// handleRequest processes a JSON-RPC request.
func (h *Handler) handleRequest(ctx context.Context, data []byte) ([]byte, error) {
	var req mcp.Request
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, fmt.Errorf("invalid request: %w", err)
	}

	handler, exists := h.requestHandlers[req.Method]
	if !exists {
		return nil, fmt.Errorf("method not found: %s", req.Method)
	}

	resp, err := handler(ctx, &req)
	if err != nil {
		return nil, err
	}

	return json.Marshal(resp)
}

// handleNotification processes a JSON-RPC notification.
func (h *Handler) handleNotification(ctx context.Context, data []byte) ([]byte, error) {
	var notif mcp.Notification
	if err := json.Unmarshal(data, &notif); err != nil {
		return nil, fmt.Errorf("invalid notification: %w", err)
	}

	handler, exists := h.notificationHandlers[notif.Method]
	if !exists {
		// Notifications without handlers are silently ignored
		return nil, nil
	}

	err := handler(ctx, &notif)
	if err != nil {
		return nil, err
	}

	// Notifications don't return responses
	return nil, nil
}

// CreateErrorResponse creates an error response for a failed request.
func CreateErrorResponse(id string, code int, message string, data interface{}) *mcp.Response {
	return &mcp.Response{
		JSONRPC: "2.0",
		ID:      id,
		Error: &mcp.Error{
			Code:    code,
			Message: message,
			Data:    data,
		},
	}
}

// CreateSuccessResponse creates a success response for a successful request.
func CreateSuccessResponse(id string, result interface{}) (*mcp.Response, error) {
	resultBytes, err := json.Marshal(result)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal result: %w", err)
	}

	return &mcp.Response{
		JSONRPC: "2.0",
		ID:      id,
		Result:  json.RawMessage(resultBytes),
	}, nil
}
