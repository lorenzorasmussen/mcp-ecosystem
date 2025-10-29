# MCP Go SDK User Guide

This guide provides comprehensive instructions for using the MCP Go SDK to build applications that integrate with AI models using the Model Context Protocol.

## Introduction

The Model Context Protocol (MCP) enables seamless integration between applications and AI models by providing a standardized way to expose tools, resources, and prompts. The MCP Go SDK makes it easy to build MCP clients and servers in Go.

## Getting Started

### Installation

Add the MCP Go SDK to your Go project:

```bash
go get github.com/anthropic/mcp-go-sdk
```

### Prerequisites

- Go 1.21 or later
- Basic understanding of Go interfaces and context

## Building an MCP Client

An MCP client connects to an MCP server to access tools, resources, and prompts.

### Basic Client Setup

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/anthropic/mcp-go-sdk/client"
    "github.com/anthropic/mcp-go-sdk/transport/stdio"
)

func main() {
    ctx := context.Background()

    // Create a stdio transport for communication
    transport, err := stdio.NewClientTransport(ctx, stdio.ClientOptions{
        Command: "python",
        Args:    []string{"my_mcp_server.py"},
    })
    if err != nil {
        log.Fatal(err)
    }
    defer transport.Close()

    // Create the MCP client
    c := client.New(client.Options{
        Transport: transport,
    })

    // Initialize the connection
    if err := c.Initialize(ctx); err != nil {
        log.Fatal(err)
    }

    // Use the client
    tools, err := c.ListTools(ctx)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Available tools: %v\n", tools)
}
```

### Calling Tools

```go
// Call a specific tool
result, err := c.CallTool(ctx, "my-tool", map[string]interface{}{
    "input": "Hello, World!",
})
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Tool result: %v\n", result)
```

### Reading Resources

```go
// List available resources
resources, err := c.ListResources(ctx)
if err != nil {
    log.Fatal(err)
}

// Read a specific resource
content, err := c.ReadResource(ctx, "file:///path/to/resource.txt")
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Resource content: %v\n", content)
```

### Using Prompts

```go
// List available prompts
prompts, err := c.ListPrompts(ctx)
if err != nil {
    log.Fatal(err)
}

// Get a prompt with arguments
prompt, err := c.GetPrompt(ctx, "code-review", map[string]interface{}{
    "language": "go",
    "code":     "fmt.Println(\"Hello\")",
})
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Prompt: %s\n", prompt.Content)
```

## Building an MCP Server

An MCP server exposes tools, resources, and prompts to MCP clients.

### Basic Server Setup

```go
package main

import (
    "context"
    "log"

    "github.com/anthropic/mcp-go-sdk/server"
    "github.com/anthropic/mcp-go-sdk/transport/stdio"
)

func main() {
    ctx := context.Background()

    // Create a stdio transport
    transport, err := stdio.NewServerTransport(ctx, stdio.ServerOptions{})
    if err != nil {
        log.Fatal(err)
    }
    defer transport.Close()

    // Create the MCP server
    s := server.New(server.Options{
        Transport: transport,
    })

    // Register tools, resources, and prompts
    s.RegisterTool("echo", "Echo back the input", echoHandler)
    s.RegisterResource("file:///example.txt", exampleResourceHandler)
    s.RegisterPrompt("greeting", "Generate a greeting", greetingPromptHandler)

    // Start the server
    if err := s.Listen(ctx); err != nil {
        log.Fatal(err)
    }
}

// Tool handler
func echoHandler(args map[string]interface{}) (interface{}, error) {
    message, ok := args["message"].(string)
    if !ok {
        return nil, fmt.Errorf("message argument is required")
    }
    return map[string]string{"echo": message}, nil
}

// Resource handler
func exampleResourceHandler() (interface{}, error) {
    return map[string]string{"content": "This is example content"}, nil
}

