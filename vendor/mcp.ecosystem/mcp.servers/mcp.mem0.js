#!/bin/bash
# Top-level access script for Mem0 server (JavaScript)
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$DIR/categories/llm/mem0/mem0_server.js" "$@"
