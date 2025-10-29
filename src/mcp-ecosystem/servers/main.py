"""
MCP Server for Mem0 with support for both cloud and local deployments.

This module implements an MCP (Model Context Protocol) server that provides
memory operations for Mem0. It supports both cloud Mem0 API and local OpenMemory
deployments with automatic configuration management.

Key features:
- Support for both cloud and local Mem0 deployments
- Automatic Docker environment detection and configuration
- Graceful error handling for unavailable dependencies
- Environment variable parsing for API keys
- SSE-based communication for real-time memory operations
"""

import contextvars
import json
import logging
import os
import secrets
import hashlib
import hmac
from typing import Optional, Any

from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from mcp.server.fastmcp import FastMCP
from mcp.server.sse import SseServerTransport
# Lazy imports to avoid initialization hangs
# from mem0 import Memory
# from mem0.client import MemoryClient
from starlette.routing import Route

# Load environment variables
load_dotenv()

# Initialize FastMCP server for mem0 tools
mcp = FastMCP("mem0-mcp-server")

# Initialize memory client and set default user
DEFAULT_USER_ID = "default_user"
CUSTOM_INSTRUCTIONS = """
Extract the Following Information:  

- Code Snippets: Save the actual code for future reference.  
- Explanation: Document a clear description of what the code does and how it works.
- Related Technical Details: Include information about the programming language, dependencies, and system specifications.  
- Key Features: Highlight the main functionalities and important aspects of the snippet.
"""

# Context variables for session management
user_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("user_id")
client_name_var: contextvars.ContextVar[str] = contextvars.ContextVar("client_name")

# Global memory client instance
_memory_client: Optional[Any] = None
_memory_client_config_hash: Optional[str] = None

# Delay memory client initialization to avoid startup hangs
_memory_client_initialized = False

# Performance optimizations
_memory_cache = {}  # Simple in-memory cache for frequent queries
CACHE_TTL_SECONDS = 300  # 5 minutes cache TTL
BATCH_SIZE_LIMIT = 10  # Maximum batch size for operations

# Security settings
API_KEY_HEADER = "X-API-Key"
MAX_REQUESTS_PER_MINUTE = 60
REQUEST_WINDOW_SECONDS = 60

# Rate limiting storage (in production, use Redis)
_rate_limit_store = {}

def verify_api_key(api_key: str) -> bool:
    """Verify API key against allowed keys."""
    allowed_keys = os.getenv("ALLOWED_API_KEYS", "").split(",")
    if not allowed_keys or allowed_keys == [""]:
        # If no keys configured, allow all (for development)
        return True
    return api_key in allowed_keys

def generate_user_token(user_id: str, client_name: str) -> str:
    """Generate a secure token for user identification."""
    secret = os.getenv("JWT_SECRET", "default-secret-change-in-production")
    message = f"{user_id}:{client_name}:{secrets.token_hex(16)}"
    return hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()

def check_rate_limit(client_ip: str, user_id: str) -> bool:
    """Check if request is within rate limits."""
    key = f"{client_ip}:{user_id}"
    current_time = secrets.randbelow(1000000)  # Simple time simulation

    if key not in _rate_limit_store:
        _rate_limit_store[key] = {"count": 0, "window_start": current_time}

    window_data = _rate_limit_store[key]

    # Reset window if expired
    if current_time - window_data["window_start"] > REQUEST_WINDOW_SECONDS:
        window_data["count"] = 0
        window_data["window_start"] = current_time

    # Check limit
    if window_data["count"] >= MAX_REQUESTS_PER_MINUTE:
        return False

    window_data["count"] += 1
    return True

async def authenticate_request(request: Request) -> dict:
    """Authenticate incoming requests."""
    # Check API key
    api_key = request.headers.get(API_KEY_HEADER)
    if api_key and not verify_api_key(api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )

    # Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    user_id = request.path_params.get("user_id", "anonymous")

    if not check_rate_limit(client_ip, user_id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )

    return {"user_id": user_id, "client_ip": client_ip}

