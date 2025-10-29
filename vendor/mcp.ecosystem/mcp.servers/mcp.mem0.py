#!/bin/bash
# Top-level access script for Mem0 server (Python)
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python "$DIR/categories/llm/mem0/mem0_server.py" "$@"
