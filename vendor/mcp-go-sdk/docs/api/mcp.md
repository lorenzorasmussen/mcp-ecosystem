# MCP Package API Documentation

## Overview

The `mcp` package provides core interfaces and types for the Model Context Protocol (MCP) SDK. It defines the fundamental abstractions for MCP clients, servers, and transports.

## Interfaces

### Transport

`Transport` represents a communication channel for MCP messages.

```go
type Transport interface {
    Start(ctx context.Context) error
    Send(ctx context.Context, message interface{}) error
    Receive() <-chan Message
    Close() error
}
```

**Methods:**

- `Start(ctx context.Context) error`: Begins the transport's operation.
- `Send(ctx context.Context, message interface{}) error`: Transmits a message through the transport.
- `Receive() <-chan Message`: Returns a channel for incoming messages.
- `Close() error`: Shuts down the transport and releases resources.

### Message

`Message` represents any MCP message that can be sent or received.

```go
type Message interface {
    IsRequest() bool
    IsResponse() bool
    IsNotification() bool
    GetID() (string, bool)
    GetMethod() (string, bool)
}
```

**Methods:**

- `IsRequest() bool`: Returns true if this is a request message.
- `IsResponse() bool`: Returns true if this is a response message.
- `IsNotification() bool`: Returns true if this is a notification message.
- `GetID() (string, bool)`: Returns the message ID (for requests and responses).
- `GetMethod() (string, bool)`: Returns the method name (for requests and notifications).

### Client

`Client` represents an MCP client that can send requests and receive responses.

```go
type Client interface {
    Initialize(ctx context.Context) error
    ListTools(ctx context.Context) ([]Tool, error)
    CallTool(ctx context.Context, name string, args map[string]interface{}) (interface{}, error)
    ListResources(ctx context.Context) ([]Resource, error)
    ReadResource(ctx context.Context, uri string) (interface{}, error)
    ListPrompts(ctx context.Context) ([]Prompt, error)
    GetPrompt(ctx context.Context, name string, args map[string]interface{}) (PromptMessage, error)
    Close() error
}
```

**Methods:**

- `Initialize(ctx context.Context) error`: Performs the MCP handshake and initializes the session.
- `ListTools(ctx context.Context) ([]Tool, error)`: Retrieves available tools from the server.
- `CallTool(ctx context.Context, name string, args map[string]interface{}) (interface{}, error)`: Executes a tool with the given arguments.
- `ListResources(ctx context.Context) ([]Resource, error)`: Retrieves available resources from the server.
- `ReadResource(ctx context.Context, uri string) (interface{}, error)`: Reads the contents of a resource.
- `ListPrompts(ctx context.Context) ([]Prompt, error)`: Retrieves available prompts from the server.
- `GetPrompt(ctx context.Context, name string, args map[string]interface{}) (PromptMessage, error)`: Retrieves a prompt with the given arguments.
- `Close() error`: Terminates the client connection.

### Server

`Server` represents an MCP server that handles client requests.

```go
type Server interface {
    Listen(ctx context.Context) error
    RegisterTool(name, description string, handler ToolHandler)
    RegisterResource(uri string, handler ResourceHandler)
    RegisterPrompt(name, description string, handler PromptHandler)
    Close() error
}
```

**Methods:**

- `Listen(ctx context.Context) error`: Starts the server and begins accepting connections.
- `RegisterTool(name, description string, handler ToolHandler)`: Registers a tool that clients can call.
- `RegisterResource(uri string, handler ResourceHandler)`: Registers a resource that clients can read.
- `RegisterPrompt(name, description string, handler PromptHandler)`: Registers a prompt that clients can get.
- `Close() error`: Shuts down the server.

## Types

### ToolHandler

`ToolHandler` is a function type for handling tool calls.

```go
type ToolHandler func(args map[string]interface{}) (interface{}, error)
```

### ResourceHandler

`ResourceHandler` is a function type for handling resource reads.

```go
type ResourceHandler func() (interface{}, error)
```

### PromptHandler

`PromptHandler` is a function type for handling prompt requests.

```go
type PromptHandler func(args map[string]interface{}) (PromptMessage, error)
```

### Middleware

`Middleware` allows for request/response processing in the transport layer.

```go
type Middleware interface {
    ProcessRequest(ctx context.Context, req Message) (Message, error)
    ProcessResponse(ctx context.Context, resp Message) (Message, error)
}
```

**Methods:**

- `ProcessRequest(ctx context.Context, req Message) (Message, error)`: Processes outgoing requests.
- `ProcessResponse(ctx context.Context, resp Message) (Message, error)`: Processes incoming responses.

### Logger

`Logger` provides logging functionality for MCP operations.

```go
type Logger interface {
    Debug(msg string, args ...interface{})
    Info(msg string, args ...interface{})
    Warn(msg string, args ...interface{})
    Error(msg string, args ...interface{})
}
```

**Methods:**

- `Debug(msg string, args ...interface{})`: Logs debug information.
- `Info(msg string, args ...interface{})`: Logs general information.
- `Warn(msg string, args ...interface{})`: Logs warnings.
- `Error(msg string, args ...interface{})`: Logs errors.

### Options

`Options` contains configuration for MCP clients and servers.

```go
type Options struct {
    Transport    Transport
    Logger       Logger
    Middleware   []Middleware
    Capabilities map[string]interface{}
}
```

**Fields:**

- `Transport`: Specifies the transport to use.
- `Logger`: Specifies the logger to use.
- `Middleware`: Specifies middleware to apply.
- `Capabilities`: Specifies the client's or server's capabilities.

## Usage Examples

### Creating a Client

```go
// Example client creation
client := mcp.NewClient(options)
err := client.Initialize(ctx)
if err != nil {
    log.Fatal(err)
}
```

### Creating a Server

```go
// Example server creation
server := mcp.NewServer(options)
server.RegisterTool("example", "An example tool", handler)
err := server.Listen(ctx)
if err != nil {
    log.Fatal(err)
}
```

## Notes

This package provides the core abstractions for MCP. For concrete implementations, see the `client`, `server`, and `transport` packages.