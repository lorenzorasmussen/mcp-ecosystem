// Package stdio provides stdio-based transport implementations for MCP servers.
package stdio

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sync"

	"github.com/anthropic/mcp-go-sdk/internal/logging"
)

// ServerTransport implements the MCP Transport interface for stdio servers.
type ServerTransport struct {
	stdin       *os.File
	stdout      *os.File
	messageChan chan []byte
	logger      logging.Logger
	mu          sync.RWMutex
	closed      bool
}

// ServerOptions contains configuration for creating a stdio server transport.
type ServerOptions struct {
	Logger logging.Logger
}

// NewServerTransport creates a new stdio server transport.
func NewServerTransport(ctx context.Context, opts ServerOptions) (*ServerTransport, error) {
	logger := opts.Logger
	if logger == nil {
		logger = logging.GetDefaultLogger()
	}

	transport := &ServerTransport{
		stdin:       os.Stdin,
		stdout:      os.Stdout,
		messageChan: make(chan []byte, 100),
		logger:      logger,
	}

	// Start reading from stdin
	go transport.readMessages()

	logger.Info("Stdio server transport started")
	return transport, nil
}

// Start begins the transport's operation.
func (t *ServerTransport) Start(ctx context.Context) error {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.closed {
		return fmt.Errorf("transport is closed")
	}

	t.logger.Info("Stdio server transport started")
	return nil
}

// Send transmits a message through the transport.
func (t *ServerTransport) Send(ctx context.Context, message interface{}) error {
	t.mu.RLock()
	defer t.mu.RUnlock()

	if t.closed {
		return fmt.Errorf("transport is closed")
	}

	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	// Write the message to stdout
	if _, err := t.stdout.Write(data); err != nil {
		return fmt.Errorf("failed to write message: %w", err)
	}

	// Write newline delimiter
	if _, err := t.stdout.Write([]byte("\n")); err != nil {
		return fmt.Errorf("failed to write newline: %w", err)
	}

	t.logger.Debug("Sent message", "size", len(data))
	return nil
}

// Receive returns a channel for incoming messages.
func (t *ServerTransport) Receive() <-chan []byte {
	return t.messageChan
}

// Close shuts down the transport and releases resources.
func (t *ServerTransport) Close() error {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.closed {
		return nil
	}

	t.closed = true
	close(t.messageChan)

	t.logger.Info("Stdio server transport closed")
	return nil
}

// readMessages reads messages from stdin and sends them to the channel.
func (t *ServerTransport) readMessages() {
	scanner := bufio.NewScanner(t.stdin)
	for scanner.Scan() {
		data := scanner.Bytes()
		if len(data) == 0 {
			continue
		}

		// Send the message to the channel
		select {
		case t.messageChan <- data:
			t.logger.Debug("Received message", "size", len(data))
		default:
			t.logger.Warn("Message channel full, dropping message")
		}
	}

	if err := scanner.Err(); err != nil {
		t.logger.Error("Error reading from stdin", "error", err)
	}

	// Close the channel when done
	close(t.messageChan)
}
