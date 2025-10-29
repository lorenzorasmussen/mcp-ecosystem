#!/usr/bin/env python3
"""
Debug server startup process specifically
"""

import sys
import time
import logging
import threading
from typing import Callable

# Set up detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('debug_server_startup.log')
    ]
)

logger = logging.getLogger(__name__)

def time_operation(operation_func: Callable, name: str, timeout: int = 10):
    """Time an operation with a timeout"""
    result = [None]
    exception = [None]

    def run_operation():
        try:
            result[0] = operation_func()
        except Exception as e:
            exception[0] = e
            import traceback
            logger.error(f"Exception in {name}: {e}")
            logger.error(traceback.format_exc())

    start_time = time.time()
    logger.info(f"Starting operation: {name}")

    thread = threading.Thread(target=run_operation)
    thread.daemon = True
    thread.start()
    thread.join(timeout)

    end_time = time.time()
    duration = end_time - start_time

    if thread.is_alive():
        logger.error(".2f")
        return None, duration
    elif exception[0]:
        logger.error(".2f")
        return None, duration
    else:
        logger.info(".2f")
        return result[0], duration

def test_minimal_server_creation():
    """Test creating the minimal server without starting it"""
    logger.info("=== TESTING MINIMAL SERVER CREATION ===")

    def create_minimal_server():
        from starlette.applications import Starlette
        from starlette.routing import Route
        from starlette.responses import JSONResponse
        from mcp.server.fastmcp import FastMCP

        # Create MCP server
        mcp = FastMCP("mem0-mcp-minimal")

        @mcp.tool()
        async def health_check() -> str:
            return "MCP server is running"

        # Create Starlette app
        async def health_endpoint(request):
            return JSONResponse({"status": "healthy", "server": "mem0-mcp-minimal"})

        async def handle_sse(request):
            from mcp.server.sse import SseServerTransport
            sse = SseServerTransport("/messages/")
            async with sse.connect_sse(
                request.scope, request.receive, request._send
            ) as (read_stream, write_stream):
                await mcp._mcp_server.run(
                    read_stream, write_stream,
                    mcp._mcp_server.create_initialization_options()
                )

        async def handle_post_message(request):
            from mcp.server.sse import SseServerTransport
            sse = SseServerTransport("/messages/")
            return await sse.handle_post_message(request)

        app = Starlette(routes=[
            Route("/mcp/default_client/sse/default_user", endpoint=handle_sse, methods=["GET"]),
            Route("/messages/", endpoint=handle_post_message, methods=["POST"]),
            Route("/health", endpoint=health_endpoint, methods=["GET"]),
        ])

        return app

    app, duration = time_operation(create_minimal_server, "minimal server creation")
    return app

def test_uvicorn_startup(app):
    """Test uvicorn startup with the app"""
    logger.info("=== TESTING UVICORN STARTUP ===")

    def start_uvicorn():
        import uvicorn
        # Start uvicorn in a way that will timeout
        uvicorn.run(app, host="127.0.0.1", port=8081, log_level="debug")

    # This should hang if there's an issue
    result, duration = time_operation(start_uvicorn, "uvicorn startup", timeout=5)
    return result, duration

def test_full_minimal_server():
    """Test the full minimal server startup"""
    logger.info("=== TESTING FULL MINIMAL SERVER ===")

    app = test_minimal_server_creation()
    if app is None:
        logger.error("Failed to create app, skipping uvicorn test")
        return

    result, duration = test_uvicorn_startup(app)
    return result, duration

def main():
    logger.info("Starting server startup debugging...")

    # Test the full minimal server
    test_full_minimal_server()

    logger.info("Server startup debugging complete. Check debug_server_startup.log for details.")

if __name__ == "__main__":
    main()