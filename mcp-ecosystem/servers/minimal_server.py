#!/usr/bin/env python3
"""
Minimal MCP server that bypasses the problematic imports
"""

import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    try:
        logger.info("Starting minimal MCP server...")

        # Import only what we need
        from fastapi import FastAPI
        import uvicorn
        from mcp.server.fastmcp import FastMCP
        from mcp.server.sse import SseServerTransport

        logger.info("✓ Core imports successful")

        # Create minimal MCP server
        mcp = FastMCP("mem0-mcp-minimal")

        @mcp.tool()
        async def health_check() -> str:
            """Check if the server is running"""
            return "MCP server is running"

        logger.info("✓ MCP server created with health check tool")

        # Create Starlette app
        from starlette.applications import Starlette
        from starlette.routing import Route, Mount
        from starlette.responses import JSONResponse

        sse = SseServerTransport("/messages/")

        async def handle_sse(request):
            async with sse.connect_sse(
                request.scope, request.receive, request._send
            ) as (read_stream, write_stream):
                await mcp._mcp_server.run(
                    read_stream, write_stream,
                    mcp._mcp_server.create_initialization_options()
                )

        async def health_endpoint(request):
            return JSONResponse({"status": "healthy", "server": "mem0-mcp-minimal"})

        async def handle_post_message(request):
            return await sse.handle_post_message(request)

        app = Starlette(routes=[
            Route("/mcp/default_client/sse/default_user", endpoint=handle_sse, methods=["GET"]),
            Route("/messages/", endpoint=handle_post_message, methods=["POST"]),
            Route("/health", endpoint=health_endpoint, methods=["GET"]),
        ])

        logger.info("✓ Starlette app created")
        logger.info("Starting server on port 8080...")

        uvicorn.run(app, host="0.0.0.0", port=8080, log_level="info")

    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    main()