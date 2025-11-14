# jxscout pro hooks

This repo defines some examples on how to use hooks with [jxscout pro](https://jxscout.app).

Hooks is a jxscout pro feature that allows you to listen to jxscout events and run your own code/scripts on the assets found by jxscout.

## Testing all examples

There's an example hooks.jsonc file that you can use to test all the examples in this repo. To do that, replace your `~/.jxscout/hooks.jsonc` hooks file with this one and update the discord webhook and the path to this repo on your system. Then run your command to enable jxscout pro, IE: `jxscout-pro -project-name my-project-name -custom-hooks-enabled`.

Current examples:

### Basic Detection
- **custom-secrets-discord-webhook**: Checks for the presence of "APIKEY" in assets saved by JXScout and sends a Discord webhook notification if found
- **sensitive-paths-discord-webhook**: Extracts paths from assets using jxscout-pro CLI and sends a Discord webhook notification if any path contains the word "admin"
- **trufflehog-discord-webhook**: Uses TruffleHog to scan assets for secrets and sends a Discord webhook notification for each secret found

### Other Detections
- **subdomain-domain-extractor**: Discovers domains, subdomains, S3 buckets, and internal domains referenced in JavaScript assets to expand attack surface
- **jwt-analyzer**: Finds and decodes JWT tokens, analyzes security issues like weak algorithms, missing expiration, and sensitive data exposure
- **dom-xss-detector**: Identifies potential DOM-based XSS vulnerabilities by detecting dangerous sinks (innerHTML, eval, etc.) and untrusted sources (location.hash, etc.)
- **css-injection-detector**: Detects CSS injection vectors through dynamic style manipulation that can lead to data exfiltration, keylogging, and SSRF
- **interesting-comments-extractor**: Extracts developer comments containing security-relevant keywords (SECURITY, BUG, FIXME, TODO, HACK) that may reveal vulnerabilities or technical debt
