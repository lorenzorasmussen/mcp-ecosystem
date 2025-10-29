#!/usr/bin/env python3
"""
Simple test of Mem0 memory operations
"""

import os
import time
from dotenv import load_dotenv

load_dotenv()

from mem0.client.main import MemoryClient

def main():
    client = MemoryClient(api_key=os.getenv('MEM0_API_KEY'))
    user_id = f'test_user_{int(time.time())}'

    print(f"Testing with user_id: {user_id}")

    # Test 1: Add memory
    print("\n1. Adding memory...")
    result = client.add([{'role': 'user', 'content': 'User prefers dark mode'}], user_id=user_id, output_format='v1.1')
    print(f"Add result: {result}")

    # Test 2: Add another memory
    print("\n2. Adding another memory...")
    result2 = client.add([{'role': 'user', 'content': 'User likes Python programming'}], user_id=user_id, output_format='v1.1')
    print(f"Add result: {result2}")

    # Test 3: Get memories
    print("\n3. Getting memories...")
    time.sleep(1)  # Small delay
    memories = client.get_all(user_id=user_id, page=1, page_size=10)
    print(f"Memories: {memories}")

    # Test 4: Search memories
    print("\n4. Searching memories...")
    search_result = client.search('Python', user_id=user_id, output_format='v1.1')
    print(f"Search result: {search_result}")

    # Test 5: Different user
    print("\n5. Testing different user...")
    user2 = f'test_user2_{int(time.time())}'
    client.add([{'role': 'user', 'content': 'Different user memory'}], user_id=user2, output_format='v1.1')
    memories_user2 = client.get_all(user_id=user2, page=1, page_size=10)
    print(f"User2 memories: {memories_user2}")

    # Test 6: Delete all
    print("\n6. Deleting all memories...")
    client.delete_all(user_id=user_id)
    memories_after = client.get_all(user_id=user_id, page=1, page_size=10)
    print(f"Memories after delete: {memories_after}")

    print("\n✅ All basic tests completed!")

if __name__ == "__main__":
    main()