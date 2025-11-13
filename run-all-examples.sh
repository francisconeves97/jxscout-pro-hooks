#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
stdin=$(cat)

event_type=$(echo "$stdin" | jq -r '.type')

if [ "$event_type" = "asset_saved" ]; then
  echo "$stdin" | bun run "$SCRIPT_DIR/examples/custom-secrets-discord-webhook/index.ts"
  echo "$stdin" | bun run "$SCRIPT_DIR/examples/trufflehog-discord-webhook/index.ts"
elif [ "$event_type" = "asset_analyzed" ]; then
  echo "$stdin" | bun run "$SCRIPT_DIR/examples/sensitive-paths-discord-webhook/index.ts"
fi
