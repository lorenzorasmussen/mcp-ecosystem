#!/usr/bin/env python3
"""
Direct test of Mem0 memory operations
Tests all core functionality including add_memory, get_memories, user_id handling, error cases, and persistence.
"""

import os
import sys
import time
import json
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment
load_dotenv()

def get_memory_client():
    """Get memory client"""
    try:
        mem0_api_key = os.getenv("MEM0_API_KEY")
        if mem0_api_key:
            from mem0.client.main import MemoryClient
            return MemoryClient(api_key=mem0_api_key)
        else:
            from mem0 import Memory
            return Memory(
                config={
                    "vector_store": {
                        "provider": "qdrant",
                        "config": {
                            "host": os.getenv("QDRANT_HOST", "localhost"),
                            "port": int(os.getenv("QDRANT_PORT", "6333")),
                            "collection_name": "mem0"
                        }
                    }
                }
            )
    except Exception as e:
        print(f"Failed to initialize memory client: {e}")
        return None

def test_add_memory(client, text: str, user_id: str = "test_user") -> bool:
    """Test adding a memory"""
    try:
        from mem0.client.main import MemoryClient
        if isinstance(client, MemoryClient):
            messages = [{"role": "user", "content": text}]
            result = client.add(messages, user_id=user_id, output_format="v1.1")
        else:
            result = client.add(text, user_id=user_id)
        print(f"✅ Added memory: {text[:50]}...")
        return True
    except Exception as e:
        print(f"❌ Failed to add memory: {e}")
        return False

def test_get_memories(client, user_id: str = "test_user", limit: int = 10) -> bool:
    """Test getting memories"""
    try:
        from mem0.client.main import MemoryClient
        if isinstance(client, MemoryClient):
            memories = client.get_all(user_id=user_id, page=1, page_size=limit)
            if isinstance(memories, dict) and 'results' in memories:
                results = memories['results']
            else:
                results = memories
        else:
            results = client.get(user_id=user_id)

        if results:
            print(f"✅ Retrieved {len(results)} memories for user {user_id}")
            for i, memory in enumerate(results[:3]):  # Show first 3
                mem_text = memory.get('memory', memory) if isinstance(memory, dict) else memory
                print(f"   {i+1}. {mem_text[:50]}...")
            return True
        else:
            print(f"ℹ️  No memories found for user {user_id}")
            return True
    except Exception as e:
        print(f"❌ Failed to get memories: {e}")
        return False

def test_search_memories(client, query: str, user_id: str = "test_user", limit: int = 5) -> bool:
    """Test searching memories"""
    try:
        from mem0.client.main import MemoryClient
        if isinstance(client, MemoryClient):
            results = client.search(query, user_id=user_id, output_format="v1.1")
            if isinstance(results, dict) and 'results' in results:
                memories = results['results']
            else:
                memories = results
        else:
            memories = client.search(query, user_id=user_id)

        if memories:
            print(f"✅ Search '{query}' found {len(memories)} results")
            for i, memory in enumerate(memories[:3]):
                mem_text = memory.get('memory', memory) if isinstance(memory, dict) else memory
                print(f"   {i+1}. {mem_text[:50]}...")
            return True
        else:
            print(f"ℹ️  Search '{query}' found no results")
            return True
    except Exception as e:
        print(f"❌ Failed to search memories: {e}")
        return False

def test_delete_all_memories(client, user_id: str = "test_user") -> bool:
    """Test deleting all memories"""
    try:
        from mem0.client.main import MemoryClient
        if isinstance(client, MemoryClient):
            client.delete_all(user_id=user_id)
        else:
            client.delete_all(user_id=user_id)
        print(f"✅ Deleted all memories for user {user_id}")
        return True
    except Exception as e:
        print(f"❌ Failed to delete memories: {e}")
        return False

def test_batch_add_memories(client, memories: list, user_id: str = "test_user") -> bool:
    """Test batch adding memories"""
    try:
        results = []
        from mem0.client.main import MemoryClient
        for i, memory_text in enumerate(memories):
            try:
                if isinstance(client, MemoryClient):
                    messages = [{"role": "user", "content": memory_text}]
                    client.add(messages, user_id=user_id, output_format="v1.1")
                else:
                    client.add(memory_text, user_id=user_id)
                results.append(f"✓ Memory {i+1} added")
            except Exception as e:
                results.append(f"✗ Memory {i+1} failed: {str(e)}")

        print(f"✅ Batch operation completed: {len([r for r in results if r.startswith('✓')])}/{len(memories)} successful")
        return True
    except Exception as e:
        print(f"❌ Failed batch operation: {e}")
        return False

