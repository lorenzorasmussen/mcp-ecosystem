#!/bin/bash

# Script to set up bws with environment variables from .env file
# This requires a Bitwarden account and bws to be configured first

export PATH="/Users/lorenzorasmussen/.local/bin:$PATH"

echo "Setting up bws secrets from .config/opencode/.env"

# Check if bws is configured
if ! bws project list >/dev/null 2>&1; then
    echo "Error: bws is not configured. Please run 'bws config' first."
    echo "You'll need:"
    echo "1. A Bitwarden account"
    echo "2. A service account with access token"
    echo "3. Run 'bws config' to set up the CLI"
    exit 1
fi

# Read the .env file and create secrets
ENV_FILE="/Users/lorenzorasmussen/.config/opencode/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE"
    exit 1
fi

echo "Creating secrets in bws..."

while IFS='=' read -r key value; do
    # Skip empty lines and comments
    [[ -z "$key" || "$key" == \#* ]] && continue
    
    echo "Creating secret for $key..."
    bws secret create --key "$key" --value "$value" --project-id "$(bws project list -o table | head -n 2 | tail -n 1 | awk '{print $1}')"
done < "$ENV_FILE"

echo "Secrets created successfully!"
echo "You can now run: bws run -- opencode [args]"