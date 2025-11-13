# JXScout Hooks - Sensitive Paths Checker

This script uses `jxscout-pro` CLI to extract paths from assets saved by JXScout and sends a Discord webhook notification if any path contains the word "admin".

### Integration with JXScout hooks.jsonc

Add this to your `~/.jxscout/hooks.jsonc`:

```jsonc
{
  "global": {
    "asset_saved": {
      "cmd": "DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN' bun run /path/to/jxscouthooks/examples/sensitive-paths-discord-webhook/index.ts"
    }
  }
}
```

## How it works

1. Reads the hook event JSON from stdin
2. Extracts the `file_path` from the asset
3. Runs `jxscout-pro -c descriptors --descriptor-types paths --file-paths <file_path>` to extract paths
4. Checks if any path contains the word "admin" (case-insensitive)
5. If found, sends a Discord webhook with the message listing all matching paths
6. The webhook URL is configured via the `DISCORD_WEBHOOK_URL` environment variable

## Example

If the extracted paths are:

```
/api/v1/admin/users
/api/v1/users
```

The script will detect `/api/v1/admin/users` and send a Discord notification.
