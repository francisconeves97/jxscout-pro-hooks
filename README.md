# jxscout pro hooks

This repo defines some examples on how to use hooks with [jxscout pro](https://jxscout.app).

Hooks is a jxscout pro feature that allows you to listen to jxscout events and run your own code/scripts on the assets found by jxscout.

## Testing all examples

There's an example hooks.jsonc file that you can use to test all the examples in this repo. To do that, replace your `~/.jxscout/hooks.jsonc` hooks file with this one and update the discord webhook and the path to this repo on your system

Current examples:

- **custom-secrets-discord-webhook**: Checks for the presence of "APIKEY" in assets saved by JXScout and sends a Discord webhook notification if found
- **sensitive-paths-discord-webhook**: Extracts paths from assets using jxscout-pro CLI and sends a Discord webhook notification if any path contains the word "admin"
- **trufflehog-discord-webhook**: Uses TruffleHog to scan assets for secrets and sends a Discord webhook notification for each secret found

These are just proof of concept examples that you can use to build your own hooks.
