# JXScout Hooks - JWT Decoder & Analyzer

This script finds JWT tokens in JavaScript assets, decodes them, and performs security analysis to identify potential vulnerabilities. Goes beyond simple secret detection by analyzing token structure and security properties.

### Integration with JXScout hooks.jsonc

Add this to your `~/.jxscout/hooks.jsonc`:

```jsonc
{
  "global": {
    "asset_saved": {
      "cmd": "DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN' bun run /path/to/jxscouthooks/examples/jwt-analyzer/index.ts"
    }
  }
}
```

## What it detects

1. **Algorithm Issues**:
   - `alg: none` - No signature verification (critical vulnerability)
   - Weak symmetric algorithms (HS256, HS384, HS512)

2. **Sensitive Data in Payload**:
   - Email addresses, user IDs
   - Role and permission claims
   - API keys or secrets embedded in tokens
   - Admin flags

3. **Token Validity Issues**:
   - Expired tokens
   - No expiration claim
   - Extremely long expiration periods (>365 days)

4. **Debug/Test Tokens**:
   - Tokens with debug or test flags enabled

## How it works

1. Reads the hook event JSON from stdin
2. Searches for JWT patterns (base64url encoded header.payload.signature)
3. Decodes header and payload using base64url decoding
4. Analyzes token for security issues and sensitive data
5. Sends detailed Discord webhook for each token found (max 5 per file)

## Example Output

```
JWT Token found in https://example.com/app.js

**Token Preview:** eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIx...

**Header:**
```json
{
  "alg": "none",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "sub": "1234567890",
  "email": "admin@example.com",
  "role": "admin",
  "isAdmin": true,
  "exp": 1735689600
}
```

**Security Issues (3):**
- CRITICAL: Algorithm is 'none' - no signature verification
- Token has no expiration (exp) claim
- Token has debug/test flags enabled

**Sensitive Fields (4):**
- email: "admin@example.com"
- role: "admin"
- isAdmin: true
- userId: "1234567890"
```

## Actionable Intelligence

Findings from this hook can be used to:
- Test for JWT algorithm confusion attacks
- Identify hardcoded test/debug tokens for authentication bypass
- Discover user roles and permissions structure
- Find tokens without proper expiration
- Identify sensitive data leakage in client-side code