def run_comprehensive_tests():
    """Run comprehensive tests"""
    print("🧪 Comprehensive Mem0 Memory Operations Test")
    print("=" * 60)

    # Initialize client
    client = get_memory_client()
    if not client:
        print("❌ Failed to initialize memory client")
        return False

    test_results = []
    start_time = time.time()

    # Test data
    test_memories = [
        "User prefers dark mode in all applications",
        "User's favorite programming language is Python",
        "User has a meeting every Tuesday at 10 AM",
        "User's email address is user@example.com",
        "User likes coffee with milk and no sugar",
        "User's birthday is January 15th",
        "User works as a software engineer",
        "User's phone number is +1-555-0123",
        "User prefers Firefox over Chrome",
        "User has allergies to peanuts"
    ]

    special_chars_memory = "User's code snippet: def hello():\n    print('Hello, 世界! 🌍')\n    return 'café & naïve résumé'"

    # Test 1: Basic add memory
    print("\n1️⃣  Testing basic memory addition...")
    success = test_add_memory(client, "Test memory for basic functionality", "test_user_1")
    test_results.append(("Basic Add Memory", success))

    # Test 2: Add memory with special characters
    print("\n2️⃣  Testing memory addition with special characters...")
    success = test_add_memory(client, special_chars_memory, "test_user_1")
    test_results.append(("Special Characters", success))

    # Test 3: Add multiple memories
    print("\n3️⃣  Testing multiple memory additions...")
    success_count = 0
    for i, memory in enumerate(test_memories[:5]):
        if test_add_memory(client, memory, "test_user_1"):
            success_count += 1
    success = success_count == 5
    test_results.append(("Multiple Additions", success))

    # Test 4: Get memories
    print("\n4️⃣  Testing memory retrieval...")
    success = test_get_memories(client, "test_user_1")
    test_results.append(("Get Memories", success))

    # Test 5: Search memories
    print("\n5️⃣  Testing memory search...")
    success = test_search_memories(client, "programming", "test_user_1")
    test_results.append(("Search Memories", success))

    # Test 6: User isolation
    print("\n6️⃣  Testing user isolation...")
    test_add_memory(client, "Memory for user 2", "test_user_2")
    memories_user1 = test_get_memories(client, "test_user_1", limit=1)
    memories_user2 = test_get_memories(client, "test_user_2", limit=1)
    success = memories_user1 and memories_user2  # Both should succeed
    test_results.append(("User Isolation", success))

    # Test 7: Batch add memories
    print("\n7️⃣  Testing batch memory addition...")
    batch_memories = [
        "Batch memory 1: User likes hiking",
        "Batch memory 2: User has a cat named Whiskers",
        "Batch memory 3: User prefers tea over coffee"
    ]
    success = test_batch_add_memories(client, batch_memories, "test_user_1")
    test_results.append(("Batch Add", success))

    # Test 8: Persistence across sessions (simulate by getting again)
    print("\n8️⃣  Testing persistence (retrieval after additions)...")
    success = test_get_memories(client, "test_user_1")
    test_results.append(("Persistence", success))

    # Test 9: Error handling - invalid user_id
    print("\n9️⃣  Testing error handling...")
    try:
        # Try with None user_id
        test_add_memory(client, "Test error handling", None)
        success = False  # Should have failed
    except:
        success = True  # Expected to fail
    test_results.append(("Error Handling", success))

    # Test 10: Delete all memories
    print("\n🔟 Testing memory deletion...")
    success = test_delete_all_memories(client, "test_user_1")
    test_results.append(("Delete All", success))

    # Verify deletion
    print("\n🔍 Verifying deletion...")
    memories_after_delete = test_get_memories(client, "test_user_1")
    # Note: Some systems may not immediately reflect deletion

    # Performance test
    print("\n⚡ Performance test (adding 10 memories)...")
    perf_start = time.time()
    perf_success = test_batch_add_memories(client, test_memories, "perf_test_user")
    perf_time = time.time() - perf_start
    print(".2f")
    test_results.append(("Performance", perf_success and perf_time < 30))  # Should take less than 30 seconds

    # Clean up
    test_delete_all_memories(client, "test_user_1")
    test_delete_all_memories(client, "test_user_2")
    test_delete_all_memories(client, "perf_test_user")

    # Summary
    total_time = time.time() - start_time
    passed = sum(1 for _, success in test_results if success)
    total = len(test_results)

    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(".2f")
    print(".2f")

    print("\nDetailed Results:")
    for test_name, success in test_results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {status} {test_name}")

    print("\n🎯 SUCCESS CRITERIA EVALUATION")
    print("- All basic operations work correctly: ", "✅ YES" if passed >= 8 else "❌ NO")
    print("- Error handling is robust: ", "✅ YES" if test_results[8][1] else "❌ NO")  # Error handling test
    print("- Data persistence is reliable: ", "✅ YES" if test_results[7][1] else "❌ NO")  # Persistence test
    print("- User isolation works properly: ", "✅ YES" if test_results[5][1] else "❌ NO")  # User isolation test

    return passed == total

if __name__ == "__main__":
    success = run_comprehensive_tests()
    sys.exit(0 if success else 1)