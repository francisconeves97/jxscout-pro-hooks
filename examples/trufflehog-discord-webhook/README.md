# JXScout Hooks - TruffleHog Secret Detection

This script uses TruffleHog to scan assets saved by JXScout for secrets and sends a Discord webhook notification for each secret found.

### Integration with JXScout hooks.jsonc

Add this to your `~/.jxscout/hooks.jsonc`:

```jsonc
{
  "global": {
    "asset_saved": {
      "cmd": "DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN' bun run /path/to/jxscouthooks/examples/trufflehog-discord-webhook/index.ts"
    }
  }
}
```

## Prerequisites

- [TruffleHog](https://github.com/trufflesecurity/trufflehog) must be installed and available in your PATH

## How it works

1. Reads the hook event JSON from stdin
2. Extracts the `file_path` from the asset
3. Runs `trufflehog filesystem <file_path> --no-verification --log-level=-1` to scan for secrets
4. Parses the output to extract findings (ignoring the initial emoji banner)
5. For each finding, sends a Discord webhook with details including:
   - Detector Type
   - Decoder Type
   - Raw Result
   - File path
   - Line number
6. The webhook URL is configured via the `DISCORD_WEBHOOK_URL` environment variable

## Example

If TruffleHog finds a secret, the output will be parsed and a Discord notification will be sent with the following format:

```
🔑 Secret found in https://example.com/file.js

**Detector Type:** Postman
**Decoder Type:** PLAIN
**Raw Result:** PMAK-qnwfsLyRSyfCwfpHaQP1UzDhrgpWvHjbYzjpRCMshjt417zWcrzyHUArs7r
**File:** /path/to/file.js
**Line:** 4
```