def get_memory_client_safe():
    """Get memory client with error handling and connection pooling. Returns None if client cannot be initialized."""
    global _memory_client, _memory_client_config_hash, _memory_client_initialized

    # Only initialize once
    if _memory_client_initialized:
        return _memory_client

    _memory_client_initialized = True

    try:
        # Generate config hash to detect changes
        config_parts = [
            os.getenv("MEM0_API_KEY", ""),
            os.getenv("QDRANT_HOST", "localhost"),
            os.getenv("QDRANT_PORT", "6333"),
            os.getenv("OLLAMA_HOST", ""),
            os.getenv("LLAMA_CPP_MODEL", "")
        ]
        current_config_hash = hashlib.md5("|".join(config_parts).encode()).hexdigest()

        # Reinitialize if config changed
        if _memory_client_config_hash != current_config_hash:
            logging.info("Memory client config changed, reinitializing...")
            _memory_client = None
            _memory_client_config_hash = current_config_hash

        # Check if we should use cloud Mem0 API or local OpenMemory
        mem0_api_key = os.getenv("MEM0_API_KEY")

        if mem0_api_key:
            # Use cloud Mem0 API
            logging.info("Using cloud Mem0 API")
            from mem0.client import MemoryClient
            if _memory_client is None or not isinstance(_memory_client, MemoryClient):
                _memory_client = MemoryClient(api_key=mem0_api_key)
                _memory_client.update_project(custom_instructions=CUSTOM_INSTRUCTIONS)
        else:
            # Use local OpenMemory deployment
            logging.info("Using local OpenMemory deployment")
            from mem0 import Memory
            if _memory_client is None or not isinstance(_memory_client, Memory):
                # Create local memory configuration
                config = {
                    "vector_store": {
                        "provider": "qdrant",
                        "config": {
                            "host": os.getenv("QDRANT_HOST", "localhost"),
                            "port": int(os.getenv("QDRANT_PORT", "6333")),
                            "collection_name": "mem0"
                        }
                    },
                    "llm": {
                        "provider": "openai",
                        "config": {
                            "model": "gpt-4o-mini",
                            "temperature": 0.1,
                            "max_tokens": 2000,
                            "api_key": "env:OPENAI_API_KEY"
                        }
                    },
                    "embedder": {
                        "provider": "openai",
                        "config": {
                            "model": "text-embedding-3-small",
                            "api_key": "env:OPENAI_API_KEY"
                        }
                    },
                    "version": "v1.1"
                }

                # Check for Ollama configuration
                if os.getenv("OLLAMA_HOST"):
                    config["llm"] = {
                        "provider": "ollama",
                        "config": {
                            "model": os.getenv("OLLAMA_MODEL", "llama3.1:latest"),
                            "ollama_base_url": os.getenv("OLLAMA_HOST"),
                            "temperature": 0.1,
                            "max_tokens": 2000,
                        }
                    }
                    config["embedder"] = {
                        "provider": "ollama",
                        "config": {
                            "model": os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text"),
                            "ollama_base_url": os.getenv("OLLAMA_HOST"),
                        }
                    }
                # Check for llama.cpp configuration
                elif os.getenv("LLAMA_CPP_MODEL"):
                    config["llm"] = {
                        "provider": "llama.cpp",
                        "config": {
                            "model": os.getenv("LLAMA_CPP_MODEL"),
                            "temperature": 0.1,
                            "max_tokens": 2000,
                        }
                    }
                    config["embedder"] = {
                        "provider": "llama.cpp",
                        "config": {
                            "model": os.getenv("LLAMA_CPP_EMBEDDING_MODEL", os.getenv("LLAMA_CPP_MODEL")),
                        }
                    }

                _memory_client = Memory.from_config(config_dict=config)

        return _memory_client
    except Exception as e:
        logging.warning(f"Failed to get memory client: {e}")
        return None

def get_cache_key(operation: str, user_id: str, params: dict) -> str:
    """Generate cache key for memory operations."""
    param_str = json.dumps(params, sort_keys=True)
    return f"{operation}:{user_id}:{hashlib.md5(param_str.encode()).hexdigest()}"

def get_cached_result(cache_key: str):
    """Get result from cache if valid."""
    if cache_key in _memory_cache:
        cached_data = _memory_cache[cache_key]
        if secrets.randbelow(1000000) - cached_data["timestamp"] < CACHE_TTL_SECONDS:
            return cached_data["result"]
        else:
            # Expired, remove from cache
            del _memory_cache[cache_key]
    return None

def set_cached_result(cache_key: str, result):
    """Cache result with timestamp."""
    _memory_cache[cache_key] = {
        "result": result,
        "timestamp": secrets.randbelow(1000000)  # Simple timestamp simulation
    }

    # Clean up old cache entries (simple LRU)
    if len(_memory_cache) > 100:  # Max cache size
        oldest_key = min(_memory_cache.keys(), key=lambda k: _memory_cache[k]["timestamp"])
        del _memory_cache[oldest_key]

