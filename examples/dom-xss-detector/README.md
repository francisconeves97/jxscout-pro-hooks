# JXScout Hooks - DOM XSS Pattern Detector

This script analyzes JavaScript assets for potential DOM-based XSS vulnerabilities by identifying dangerous sinks and untrusted sources. When both are present in the same file, it highlights potential attack vectors.

### Integration with JXScout hooks.jsonc

Add this to your `~/.jxscout/hooks.jsonc`:

```jsonc
{
  "global": {
    "asset_saved": {
      "cmd": "DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN' bun run /path/to/jxscouthooks/examples/dom-xss-detector/index.ts"
    }
  }
}
```

## What it detects

### Dangerous Sinks (HIGH SEVERITY):
- `innerHTML` / `outerHTML` assignments
- `document.write()` / `document.writeln()`
- `eval()`
- `setTimeout()` / `setInterval()` with string arguments
- `insertAdjacentHTML()`
- `new Function()`
- `executeScript()` / `setHTMLUnsafe()`

### Dangerous Sinks (MEDIUM SEVERITY):
- jQuery `.html()` / `.append()`

### Untrusted Sources:
- `location.hash` / `location.search` / `location.href`
- `document.URL` / `document.referrer`
- `window.name`
- `document.cookie`
- `localStorage.getItem()` / `sessionStorage.getItem()`

## How it works

1. Reads the hook event JSON from stdin
2. Skips HTML files (focuses on JavaScript)
3. Scans each line for dangerous sink patterns
4. Scans each line for untrusted source patterns
5. Reports findings with line numbers and code snippets
6. Highlights when both sinks and sources exist (potential XSS vector)

## Example Output

```
POTENTIAL DOM XSS VECTORS in https://example.com/app.js

Found 3 dangerous sink(s) and 2 untrusted source(s)

**Dangerous Sinks:**

HIGH SEVERITY (2):
Line 42: innerHTML
  element.innerHTML = userInput;
Line 78: eval()
  eval(command);

MEDIUM SEVERITY (1):
Line 103: jQuery .html()
  $('#output').html(data);

**Untrusted Sources:**
Line 15: location.hash
  const param = location.hash.substring(1);
Line 89: localStorage.getItem()
  const stored = localStorage.getItem('userdata');

**Recommendation:**
Review if any untrusted source flows into dangerous sinks without proper sanitization.
```

## Actionable Intelligence

Findings from this hook can be used to:
- Manually trace data flow from sources to sinks
- Test for DOM XSS by manipulating URL parameters, hash, or storage
- Identify code that needs sanitization or Content Security Policy
- Prioritize code review for security issues
- Build proof-of-concept exploits for bug bounty submissions

## Important Note

This is a pattern-based static analysis tool. It identifies potential vectors but does not guarantee exploitability. Manual review is required to:
1. Trace if untrusted data actually flows to the sink
2. Verify if sanitization is applied
3. Develop working exploits
