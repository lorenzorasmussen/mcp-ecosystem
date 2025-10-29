#!/usr/bin/env python3
"""
Systematic debugging script for MCP server import issues
"""

import sys
import time
import logging
from typing import Callable

# Set up detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('debug_imports.log')
    ]
)

logger = logging.getLogger(__name__)

def time_import(import_func: Callable, name: str):
    """Time an import operation and catch any exceptions"""
    start_time = time.time()
    logger.info(f"Starting import: {name}")

    try:
        result = import_func()
        end_time = time.time()
        duration = end_time - start_time
        logger.info(".2f")
        return result, duration
    except Exception as e:
        end_time = time.time()
        duration = end_time - start_time
        logger.error(".2f")
        logger.error(f"Exception: {e}")
        import traceback
        logger.error("Traceback:")
        logger.error(traceback.format_exc())
        return None, duration

def test_basic_imports():
    """Test basic Python imports"""
    logger.info("=== TESTING BASIC IMPORTS ===")

    # Test standard library
    time_import(lambda: __import__('sys'), 'sys')
    time_import(lambda: __import__('os'), 'os')
    time_import(lambda: __import__('json'), 'json')

    # Test typing
    time_import(lambda: __import__('typing'), 'typing')

def test_dotenv_imports():
    """Test dotenv related imports"""
    logger.info("=== TESTING DOTENV IMPORTS ===")

    time_import(lambda: __import__('dotenv'), 'dotenv')
    time_import(lambda: __import__('dotenv', fromlist=['load_dotenv']), 'dotenv.load_dotenv')

def test_fastapi_imports():
    """Test FastAPI related imports"""
    logger.info("=== TESTING FASTAPI IMPORTS ===")

    # Test individual FastAPI components
    time_import(lambda: __import__('starlette'), 'starlette')
    time_import(lambda: __import__('starlette.routing'), 'starlette.routing')
    time_import(lambda: __import__('starlette.responses'), 'starlette.responses')

    time_import(lambda: __import__('uvicorn'), 'uvicorn')

    # Test FastAPI itself (this is where it hangs)
    logger.info("About to test FastAPI import - this may hang...")
    fastapi_result, fastapi_duration = time_import(
        lambda: __import__('fastapi'),
        'fastapi'
    )

    if fastapi_result:
        logger.info("FastAPI imported successfully, testing FastAPI class...")
        time_import(
            lambda: fastapi_result.applications.FastAPI,
            'fastapi.FastAPI class'
        )

def test_mcp_imports():
    """Test MCP related imports"""
    logger.info("=== TESTING MCP IMPORTS ===")

    # Test MCP package
    mcp_result, mcp_duration = time_import(
        lambda: __import__('mcp'),
        'mcp'
    )

    if mcp_result:
        logger.info("MCP base imported, testing MCP server...")
        time_import(
            lambda: __import__('mcp.server'),
            'mcp.server'
        )

        time_import(
            lambda: __import__('mcp.server.fastmcp'),
            'mcp.server.fastmcp'
        )

        # This is the critical import that hangs
        logger.info("About to test FastMCP import - this may hang...")
        fastmcp_result, fastmcp_duration = time_import(
            lambda: __import__('mcp.server.fastmcp', fromlist=['FastMCP']),
            'mcp.server.fastmcp.FastMCP'
        )

        if fastmcp_result:
            logger.info("FastMCP imported successfully, testing class instantiation...")
            time_import(
                lambda: fastmcp_result.FastMCP('test'),
                'FastMCP instantiation'
            )

def test_pydantic_imports():
    """Test Pydantic related imports"""
    logger.info("=== TESTING PYDANTIC IMPORTS ===")

    # Test pydantic core first
    pydantic_core_result, core_duration = time_import(
        lambda: __import__('pydantic_core'),
        'pydantic_core'
    )

    # Test pydantic
    logger.info("About to test Pydantic import - this may hang...")
    pydantic_result, pydantic_duration = time_import(
        lambda: __import__('pydantic'),
        'pydantic'
    )

    if pydantic_result:
        logger.info("Pydantic imported successfully, testing BaseModel...")
        time_import(
            lambda: pydantic_result.BaseModel,
            'pydantic.BaseModel'
        )

def test_combined_imports():
    """Test imports that combine multiple packages"""
    logger.info("=== TESTING COMBINED IMPORTS ===")

    # Test the combination that causes issues
    logger.info("Testing FastAPI + MCP combination...")
    try:
        import fastapi
        logger.info("FastAPI imported for combined test")

        import mcp.server.fastmcp
        logger.info("MCP imported for combined test")

        # Try creating instances
        from fastapi import FastAPI
        app = FastAPI()
        logger.info("FastAPI app created")

        from mcp.server.fastmcp import FastMCP
        mcp = FastMCP("test")
        logger.info("FastMCP instance created")

        logger.info("Combined imports successful!")

    except Exception as e:
        logger.error(f"Combined import failed: {e}")
        import traceback
        logger.error(traceback.format_exc())

def main():
    logger.info("Starting systematic import debugging...")

    # Run tests in order of increasing complexity
    test_basic_imports()
    test_dotenv_imports()
    test_pydantic_imports()
    test_fastapi_imports()
    test_mcp_imports()
    test_combined_imports()

    logger.info("Import debugging complete. Check debug_imports.log for details.")

if __name__ == "__main__":
    main()