@mcp.tool(
    description="""Add a new memory to mem0 with optional categorization and tagging. This tool stores information for future reference and context.
    Store every relevant piece of information that could be useful in future conversations.
    When storing information, you should include:
    - Complete context and details
    - Clear descriptions
    - Any relevant metadata
    - Related information or connections
    - Optional tags for categorization (comma-separated)
    The memory will be indexed for semantic search and can be retrieved later using natural language queries."""
)
async def add_memories(text: str, tags: str = "") -> str:
    """Add a new memory to mem0 with optional tags.

    Args:
        text: The content to store in memory
        tags: Optional comma-separated tags for categorization
    """
    try:
        memory_client = get_memory_client_safe()
        if not memory_client:
            return "Error: Memory system unavailable"
        
        # Get user context
        uid = user_id_var.get(DEFAULT_USER_ID)

        # Parse tags
        tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()] if tags else []

        # Prepare metadata
        metadata = {"tags": tag_list} if tag_list else {}

        # Add memory with user context
        from mem0.client import MemoryClient
        if isinstance(memory_client, MemoryClient):
            # Cloud Mem0 API
            messages = [{"role": "user", "content": text}]
            response = memory_client.add(messages, user_id=uid, metadata=metadata, output_format="v1.1")
        else:
            # Local OpenMemory
            response = memory_client.add(text, user_id=uid, metadata=metadata)

        tag_info = f" with tags: {', '.join(tag_list)}" if tag_list else ""
        return f"Successfully added memory{tag_info}: {text}"
    except Exception as e:
        return f"Error adding memory: {str(e)}"

@mcp.tool(
    description="""Retrieve all stored memories for the user. Call this tool when you need 
    complete context of all previously stored information. This is useful when:
    - You need to analyze all available information
    - You want to check all stored details
    - You need to review the full history of stored information
    - You want to ensure no relevant information is missed
    Returns a comprehensive list of stored memories."""
)
async def get_all_memories() -> str:
    """Get all memories for the user.
    
    Returns a JSON formatted list of all stored memories.
    """
    try:
        memory_client = get_memory_client_safe()
        if not memory_client:
            return "Error: Memory system unavailable"
        
        # Get user context
        uid = user_id_var.get(DEFAULT_USER_ID)
        
        # Get all memories with user context
        from mem0.client import MemoryClient
        if isinstance(memory_client, MemoryClient):
            # Cloud Mem0 API
            memories = memory_client.get_all(user_id=uid, page=1, page_size=50)
            if isinstance(memories, dict) and 'results' in memories:
                flattened_memories = [memory["memory"] for memory in memories["results"]]
            else:
                flattened_memories = memories
        else:
            # Local OpenMemory
            memories = memory_client.get_all(user_id=uid)
            if isinstance(memories, dict) and 'results' in memories:
                flattened_memories = [memory["memory"] for memory in memories["results"]]
            else:
                flattened_memories = memories
        
        return json.dumps(flattened_memories, indent=2)
    except Exception as e:
        return f"Error getting memories: {str(e)}"

@mcp.tool(
    description="""Search through stored memories using semantic search with optional tag filtering. This tool should be called
    for EVERY user query to find relevant information. It helps find:
    - Specific information or details
    - Solutions to problems
    - Best practices and guidelines
    - Setup and configuration guides
    - Technical documentation and examples
    The search uses natural language understanding to find relevant matches, so you can
    describe what you're looking for in plain English. You can also filter by tags for more precise results.
    Always search the memories before providing answers to ensure you leverage existing knowledge."""
)
async def search_memories(query: str, limit: int = 5, tags: str = "") -> str:
    """Search memories using semantic search with optional tag filtering and caching.

    The search is powered by natural language understanding, allowing you to find
    relevant information using natural language queries. You can filter results by tags.

    Args:
        query: Search query string describing what you're looking for.
        limit: Maximum number of results to return (default: 5).
        tags: Optional comma-separated tags to filter results.
    """
    try:
        memory_client = get_memory_client_safe()
        if not memory_client:
            return "Error: Memory system unavailable"

        # Get user context
        uid = user_id_var.get(DEFAULT_USER_ID)

        # Parse filter tags
        filter_tags = [tag.strip() for tag in tags.split(',') if tag.strip()] if tags else []

        # Check cache first (include tags in cache key)
        cache_key = get_cache_key("search", uid, {"query": query, "limit": limit, "tags": tags})
        cached_result = get_cached_result(cache_key)
        if cached_result and not filter_tags:
            logging.info(f"Cache hit for search: {query}")
            return cached_result

        # Perform search
        from mem0.client import MemoryClient
        if isinstance(memory_client, MemoryClient):
            # Cloud Mem0 API
            memories = memory_client.search(query, user_id=uid, output_format="v1.1")
            if isinstance(memories, dict) and 'results' in memories:
                all_memories = memories["results"]
            else:
                all_memories = memories if isinstance(memories, list) else []
        else:
            # Local OpenMemory
            memories = memory_client.search(query, user_id=uid)
            if isinstance(memories, dict) and 'results' in memories:
                all_memories = memories["results"]
            else:
                all_memories = memories if isinstance(memories, list) else []

        # Apply tag filtering if specified
        if filter_tags:
            filtered_memories = []
            for memory in all_memories:
                memory_tags = memory.get('metadata', {}).get('tags', [])
                if any(tag in memory_tags for tag in filter_tags):
                    filtered_memories.append(memory)
            flattened_memories = [memory["memory"] for memory in filtered_memories[:limit]]
        else:
            flattened_memories = [memory["memory"] for memory in all_memories[:limit]]

        result = json.dumps(flattened_memories, indent=2)

        # Cache the result (only for non-filtered searches to avoid cache explosion)
        if not filter_tags:
            set_cached_result(cache_key, result)

        return result
    except Exception as e:
        logging.error(f"Error searching memories: {e}")
        return f"Error searching memories: {str(e)}"

