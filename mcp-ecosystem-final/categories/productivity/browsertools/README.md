# MCP Browsertools Server for Zed

This is an MCP (Model Context Protocol) server that provides browser automation and web scraping tools for use with Zed IDE and other MCP-compatible clients.

## Features

- **Browser Navigation**: Navigate to URLs programmatically
- **Element Interaction**: Click on web elements using CSS selectors
- **Text Extraction**: Extract text content from web pages
- **Screenshots**: Capture screenshots of web pages
- **Web Scraping**: Extract structured data from websites
- **Headless Browser Automation**: Run browser operations without UI

## Prerequisites

- Node.js 16+
- npm or yarn
- Docker (optional, for containerized deployment)

## Installation

### Option 1: Direct Installation

```bash
# Navigate to the browsertools server directory
cd /Users/lorenzorasmussen/.local/share/mcp/mcp-ecosystem-final/categories/productivity/browsertools

# Install dependencies
npm install

# Start the server
npm start
```

### Option 2: Using NPX (As specified for Zed)

```bash
# Run directly with npx
npx @agentdeskai/browser-tools-server@1.2.0
```

### Option 3: Docker Deployment

```bash
# Build the Docker image
docker build -t mcp-browsertools-server .

# Run the container
docker run -p 3107:3107 mcp-browsertools-server
```

## Configuration for Zed

To configure this server for use with Zed IDE, add the following to your Zed MCP configuration:

```json
{
  "name": "browsertools-server",
  "server_command": "npx",
  "server_args": ["@agentdeskai/browser-tools-server@1.2.0"],
  "description": "Browser automation and web scraping tools for Zed IDE"
}
```

## Available Tools

### browser_navigate
Navigate to a URL

**Parameters:**
- `url` (string, required): URL to navigate to

### browser_click_element
Click on a web element

**Parameters:**
- `selector` (string, required): CSS selector for the element to click

### browser_extract_text
Extract text from a web page

**Parameters:**
- `selector` (string, required): CSS selector for the element to extract text from

### browser_screenshot
Take a screenshot of the current page

**Parameters:**
- `filename` (string, optional): Filename to save the screenshot as

## Environment Variables

The server can be configured using the following environment variables:

- `PORT`: Server port (default: 3107)
- `LOG_LEVEL`: Logging level (default: info)
- `PUPPETEER_HEADLESS`: Whether to run browser in headless mode (default: true)
- `PUPPETEER_TIMEOUT`: Browser operation timeout in ms (default: 30000)

## Usage Examples

### Navigate to a Website
```json
{
  "name": "browser_navigate",
  "arguments": {
    "url": "https://example.com"
  }
}
```

### Click a Button
```json
{
  "name": "browser_click_element",
  "arguments": {
    "selector": "#submit-button"
  }
}
```

### Extract Page Text
```json
{
  "name": "browser_extract_text",
  "arguments": {
    "selector": "body"
  }
}
```

### Take a Screenshot
```json
{
  "name": "browser_screenshot",
  "arguments": {
    "filename": "screenshot.png"
  }
}
```

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

## Logging

The server logs to both console (in development) and files (in production):

- `logs/error.log`: Error logs
- `logs/combined.log`: All logs

## Security

- Uses Helmet.js for HTTP security headers
- Implements CORS with configurable origins
- Rate limiting to prevent abuse
- Input validation for all tool parameters

## Troubleshooting

### Common Issues

1. **Puppeteer Installation Issues**:
   ```bash
   # On macOS with Apple Silicon
   npm install puppeteer --platform=darwin --arch=arm64
   
   # On Linux
   sudo apt-get install chromium
   ```

2. **Permission Issues**:
   ```bash
   # Ensure proper permissions
   chmod +x index.js
   ```

3. **Port Conflicts**:
   ```bash
   # Change port
   PORT=3108 npm start
   ```

### Health Check
```bash
curl http://localhost:3107/health
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT