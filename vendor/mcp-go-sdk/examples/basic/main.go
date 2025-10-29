// Package main demonstrates basic MCP client-server communication.
//
// This example shows how to create an MCP server that exposes tools,
// and an MCP client that can call those tools.
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/anthropic/mcp-go-sdk/client"
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
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Create stdio transport for client (connecting to the server)
	transport, err := stdio.NewClientTransport(ctx, stdio.ClientOptions{
		Command: "go",
		Args:    []string{"run", "examples/basic/server.go"},
	})
	if err != nil {
		log.Fatal("Failed to create client transport:", err)
	}
	defer transport.Close()

	// Create MCP client
	c := client.New(client.Options{
		Transport: transport,
	})

	// Initialize connection
	if err := c.Initialize(ctx); err != nil {
		log.Fatal("Failed to initialize client:", err)
	}

	fmt.Println("MCP Client connected to server")

	// List available tools
	tools, err := c.ListTools(ctx)
	if err != nil {
		log.Fatal("Failed to list tools:", err)
	}

	fmt.Printf("Available tools: %d\n", len(tools))
	for _, tool := range tools {
		fmt.Printf("- %s: %s\n", tool.Name, tool.Description)
	}

	// Call the add tool
	result, err := c.CallTool(ctx, "add", map[string]interface{}{
		"a": 10,
		"b": 5,
	})
	if err != nil {
		log.Fatal("Failed to call add tool:", err)
	}

	fmt.Printf("Add tool result: %v\n", result)

	// Call the greet tool
	result, err = c.CallTool(ctx, "greet", map[string]interface{}{
		"name": "MCP User",
	})
	if err != nil {
		log.Fatal("Failed to call greet tool:", err)
	}

	fmt.Printf("Greet tool result: %v\n", result)

	// Close client
	c.Close()
	fmt.Println("Client finished")
}
