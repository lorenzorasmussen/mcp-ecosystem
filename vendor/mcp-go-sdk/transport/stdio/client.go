// Package stdio provides stdio-based transport implementations for MCP.
//
// This package implements the stdio transport for MCP clients and servers,
// allowing communication through standard input and output streams.
package stdio

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"

	"github.com/anthropic/mcp-go-sdk/internal/logging"
)

// ClientTransport implements the MCP Transport interface for stdio clients.
type ClientTransport struct {
	cmd         *exec.Cmd
	stdin       io.WriteCloser
	stdout      io.ReadCloser
	messageChan chan []byte
	logger      logging.Logger
	mu          sync.RWMutex
	closed      bool
}

// ClientOptions contains configuration for creating a stdio client transport.
type ClientOptions struct {
	Command string   // Command to execute
	Args    []string // Arguments for the command
	Env     []string // Environment variables
	Dir     string   // Working directory
	Logger  logging.Logger
}

// NewClientTransport creates a new stdio client transport.
func NewClientTransport(ctx context.Context, opts ClientOptions) (*ClientTransport, error) {
	logger := opts.Logger
	if logger == nil {
		logger = logging.GetDefaultLogger()
	}

	// Create the command
	cmd := exec.CommandContext(ctx, opts.Command, opts.Args...)
	cmd.Dir = opts.Dir
	cmd.Env = append(os.Environ(), opts.Env...)

	// Set up pipes
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdin pipe: %w", err)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		stdin.Close()
		return nil, fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	// Start the command
	if err := cmd.Start(); err != nil {
		stdin.Close()
		stdout.Close()
		return nil, fmt.Errorf("failed to start command: %w", err)
	}

	transport := &ClientTransport{
		cmd:         cmd,
		stdin:       stdin,
		stdout:      stdout,
		messageChan: make(chan []byte, 100),
		logger:      logger,
	}

	// Start reading from stdout
	go transport.readMessages()

	logger.Info("Stdio client transport started", "command", opts.Command, "args", opts.Args)
	return transport, nil
}

// Start begins the transport's operation.
func (t *ClientTransport) Start(ctx context.Context) error {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.closed {
		return fmt.Errorf("transport is closed")
	}

	t.logger.Info("Stdio client transport started")
	return nil
}

// Send transmits a message through the transport.
func (t *ClientTransport) Send(ctx context.Context, message interface{}) error {
	t.mu.RLock()
	defer t.mu.RUnlock()

	if t.closed {
		return fmt.Errorf("transport is closed")
	}

	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	// Write the message to stdin
	if _, err := t.stdin.Write(data); err != nil {
		return fmt.Errorf("failed to write message: %w", err)
	}

	// Write newline delimiter
	if _, err := t.stdin.Write([]byte("\n")); err != nil {
		return fmt.Errorf("failed to write newline: %w", err)
	}

	t.logger.Debug("Sent message", "size", len(data))
	return nil
}

// Receive returns a channel for incoming messages.
func (t *ClientTransport) Receive() <-chan []byte {
	return t.messageChan
}

// Close shuts down the transport and releases resources.
func (t *ClientTransport) Close() error {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.closed {
		return nil
	}

	t.closed = true
	close(t.messageChan)

	// Close pipes
	if t.stdin != nil {
		t.stdin.Close()
	}
	if t.stdout != nil {
		t.stdout.Close()
	}

	// Wait for command to finish
	if t.cmd != nil && t.cmd.Process != nil {
		t.cmd.Process.Kill()
		t.cmd.Wait()
	}

	t.logger.Info("Stdio client transport closed")
	return nil
}

// readMessages reads messages from stdout and sends them to the channel.
func (t *ClientTransport) readMessages() {
	scanner := bufio.NewScanner(t.stdout)
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
		t.logger.Error("Error reading from stdout", "error", err)
	}

	// Close the channel when done
	close(t.messageChan)
}
