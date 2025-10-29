// Package middleware provides middleware management for MCP.
//
// This package implements a middleware system that allows for
// request/response processing in the MCP transport layer.
package middleware

import (
	"context"

	"github.com/anthropic/mcp-go-sdk/mcp"
)

// Manager manages a chain of middleware for MCP message processing.
type Manager struct {
	middleware []mcp.Middleware
}

// NewManager creates a new middleware manager.
func NewManager() *Manager {
	return &Manager{
		middleware: make([]mcp.Middleware, 0),
	}
}

// Use adds middleware to the processing chain.
func (m *Manager) Use(middleware ...mcp.Middleware) {
	m.middleware = append(m.middleware, middleware...)
}

// ProcessRequest processes a request through the middleware chain.
func (m *Manager) ProcessRequest(ctx context.Context, req mcp.Message) (mcp.Message, error) {
	var err error
	current := req

	for _, middleware := range m.middleware {
		current, err = middleware.ProcessRequest(ctx, current)
		if err != nil {
			return nil, err
		}
	}

	return current, nil
}

// ProcessResponse processes a response through the middleware chain.
func (m *Manager) ProcessResponse(ctx context.Context, resp mcp.Message) (mcp.Message, error) {
	var err error
	current := resp

	for _, middleware := range m.middleware {
		current, err = middleware.ProcessResponse(ctx, current)
		if err != nil {
			return nil, err
		}
	}

	return current, nil
}

// Count returns the number of middleware in the chain.
func (m *Manager) Count() int {
	return len(m.middleware)
}

// Clear removes all middleware from the chain.
func (m *Manager) Clear() {
	m.middleware = m.middleware[:0]
}