// Prompt handler
func greetingPromptHandler(args map[string]interface{}) (*mcp.PromptMessage, error) {
    name, ok := args["name"].(string)
    if !ok {
        name = "World"
    }
    return &mcp.PromptMessage{
        Role:    "user",
        Content: fmt.Sprintf("Hello, %s!", name),
    }, nil
}
```

### Registering Multiple Tools

```go
// Register multiple tools
s.RegisterTool("add", "Add two numbers", addHandler)
s.RegisterTool("multiply", "Multiply two numbers", multiplyHandler)
s.RegisterTool("divide", "Divide two numbers", divideHandler)

func addHandler(args map[string]interface{}) (interface{}, error) {
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
```

### Handling Errors

```go
func safeDivideHandler(args map[string]interface{}) (interface{}, error) {
    a, ok := args["a"].(float64)
    if !ok {
        return nil, fmt.Errorf("a must be a number")
    }
    b, ok := args["b"].(float64)
    if !ok {
        return nil, fmt.Errorf("b must be a number")
    }
    if b == 0 {
        return nil, fmt.Errorf("cannot divide by zero")
    }
    return a / b, nil
}
```

## Transport Options

The SDK supports multiple transport mechanisms for different use cases.

### Stdio Transport

Best for local processes and command-line tools.

```go
// Client side
transport, err := stdio.NewClientTransport(ctx, stdio.ClientOptions{
    Command: "my-server",
    Args:    []string{"--port", "8080"},
})

// Server side
transport, err := stdio.NewServerTransport(ctx, stdio.ServerOptions{})
```

### SSE Transport

Best for web applications and real-time communication.

```go
// Client side
transport, err := sse.NewClientTransport(ctx, sse.ClientOptions{
    URL: "https://api.example.com/mcp",
})

// Server side
transport, err := sse.NewServerTransport(ctx, sse.ServerOptions{
    Addr: ":8080",
})
```

### Streamable HTTP Transport

Best for high-throughput scenarios.

```go
// Client side
transport, err := streamablehttp.NewClientTransport(ctx, streamablehttp.ClientOptions{
    URL: "https://api.example.com/mcp",
})

// Server side
transport, err := streamablehttp.NewServerTransport(ctx, streamablehttp.ServerOptions{
    Addr: ":8080",
})
```

## Best Practices

### Error Handling

Always handle errors appropriately and provide meaningful error messages.

```go
result, err := c.CallTool(ctx, "risky-tool", args)
if err != nil {
    log.Printf("Tool call failed: %v", err)
    return
}
```

### Context Management

Use context for cancellation and timeouts.

```go
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

result, err := c.CallTool(ctx, "long-running-tool", args)
```

### Resource Cleanup

Always close transports and connections when done.

```go
defer transport.Close()
defer client.Close()
```

### Logging

Use structured logging for better debugging.

```go
logger := log.New(os.Stderr, "[MCP] ", log.LstdFlags)
client := client.New(client.Options{
    Logger: logger,
})
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure the server is running and accessible.
2. **Timeout Errors**: Check network connectivity and server responsiveness.
3. **Invalid Tool Arguments**: Verify argument types match the tool's schema.
4. **Resource Not Found**: Ensure the resource URI is correct and registered.

### Debugging

Enable debug logging to troubleshoot issues:

```go
import "github.com/anthropic/mcp-go-sdk/internal/logging"

logger := logging.NewLogger(logging.DebugLevel)
```

## Examples

See the `examples/` directory for complete working examples:

- `examples/client/`: Basic client usage
- `examples/server/`: Basic server implementation
- `examples/chat/`: Interactive chat client
- `examples/tools/`: Custom tool implementations

## Support

For issues and questions:

1. Check the [GitHub Issues](https://github.com/anthropic/mcp-go-sdk/issues)
2. Review the [API Documentation](docs/api/)
3. Consult the [Architecture Guide](docs/architecture/)

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.