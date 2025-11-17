#!/bin/bash

# Test script for jxscout hooks
# Usage: ./test-hook.sh <hook-name> <discord-webhook-url>

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ $# -lt 2 ]; then
  echo "Usage: $0 <hook-name> <discord-webhook-url>"
  echo ""
  echo "Available hooks:"
  echo "  subdomain-domain-extractor"
  echo "  jwt-analyzer"
  echo "  dom-xss-detector"
  echo "  css-injection-detector"
  echo "  interesting-comments-extractor"
  echo "  custom-secrets-discord-webhook"
  echo "  trufflehog-discord-webhook"
  echo ""
  echo "Example:"
  echo "  $0 jwt-analyzer https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN"
  exit 1
fi

HOOK_NAME=$1
WEBHOOK_URL=$2

if [ ! -d "$SCRIPT_DIR/examples/$HOOK_NAME" ]; then
  echo "Error: Hook '$HOOK_NAME' not found"
  exit 1
fi

echo "Testing hook: $HOOK_NAME"
echo "Using webhook: ${WEBHOOK_URL:0:50}..."
echo ""

export DISCORD_WEBHOOK_URL="$WEBHOOK_URL"
cat "$SCRIPT_DIR/test-data/test-event.json" | bun run "$SCRIPT_DIR/examples/$HOOK_NAME/index.ts"

echo ""
echo "Test complete. Check your Discord channel for the webhook message."
