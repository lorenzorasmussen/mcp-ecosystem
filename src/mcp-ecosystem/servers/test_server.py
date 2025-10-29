#!/usr/bin/env python3
"""Simple test script to check MCP server initialization"""

try:
    from mcp.server.fastmcp import FastMCP
    print("✓ FastMCP import successful")

    mcp = FastMCP("test-mem0-mcp-server")
    print("✓ MCP server initialization successful")

    print("Basic MCP setup successful - mem0 imports are lazy")

except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()