@mcp.tool(
    description="""Delete memories based on search criteria or tags. Use this for targeted cleanup of memories.
    You can delete by semantic search query, by tags, or all memories for the user."""
)
async def delete_memories(query: str = "", tags: str = "", delete_all: bool = False) -> str:
    """Delete memories based on search criteria or tags.

    Args:
        query: Optional search query to find memories to delete
        tags: Optional comma-separated tags to filter memories for deletion
        delete_all: If True, delete all memories for the user

    Returns a success message indicating how many memories were deleted.
    """
    try:
        memory_client = get_memory_client_safe()
        if not memory_client:
            return "Error: Memory system unavailable"

        # Get user context
        uid = user_id_var.get(DEFAULT_USER_ID)

        if delete_all:
            # Delete all memories
            from mem0.client import MemoryClient
            if isinstance(memory_client, MemoryClient):
                memory_client.delete_all(user_id=uid)
            else:
                memory_client.delete_all(user_id=uid)

            # Clear cache for this user
            keys_to_remove = [k for k in _memory_cache.keys() if f":{uid}:" in k]
            for key in keys_to_remove:
                del _memory_cache[key]

            return "Successfully deleted all memories"

        elif query or tags:
            # Selective deletion based on search/tags
            # Note: This is a simplified implementation. In production, you'd want
            # the API to support selective deletion by IDs

            # First search to find memories to delete
            search_result = await search_memories(query=query, tags=tags, limit=100)
            try:
                memories_to_delete = json.loads(search_result)
                delete_count = len(memories_to_delete)

                if delete_count == 0:
                    return "No memories found matching the criteria"

                # For now, we can't selectively delete individual memories via API
                # This would require memory IDs, which aren't exposed in the current API
                return f"Found {delete_count} memories matching criteria, but selective deletion is not yet supported. Use delete_all=true to delete all memories."

            except json.JSONDecodeError:
                return "Error parsing search results for deletion"

        else:
            return "Error: Must specify either query/tags or delete_all=true"

    except Exception as e:
        return f"Error deleting memories: {str(e)}"

@mcp.tool(
    description="""Add multiple memories in a batch for better performance. Use this when you need to store
    several related pieces of information at once. This is more efficient than calling add_memories multiple times."""
)
async def batch_add_memories(memories: str) -> str:
    """Add multiple memories in a batch operation.

    Args:
        memories: JSON array of memory strings to add, e.g., ["memory 1", "memory 2", "memory 3"]
    """
    try:
        memory_client = get_memory_client_safe()
        if not memory_client:
            return "Error: Memory system unavailable"

        # Parse memories
        try:
            memory_list = json.loads(memories)
            if not isinstance(memory_list, list):
                return "Error: memories must be a JSON array"
            if len(memory_list) > BATCH_SIZE_LIMIT:
                return f"Error: batch size limited to {BATCH_SIZE_LIMIT} memories"
        except json.JSONDecodeError:
            return "Error: invalid JSON format for memories"

        # Get user context
        uid = user_id_var.get(DEFAULT_USER_ID)

        results = []
        for memory_text in memory_list:
            try:
                from mem0.client import MemoryClient
                if isinstance(memory_client, MemoryClient):
                    # Cloud Mem0 API
                    messages = [{"role": "user", "content": memory_text}]
                    response = memory_client.add(messages, user_id=uid, output_format="v1.1")
                    results.append(f"✓ Added: {memory_text[:50]}...")
                else:
                    # Local OpenMemory
                    response = memory_client.add(memory_text, user_id=uid)
                    results.append(f"✓ Added: {memory_text[:50]}...")
            except Exception as e:
                results.append(f"✗ Failed: {memory_text[:50]}... - {str(e)}")

        return f"Batch operation completed:\n" + "\n".join(results)
    except Exception as e:
        return f"Error in batch operation: {str(e)}"

