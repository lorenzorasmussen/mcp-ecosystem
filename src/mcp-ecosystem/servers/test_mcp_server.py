#!/usr/bin/env python3
"""
Test script for Mem0 MCP Server
Tests all memory operations via STDIO interface
"""

import subprocess
import json
import sys
import time
from typing import Dict, Any

def send_mcp_message(process: subprocess.Popen, message: Dict[str, Any]) -> Dict[str, Any]:
    """Send a message to MCP server and get response"""
    message_json = json.dumps(message) + "\n"
    process.stdin.write(message_json.encode())
    process.stdin.flush()

    # Read response
    response_line = process.stdout.readline().decode().strip()
    if response_line:
        return json.loads(response_line)
    return {}

def test_mcp_server():
    """Test the MCP server functionality"""

    print("🧪 Testing Mem0 MCP Server")
    print("=" * 50)

    # Start the MCP server
    try:
        process = subprocess.Popen(
            ["uv", "run", "python3", "mem0_server.py"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd="/Users/lorenzorasmussen/Projects/mem0/mem0-mcp",
            text=False
        )
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        return False

    time.sleep(2)  # Wait for server to initialize

    try:
        # Test 1: Initialize connection
        print("1️⃣  Testing server initialization...")
        init_message = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "test-client",
                    "version": "1.0.0"
                }
            }
        }

        response = send_mcp_message(process, init_message)
        if "result" in response:
            print("✅ Server initialized successfully")
        else:
            print(f"❌ Initialization failed: {response}")
            return False

        # Test 2: List tools
        print("\n2️⃣  Testing tool listing...")
        tools_message = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list",
            "params": {}
        }

        response = send_mcp_message(process, tools_message)
        if "result" in response and "tools" in response["result"]:
            tools = response["result"]["tools"]
            print(f"✅ Found {len(tools)} tools:")
            for tool in tools:
                print(f"   - {tool['name']}: {tool['description'][:50]}...")
        else:
            print(f"❌ Tool listing failed: {response}")
            return False

        # Test 3: Add memory
        print("\n3️⃣  Testing memory addition...")
        add_message = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "add_memory",
                "arguments": {
                    "text": "Test memory from MCP integration test",
                    "user_id": "test_user"
                }
            }
        }

        response = send_mcp_message(process, add_message)
        if "result" in response:
            print("✅ Memory added successfully")
        else:
            print(f"❌ Memory addition failed: {response}")
            return False

        # Test 4: Get memories
        print("\n4️⃣  Testing memory retrieval...")
        get_message = {
            "jsonrpc": "2.0",
            "id": 4,
            "method": "tools/call",
            "params": {
                "name": "get_memories",
                "arguments": {
                    "user_id": "test_user",
                    "limit": 5
                }
            }
        }

        response = send_mcp_message(process, get_message)
        if "result" in response:
            print("✅ Memories retrieved successfully")
        else:
            print(f"❌ Memory retrieval failed: {response}")
            return False

        # Test 5: Search memories
        print("\n5️⃣  Testing memory search...")
        search_message = {
            "jsonrpc": "2.0",
            "id": 5,
            "method": "tools/call",
            "params": {
                "name": "search_memories",
                "arguments": {
                    "query": "test",
                    "user_id": "test_user",
                    "limit": 3
                }
            }
        }

        response = send_mcp_message(process, search_message)
        if "result" in response:
            print("✅ Memory search successful")
        else:
            print(f"❌ Memory search failed: {response}")
            return False

        # Test 6: Delete all memories
        print("\n6️⃣  Testing memory deletion...")
        delete_message = {
            "jsonrpc": "2.0",
            "id": 6,
            "method": "tools/call",
            "params": {
                "name": "delete_all_memories",
                "arguments": {
                    "user_id": "test_user"
                }
            }
        }

        response = send_mcp_message(process, delete_message)
        if "result" in response:
            print("✅ Memories deleted successfully")
        else:
            print(f"❌ Memory deletion failed: {response}")
            return False

        print("\n🎉 All tests passed! MCP server is working correctly.")
        return True

    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False
    finally:
        # Clean up
        process.terminate()
        process.wait()

if __name__ == "__main__":
    success = test_mcp_server()
    sys.exit(0 if success else 1)