# Rube MCP Server

Rube is a Model Context Protocol (MCP) server that connects your AI tools to 500+ apps like Gmail, Slack, GitHub, and Notion. Simply install it in your AI client, authenticate once with your apps, and start asking your AI to perform real actions like 'Send an email' or 'Create a task.'

## Features

- **MCP Protocol Compliance**: Fully compliant with the Model Context Protocol specification
- **500+ App Integrations**: Connect to popular apps like Gmail, Slack, GitHub, Notion, etc.
- **Secure Authentication**: OAuth 2.0 with PKCE for secure app connections
- **Resource Management**: Create, read, update, and delete resources across connected apps
- **Tool Execution**: Execute tools across connected apps from AI clients
- **Streaming Support**: Real-time updates with streamable HTTP transport
- **Prompt Templates**: Predefined prompt templates for common tasks

## Installation

### Prerequisites

- Node.js 14+ 
- PostgreSQL database
- Redis server (for session management)

### Setup

1. Install the package:
```bash
npm install @composio/rube-mcp
```

2. Set up environment variables (see `.env.example`)

3. Run database migrations:
```bash
npx prisma migrate dev
```

4. Start the server:
```bash
npm start
```

## Usage

### Running the Server

```javascript
const { startServer } = require('@composio/rube-mcp');

async function start() {
  const server = await startServer({
    port: 3000,
    host: 'localhost'
  });
  
  console.log('MCP Server running on http://localhost:3000');
}

start();
```

### CLI Usage

```bash
# Start the server
npx rube start

# Get server information
npx rube info

# Interactive setup for AI clients
npx rube setup
```

## API Endpoints

### MCP Protocol Endpoints

- `GET /mcp/info` - Server information
- `GET /mcp/specification` - MCP protocol specification
- `GET /mcp/tools` - List available tools
- `GET /mcp/tools/:toolId` - Get specific tool details
- `POST /mcp/tools/:toolId/call` - Execute a tool
- `GET /mcp/resources` - List resources
- `GET /mcp/resources/:resourceId` - Get specific resource
- `POST /mcp/resources` - Create a resource
- `PATCH /mcp/resources/:resourceId` - Update a resource
- `DELETE /mcp/resources/:resourceId` - Delete a resource
- `POST /mcp/stream` - Streamable HTTP endpoint

### Authentication Endpoints

- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/github` - Initiate GitHub OAuth
- `GET /auth/slack` - Initiate Slack OAuth
- `GET /auth/connections` - List connected apps
- `DELETE /auth/connections/:appId` - Disconnect an app

## Configuration

The server can be configured using environment variables:

- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL database URL
- `REDIS_URL` - Redis server URL
- `JWT_SECRET` - Secret key for JWT tokens
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth credentials
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` - GitHub OAuth credentials
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` - Slack OAuth credentials

## Architecture

The Rube MCP Server consists of several core components:

1. **Transport Layer**: HTTP and streamable HTTP endpoints compliant with MCP specification
2. **Authentication Service**: Secure OAuth 2.0 flow for connecting to various apps
3. **Tool Execution Engine**: Processes tool calls and executes against connected apps
4. **Resource Management**: Handles resources across connected applications
5. **App Integration Layer**: Abstracts API differences between various apps
6. **Database Layer**: Persistent storage for user sessions and app connections

## Security

- All API requests require authentication
- OAuth 2.0 with PKCE for secure app connections
- JWT tokens for session management
- Rate limiting to prevent abuse
- Input validation and sanitization
- Encrypted storage of sensitive tokens

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run the server in development mode: `npm run dev`

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## License

MIT