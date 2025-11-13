# JXScout Hooks - APIKEY Checker

This script checks for the presence of "APIKEY" in assets saved by JXScout and sends a Discord webhook notification if found.

### Integration with JXScout hooks.jsonc

Add this to your `~/.jxscout/hooks.jsonc`:

```jsonc
{
  "global": {
    "asset_saved": {
      "cmd": "DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN' bun run /path/to/jxscouthooks/examples/custom-secrets-discord-webhook/index.ts"
    }
  }
}
```

## How it works

1. Reads the hook event JSON from stdin
2. Extracts the `file_path` and `url` from the asset
3. Reads the file and checks if it contains the string "APIKEY"
4. If found, sends a Discord webhook with the message: `"APIKEY" found in {url}`
5. The webhook URL is configured via the `DISCORD_WEBHOOK_URL` environment variable
