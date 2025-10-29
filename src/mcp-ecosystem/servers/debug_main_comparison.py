#!/usr/bin/env python3
"""
Compare minimal server vs main server to find the breaking point
"""

import sys
import time
import logging
import threading

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('debug_main_comparison.log')
    ]
)

logger = logging.getLogger(__name__)

def time_operation(operation_func, name: str, timeout: int = 10):
    """Time an operation with a timeout"""
    result = [None]
    exception = [None]

    def run_operation():
        try:
            result[0] = operation_func()
        except Exception as e:
            exception[0] = e
            logger.error(f"Exception in {name}: {e}")
            import traceback
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

def test_minimal_server():
    """Test the minimal server that works"""
    logger.info("=== TESTING MINIMAL SERVER (KNOWN WORKING) ===")

    def create_minimal():
        from starlette.applications import Starlette
        from starlette.routing import Route
        from starlette.responses import JSONResponse
        from mcp.server.fastmcp import FastMCP

        mcp = FastMCP("mem0-mcp-minimal")

        @mcp.tool()
        async def health_check() -> str:
            return "MCP server is running"

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

    app, duration = time_operation(create_minimal, "minimal server creation")
    return app

def test_main_server_import():
    """Test importing the main server module"""
    logger.info("=== TESTING MAIN SERVER IMPORT ===")

    def import_main():
        # Import the main module
        import main
        return main

    main_module, duration = time_operation(import_main, "main module import")
    return main_module

def test_main_server_creation():
    """Test creating the main server"""
    logger.info("=== TESTING MAIN SERVER CREATION ===")

    def create_main():
        import main
        # Try to create the starlette app
        starlette_app = main.create_starlette_app(main.mcp._mcp_server, debug=True)
        return starlette_app

    app, duration = time_operation(create_main, "main server creation", timeout=15)
    return app

def test_main_server_startup():
    """Test starting the main server"""
    logger.info("=== TESTING MAIN SERVER STARTUP ===")

    app = test_main_server_creation()
    if app is None:
        logger.error("Failed to create main server, skipping startup test")
        return None

    def start_main():
        import uvicorn
        uvicorn.run(app, host="127.0.0.1", port=8082, log_level="info")

    result, duration = time_operation(start_main, "main server startup", timeout=5)
    return result, duration

def main():
    logger.info("Starting main server vs minimal server comparison...")

    # Test minimal server (should work)
    minimal_app = test_minimal_server()

    # Test main server components
    main_module = test_main_server_import()
    main_app = test_main_server_creation()
    main_startup = test_main_server_startup()

    logger.info("Comparison complete. Check debug_main_comparison.log for details.")

    # Summary
    logger.info("=== SUMMARY ===")
    logger.info(f"Minimal server creation: {'SUCCESS' if minimal_app else 'FAILED'}")
    logger.info(f"Main module import: {'SUCCESS' if main_module else 'FAILED'}")
    logger.info(f"Main server creation: {'SUCCESS' if main_app else 'FAILED'}")
    logger.info(f"Main server startup: {'SUCCESS' if main_startup and main_startup[0] else 'FAILED'}")

if __name__ == "__main__":
    main()