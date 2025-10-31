# API Documentation

## 📋 API Reference Overview

This section contains comprehensive API documentation for the MCP (Model Context Protocol) Ecosystem. All APIs follow RESTful principles and are designed for interoperability across different platforms and languages.

## 🏗️ Core APIs

### MCP Protocol API

The foundational Model Context Protocol API that enables standardized communication between AI models and tools.

**Base URL**: `/api/v1/mcp`

#### Endpoints

| Endpoint              | Method | Description              | Status    |
| --------------------- | ------ | ------------------------ | --------- |
| `/health`             | GET    | Service health check     | ✅ Active |
| `/tools`              | GET    | List available tools     | ✅ Active |
| `/tools/{id}/execute` | POST   | Execute a specific tool  | ✅ Active |
| `/resources`          | GET    | List available resources | ✅ Active |
| `/resources/{id}`     | GET    | Get specific resource    | ✅ Active |
| `/sessions`           | POST   | Create new session       | ✅ Active |
| `/sessions/{id}`      | GET    | Get session status       | ✅ Active |

#### Authentication

All API endpoints require authentication via API key or OAuth2 token.

```http
Authorization: Bearer <your-api-key>
```

### Documentation Sync API

Automated documentation synchronization and health monitoring.

**Base URL**: `/api/v1/docs`

#### Endpoints

| Endpoint    | Method | Description                      | Status    |
| ----------- | ------ | -------------------------------- | --------- |
| `/sync`     | POST   | Trigger documentation sync       | ✅ Active |
| `/health`   | GET    | Get documentation health metrics | ✅ Active |
| `/validate` | POST   | Validate documentation quality   | ✅ Active |
| `/drift`    | GET    | Check code-documentation drift   | ✅ Active |

### Coverage Analysis API

Test coverage analysis and reporting.

**Base URL**: `/api/v1/coverage`

#### Endpoints

| Endpoint     | Method | Description                           | Status    |
| ------------ | ------ | ------------------------------------- | --------- |
| `/analyze`   | POST   | Run coverage analysis                 | ✅ Active |
| `/report`    | GET    | Get coverage report                   | ✅ Active |
| `/threshold` | PUT    | Update coverage thresholds            | ✅ Active |
| `/improve`   | POST   | Generate test improvement suggestions | ✅ Active |

## 🔧 API Specifications

### Request/Response Format

All APIs use JSON for request and response bodies:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2025-10-29T10:00:00Z",
  "requestId": "req-12345"
}
```

### Error Handling

Standard HTTP status codes with detailed error messages:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "threshold",
      "issue": "Must be between 0 and 100"
    }
  },
  "timestamp": "2025-10-29T10:00:00Z",
  "requestId": "req-12345"
}
```

### Rate Limiting

- **Authenticated requests**: 1000 requests per hour
- **Anonymous requests**: 100 requests per hour
- Rate limit headers included in all responses

## 📚 SDK Documentation

### JavaScript/TypeScript SDK

```javascript
import { MCPClient } from "@modelcontextprotocol/sdk";

const client = new MCPClient({
  apiKey: "your-api-key",
  baseUrl: "https://api.mcp-ecosystem.com",
});

// List available tools
const tools = await client.tools.list();

// Execute a tool
const result = await client.tools.execute("tool-id", {
  input: "example input",
});
```

### Python SDK

```python
from mcp_client import MCPClient

client = MCPClient(
    api_key='your-api-key',
    base_url='https://api.mcp-ecosystem.com'
)

# List available tools
tools = client.tools.list()

# Execute a tool
result = client.tools.execute('tool-id', input='example input')
```

### Go SDK

```go
package main

import (
    "github.com/mcp-ecosystem/go-sdk/client"
)

func main() {
    client := client.NewClient(client.Config{
        APIKey:  "your-api-key",
        BaseURL: "https://api.mcp-ecosystem.com",
    })

    // List available tools
    tools, err := client.Tools.List()

    // Execute a tool
    result, err := client.Tools.Execute("tool-id", map[string]interface{}{
        "input": "example input",
    })
}
```

## 🔐 Authentication & Security

### API Key Authentication

1. **Obtain API Key**: Register at [developer portal](https://developers.mcp-ecosystem.com)
2. **Include in Requests**: Add to Authorization header
3. **Secure Storage**: Never expose keys in client-side code

### OAuth2 Flow

For web applications requiring user-specific access:

```javascript
// Redirect to OAuth authorization
window.location.href = `/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;

// Handle callback and exchange code for token
const response = await fetch("/oauth/token", {
  method: "POST",
  body: JSON.stringify({
    code: authCode,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  }),
});
```

## 📊 Monitoring & Analytics

### Health Checks

```bash
# Service health
curl -H "Authorization: Bearer $API_KEY" https://api.mcp-ecosystem.com/api/v1/health

# Documentation health
curl -H "Authorization: Bearer $API_KEY" https://api.mcp-ecosystem.com/api/v1/docs/health
```

### Metrics Endpoints

Access real-time metrics and analytics:

- **Response Times**: Average and percentile response times
- **Error Rates**: Success/failure ratios by endpoint
- **Usage Patterns**: Most frequently used tools and resources
- **Performance**: System resource utilization

## 🧪 Testing & Development

### Sandbox Environment

Test your integrations in our sandbox environment:

**Base URL**: `https://sandbox.mcp-ecosystem.com`

- Full API compatibility with production
- Isolated data and resources
- No rate limiting for development
- Mock data for testing edge cases

### Development Tools

- **API Explorer**: Interactive API testing interface
- **SDK Examples**: Code samples for all supported languages
- **Webhook Simulator**: Test webhook integrations
- **Load Testing**: Performance testing tools

## 📞 Support & Resources

### Getting Help

- **API Documentation**: This comprehensive reference
- **Developer Forum**: Community discussions and Q&A
- **Support Tickets**: Direct support for enterprise customers
- **Status Page**: Real-time API status and incident updates

### Changelog

- **v1.0.0** (2025-10-29): Initial API release with core MCP protocol
- **v1.1.0** (Upcoming): Enhanced documentation sync capabilities
- **v1.2.0** (Planned): Advanced coverage analysis features

---

**API Version**: v1.0.0
**Last Updated**: 2025-10-29
**Contact**: API Support Team
