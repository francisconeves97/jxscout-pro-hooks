# JXScout Hooks - Interesting Comments Extractor

This script extracts developer comments from JavaScript assets that contain security-relevant or actionable keywords. Developer notes often reveal security assumptions, technical debt, hardcoded credentials, and debugging artifacts.

### Integration with JXScout hooks.jsonc

Add this to your `~/.jxscout/hooks.jsonc`:

```jsonc
{
  "global": {
    "asset_saved": {
      "cmd": "DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN' bun run /path/to/jxscouthooks/examples/interesting-comments-extractor/index.ts"
    }
  }
}
```

## What it detects

### HIGH PRIORITY:
- **SECURITY**: Security notes, vulnerabilities, CVEs
- **CREDENTIALS**: Password, secret, API key, token references

### MEDIUM PRIORITY:
- **BUG**: XXX, FIXME, bug markers
- **HACK**: Workarounds, temporary solutions
- **DEBUG**: Debug and test code markers

### LOW PRIORITY:
- **TODO**: Planned work
- **NOTE**: Important notes, warnings
- **DEPRECATED**: Legacy code markers
- **CLEANUP**: Code marked for removal

## How it works

1. Reads the hook event JSON from stdin
2. Skips HTML files (focuses on JavaScript)
3. Extracts single-line (`//`) and multi-line (`/* */`) comments
4. Matches comments against keyword patterns
5. Categorizes by severity (high/medium/low)
6. Sends Discord webhook with organized results

## Example Output

```
Interesting developer comments found in https://example.com/app.js

Total: 8 comment(s)

**HIGH PRIORITY (2):**
Line 45 [SECURITY]: SECURITY: This endpoint has no CSRF protection, needs token validation
Line 127 [CREDENTIALS]: TODO: Remove hardcoded API_KEY before production deploy

**MEDIUM PRIORITY (3):**
Line 23 [HACK]: HACK: Temporary workaround for IE11 compatibility
Line 89 [BUG]: FIXME: Race condition when user clicks multiple times
Line 156 [DEBUG]: DEBUG: Remove this console.log before release

**LOW PRIORITY (3):**
Line 12 [TODO]: TODO: Add input validation
Line 78 [NOTE]: NOTE: This function assumes user is authenticated
Line 201 [DEPRECATED]: DEPRECATED: Use new auth system instead
```

## Actionable Intelligence

Findings from this hook can be used to:
- Identify hardcoded credentials or references to them
- Find security notes revealing protection gaps
- Discover debug/test code left in production
- Locate temporary workarounds that might be exploitable
- Understand developer assumptions about security
- Find planned features that might be partially implemented
- Identify deprecated code paths that may lack security updates

## Comment Type Detection

The script detects:
- Single-line comments: `// comment`
- Multi-line comments: `/* comment */`
- Inline multi-line: `/* comment */ code`
- Multi-line spanning:
  ```javascript
  /*
   * Long comment
   * across lines
   */
  ```