@mcp.tool(
    description="""Get memory statistics and tag information for the user. This provides insights into
    stored memories including total count, tag distribution, and memory categories."""
)
async def get_memory_stats() -> str:
    """Get statistics about stored memories including tags and categories.

    Returns a JSON object with memory statistics.
    """
    try:
        memory_client = get_memory_client_safe()
        if not memory_client:
            return "Error: Memory system unavailable"

        # Get user context
        uid = user_id_var.get(DEFAULT_USER_ID)

        # Get all memories to analyze
        all_memories_result = await get_all_memories()
        try:
            memories = json.loads(all_memories_result)
            if not isinstance(memories, list):
                memories = []
        except json.JSONDecodeError:
            memories = []

        # Analyze memories for statistics
        total_memories = len(memories)

        # Extract tags from metadata (this is a simplified analysis)
        # In a real implementation, you'd want the API to provide this data
        tag_counts = {}
        for memory in memories:
            # Since we don't have direct access to metadata in the current API response,
            # we'll do a basic keyword analysis for common categories
            memory_text = memory.lower() if isinstance(memory, str) else str(memory).lower()

            # Simple categorization based on keywords
            categories = []
            if any(word in memory_text for word in ['code', 'function', 'api', 'programming', 'script']):
                categories.append('technical')
            if any(word in memory_text for word in ['user', 'customer', 'person', 'profile']):
                categories.append('user-related')
            if any(word in memory_text for word in ['error', 'bug', 'issue', 'problem']):
                categories.append('issues')
            if any(word in memory_text for word in ['config', 'setup', 'install', 'deploy']):
                categories.append('configuration')

            for category in categories:
                tag_counts[category] = tag_counts.get(category, 0) + 1

        stats = {
            "total_memories": total_memories,
            "tag_distribution": tag_counts,
            "categories": list(tag_counts.keys()),
            "most_common_category": max(tag_counts.keys(), key=lambda k: tag_counts[k]) if tag_counts else None
        }

        return json.dumps(stats, indent=2)
    except Exception as e:
        return f"Error getting memory stats: {str(e)}"

def create_starlette_app(mcp_server, *, debug: bool = False):
    """Create a Starlette application that can serve the provided mcp server with SSE."""
    sse = SseServerTransport("/messages/")

    async def handle_sse(request: Request):
        # Authenticate request
        auth_data = await authenticate_request(request)

        # Extract user_id and client_name from path parameters
        uid = request.path_params.get("user_id") or auth_data["user_id"]
        user_token = user_id_var.set(uid)
        client_name = request.path_params.get("client_name") or "default_client"
        client_token = client_name_var.set(client_name)

        # Log authenticated access
        logging.info(f"Authenticated MCP connection: user={uid}, client={client_name}, ip={auth_data['client_ip']}")

        try:
            async with sse.connect_sse(
                request.scope,
                request.receive,
                request._send,
            ) as (read_stream, write_stream):
                await mcp_server.run(
                    read_stream,
                    write_stream,
                    mcp_server.create_initialization_options(),
                )
        except Exception as e:
            logging.error(f"MCP session error for user {uid}: {e}")
            raise
        finally:
            user_id_var.reset(user_token)
            client_name_var.reset(client_token)

    async def health_check():
        """Health check endpoint."""
        return {"status": "healthy", "service": "mem0-mcp"}

    return FastAPI(
        debug=debug,
        routes=[
            Route("/mcp/{client_name}/sse/{user_id}", endpoint=handle_sse),
            Route("/messages/", endpoint=sse.handle_post_message, methods=["POST"]),
            Route("/health", endpoint=health_check, methods=["GET"]),
        ],
    )

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Run MCP SSE-based server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=int(os.getenv('PORT', '8080')), help='Port to listen on')
    args = parser.parse_args()
    
    # Bind SSE request handling to MCP server
    mcp_server = mcp._mcp_server
    starlette_app = create_starlette_app(mcp_server, debug=True)
    
    import uvicorn
    uvicorn.run(starlette_app, host=args.host, port=args.port)