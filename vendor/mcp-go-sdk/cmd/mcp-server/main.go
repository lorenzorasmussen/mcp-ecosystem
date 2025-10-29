// Package main runs the MCP server as a standalone binary for PM2 management.
//
// This server can be managed by PM2 for production deployment.
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/anthropic/mcp-go-sdk/server"
	"github.com/anthropic/mcp-go-sdk/transport/stdio"
)

// Simple tool handler that adds two numbers
func addNumbersHandler(args map[string]interface{}) (interface{}, error) {
	a, ok := args["a"].(float64)
	if !ok {
		return nil, fmt.Errorf("a must be a number")
	}
	b, ok := args["b"].(float64)
	if !ok {
		return nil, fmt.Errorf("b must be a number")
	}
	return a + b, nil
}

// Simple tool handler that returns a greeting
func greetHandler(args map[string]interface{}) (interface{}, error) {
	name, ok := args["name"].(string)
	if !ok {
		name = "World"
	}
	return map[string]string{
		"message": fmt.Sprintf("Hello, %s!", name),
	}, nil
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-sigChan
		fmt.Printf("Received signal %v, shutting down...\n", sig)
		cancel()
	}()

	// Create stdio transport for server
	transport, err := stdio.NewServerTransport(ctx, stdio.ServerOptions{})
	if err != nil {
		log.Fatal("Failed to create server transport:", err)
	}
	defer transport.Close()

	// Create MCP server
	s := server.New(server.Options{
		Transport: transport,
	})

	// Register tools
	s.RegisterTool("add", "Add two numbers", addNumbersHandler)
	s.RegisterTool("greet", "Generate a greeting", greetHandler)

	fmt.Println("MCP Server started. Available tools: add, greet")
	fmt.Println("Press Ctrl+C to stop")

	// Start listening
	if err := s.Listen(ctx); err != nil && err != context.Canceled {
		log.Fatal("Server error:", err)
	}

	fmt.Println("Server stopped")
}
