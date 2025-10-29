# MCP Go SDK

This is the official Go SDK for the Model Context Protocol (MCP), providing idiomatic Go implementations for MCP clients and servers.

## Overview

The MCP Go SDK enables Go developers to build applications that integrate with AI models using the Model Context Protocol. It supports all MCP features including tools, resources, prompts, and logging.

## Features

- **Complete MCP Spec Compliance**: Implements the full MCP 2025-03-26 specification
- **Multiple Transports**: stdio, SSE, and Streamable HTTP transports
- **Type Safety**: Generated types from JSON schema with proper Go idioms
- **Extensible Architecture**: Middleware support and pluggable components
- **Production Ready**: Comprehensive testing and error handling

## Installation

```bash
go get github.com/anthropic/mcp-go-sdk
```

## Quick Start

### Client Example

```go
package main

import (
    "context"
    "fmt"
    "github.com/anthropic/mcp-go-sdk/client"
    "github.com/anthropic/mcp-go-sdk/transport/stdio"
)

func main() {
    ctx := context.Background()
    
    // Create stdio transport
    transport, err := stdio.NewClientTransport(ctx, stdio.ClientOptions{})
    if err != nil {
        panic(err)
    }
    defer transport.Close()
    
    // Create MCP client
    c := client.New(transport)
    
    // Initialize connection
    if err := c.Initialize(ctx); err != nil {
        panic(err)
    }
    
    // List available tools
    tools, err := c.ListTools(ctx)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("Available tools: %v\n", tools)
}
```

### Server Example

```go
package main

import (
    "context"
    "github.com/anthropic/mcp-go-sdk/server"
    "github.com/anthropic/mcp-go-sdk/transport/stdio"
)

func main() {
    ctx := context.Background()
    
    // Create stdio transport
    transport, err := stdio.NewServerTransport(ctx, stdio.ServerOptions{})
    if err != nil {
        panic(err)
    }
    defer transport.Close()
    
    // Create MCP server
    s := server.New(transport)
    
    // Register a tool
    s.RegisterTool("echo", "Echo back the input", func(args map[string]interface{}) (interface{}, error) {
        return args["message"], nil
    })
    
    // Start server
    if err := s.Listen(ctx); err != nil {
        panic(err)
    }
}
```

## Architecture

The SDK is organized into several packages:

- `mcp`: Core types and interfaces
- `client`: MCP client implementation
- `server`: MCP server implementation
- `transport`: Transport layer implementations
- `types`: Generated types from MCP schema

## Development

### Building

```bash
go build ./...
```

### Testing

```bash
go test ./...
```

### Linting

```bash
golangci-lint run
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.