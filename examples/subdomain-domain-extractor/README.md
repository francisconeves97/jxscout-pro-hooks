# JXScout Hooks - Subdomain & Domain Extractor

This script extracts domains, subdomains, S3 buckets, and internal domains from JavaScript assets discovered by JXScout. This is valuable for bug bounty hunters and pentesters to expand attack surface and discover hidden infrastructure.

### Integration with JXScout hooks.jsonc

Add this to your `~/.jxscout/hooks.jsonc`:

```jsonc
{
  "global": {
    "asset_saved": {
      "cmd": "DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN' bun run /path/to/jxscouthooks/examples/subdomain-domain-extractor/index.ts"
    }
  }
}
```

## What it detects

1. **S3 Buckets**: AWS S3 bucket URLs that may be misconfigured or publicly accessible
2. **Internal Domains**: Domains containing `.local` or `.internal` that reveal internal infrastructure
3. **Subdomains**: All subdomains including staging, dev, api, admin endpoints
4. **Root Domains**: Top-level domains referenced in the JavaScript

## How it works

1. Reads the hook event JSON from stdin
2. Extracts the file path from the asset
3. Searches for domain patterns including:
   - Full URLs (http/https)
   - Domain references in strings
   - S3 bucket patterns
   - Internal domain patterns
4. Deduplicates findings and categorizes them
5. Sends a Discord webhook with organized results (limited to 20 per category)

## Example Output

```
Domains and subdomains discovered in https://example.com/app.js

**S3 Buckets (2):**
- user-uploads.s3.amazonaws.com
- staging-assets.s3.us-west-2.amazonaws.com

**Internal Domains (1):**
- api.internal.example.com

**Subdomains (5):**
- api-staging.example.com
- dev.example.com
- admin.example.com
- api.example.com
- cdn.example.com

**Root Domains (3):**
- example.com
- thirdparty.com
- analytics-provider.com
```

## Actionable Intelligence

Findings from this hook can be used to:
- Test S3 buckets for public access and misconfigurations
- Probe subdomains for subdomain takeovers
- Discover staging/dev environments with weaker security
- Find API endpoints and internal services
- Identify third-party integrations
