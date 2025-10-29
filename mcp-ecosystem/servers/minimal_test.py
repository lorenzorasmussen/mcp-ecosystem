#!/usr/bin/env python3
"""Minimal test to check if MCP works at all"""

try:
    print("Testing MCP import...")
    from mcp.server.fastmcp import FastMCP
    print("✓ FastMCP import successful")

    print("Creating MCP server...")
    mcp = FastMCP("minimal-test")
    print("✓ MCP server created")

    print("MCP basic functionality works")

except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()