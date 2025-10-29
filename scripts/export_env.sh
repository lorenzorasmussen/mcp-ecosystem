#!/bin/bash

# Export environment variables from .config/opencode/.env
# Note: Set these environment variables in your local environment or .env file
export PERPLEXITY_API_KEY=${PERPLEXITY_API_KEY:-}
export BRAVE_API_KEY=${BRAVE_API_KEY:-}
export GITHUB_PERSONAL_ACCESS_TOKEN=${GITHUB_PERSONAL_ACCESS_TOKEN:-}
export NOTION_TOKEN=${NOTION_TOKEN:-}
export NOTION_WORKSPACE_ID=${NOTION_WORKSPACE_ID:-}
export OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}
export OPENCODE_API_KEY=${OPENCODE_API_KEY:-}
export MEM0_API_KEY=${MEM0_API_KEY:-}

echo "Environment variables exported successfully"