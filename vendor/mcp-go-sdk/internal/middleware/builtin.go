// Package middleware provides built-in middleware implementations.
//
// This file contains common middleware implementations that can be used
// for logging, authentication, and other cross-cutting concerns.
package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/anthropic/mcp-go-sdk/internal/logging"
	"github.com/anthropic/mcp-go-sdk/mcp"
)

// LoggingMiddleware logs all requests and responses.
type LoggingMiddleware struct {
	logger logging.Logger
}

// NewLoggingMiddleware creates a new logging middleware.
func NewLoggingMiddleware(logger logging.Logger) *LoggingMiddleware {
	return &LoggingMiddleware{
		logger: logger,
	}
}

// ProcessRequest logs the outgoing request.
func (m *LoggingMiddleware) ProcessRequest(ctx context.Context, req mcp.Message) (mcp.Message, error) {
	if method, ok := req.GetMethod(); ok {
		m.logger.Info("Sending request", "method", method)
	}
	return req, nil
}

// ProcessResponse logs the incoming response.
func (m *LoggingMiddleware) ProcessResponse(ctx context.Context, resp mcp.Message) (mcp.Message, error) {
	if id, ok := resp.GetID(); ok {
		m.logger.Info("Received response", "id", id)
	}
	return resp, nil
}

// TimingMiddleware measures and logs the time taken for requests.
type TimingMiddleware struct {
	logger logging.Logger
}

// NewTimingMiddleware creates a new timing middleware.
func NewTimingMiddleware(logger logging.Logger) *TimingMiddleware {
	return &TimingMiddleware{
		logger: logger,
	}
}

// ProcessRequest records the start time.
func (m *TimingMiddleware) ProcessRequest(ctx context.Context, req mcp.Message) (mcp.Message, error) {
	start := time.Now()
	ctx = context.WithValue(ctx, "start_time", start)
	return req, nil
}

// ProcessResponse calculates and logs the elapsed time.
func (m *TimingMiddleware) ProcessResponse(ctx context.Context, resp mcp.Message) (mcp.Message, error) {
	if startTime, ok := ctx.Value("start_time").(time.Time); ok {
		elapsed := time.Since(startTime)
		if id, hasID := resp.GetID(); hasID {
			m.logger.Info("Request completed", "id", id, "duration", elapsed.String())
		} else {
			m.logger.Info("Request completed", "duration", elapsed.String())
		}
	}
	return resp, nil
}

// ValidationMiddleware validates message structure.
type ValidationMiddleware struct{}

// NewValidationMiddleware creates a new validation middleware.
func NewValidationMiddleware() *ValidationMiddleware {
	return &ValidationMiddleware{}
}

// ProcessRequest validates the request structure.
func (m *ValidationMiddleware) ProcessRequest(ctx context.Context, req mcp.Message) (mcp.Message, error) {
	// Basic validation - ensure required fields are present
	if req.IsRequest() {
		if method, ok := req.GetMethod(); !ok || method == "" {
			return nil, fmt.Errorf("invalid request: missing method")
		}
	}
	return req, nil
}

// ProcessResponse validates the response structure.
func (m *ValidationMiddleware) ProcessResponse(ctx context.Context, resp mcp.Message) (mcp.Message, error) {
	// Basic validation - ensure responses have IDs
	if resp.IsResponse() {
		if _, ok := resp.GetID(); !ok {
			return nil, fmt.Errorf("invalid response: missing ID")
		}
	}
	return resp, nil
}

// AuthenticationMiddleware handles authentication for requests.
type AuthenticationMiddleware struct {
	token string
}

// NewAuthenticationMiddleware creates a new authentication middleware.
func NewAuthenticationMiddleware(token string) *AuthenticationMiddleware {
	return &AuthenticationMiddleware{
		token: token,
	}
}

// ProcessRequest adds authentication to the request.
func (m *AuthenticationMiddleware) ProcessRequest(ctx context.Context, req mcp.Message) (mcp.Message, error) {
	// For now, just log that authentication is being added
	// In a real implementation, this would modify the request headers or params
	if method, ok := req.GetMethod(); ok {
		logging.Info("Adding authentication to request", "method", method)
	}
	return req, nil
}

// ProcessResponse validates authentication in the response.
func (m *AuthenticationMiddleware) ProcessResponse(ctx context.Context, resp mcp.Message) (mcp.Message, error) {
	// For now, just log that authentication is being validated
	// In a real implementation, this would check response headers or status
	logging.Info("Validating response authentication")
	return resp, nil
}

// RateLimitingMiddleware implements basic rate limiting.
type RateLimitingMiddleware struct {
	requestsPerSecond int
	lastRequest       time.Time
	logger            logging.Logger
}

// NewRateLimitingMiddleware creates a new rate limiting middleware.
func NewRateLimitingMiddleware(requestsPerSecond int, logger logging.Logger) *RateLimitingMiddleware {
	return &RateLimitingMiddleware{
		requestsPerSecond: requestsPerSecond,
		logger:            logger,
	}
}

// ProcessRequest enforces rate limiting.
func (m *RateLimitingMiddleware) ProcessRequest(ctx context.Context, req mcp.Message) (mcp.Message, error) {
	now := time.Now()
	minInterval := time.Second / time.Duration(m.requestsPerSecond)

	if now.Sub(m.lastRequest) < minInterval {
		m.logger.Warn("Rate limit exceeded")
		return nil, fmt.Errorf("rate limit exceeded")
	}

	m.lastRequest = now
	return req, nil
}

// ProcessResponse does nothing for rate limiting.
func (m *RateLimitingMiddleware) ProcessResponse(ctx context.Context, resp mcp.Message) (mcp.Message, error) {
	return resp, nil
}

// DebuggingMiddleware logs detailed information for debugging.
type DebuggingMiddleware struct {
	logger logging.Logger
}

// NewDebuggingMiddleware creates a new debugging middleware.
func NewDebuggingMiddleware(logger logging.Logger) *DebuggingMiddleware {
	return &DebuggingMiddleware{
		logger: logger,
	}
}

// ProcessRequest logs detailed request information.
func (m *DebuggingMiddleware) ProcessRequest(ctx context.Context, req mcp.Message) (mcp.Message, error) {
	data, _ := json.MarshalIndent(req, "", "  ")
	m.logger.Debug("Processing request", "data", string(data))
	return req, nil
}

// ProcessResponse logs detailed response information.
func (m *DebuggingMiddleware) ProcessResponse(ctx context.Context, resp mcp.Message) (mcp.Message, error) {
	data, _ := json.MarshalIndent(resp, "", "  ")
	m.logger.Debug("Processing response", "data", string(data))
	return resp, nil
}
