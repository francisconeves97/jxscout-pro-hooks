import * as fs from "fs";
import { HookEvent } from "../../src/types";
import { readStdin, sendDiscordWebhook } from "../../src/utils";

interface DomainFindings {
  domains: Set<string>;
  s3Buckets: Set<string>;
  subdomains: Set<string>;
  internalDomains: Set<string>;
}

function extractDomains(content: string): DomainFindings {
  const findings: DomainFindings = {
    domains: new Set(),
    s3Buckets: new Set(),
    subdomains: new Set(),
    internalDomains: new Set(),
  };

  const urlPattern = /https?:\/\/([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:[0-9]+)?/gi;
  const s3Pattern = /([a-zA-Z0-9.-]+)\.s3([.-][a-zA-Z0-9-]+)?\.amazonaws\.com/gi;
  const domainPattern = /(?:["'`]|(?:https?:)?\/\/)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:["'`]|\/|:|\s|$)/gi;

  const urlMatches = content.matchAll(urlPattern);
  for (const match of urlMatches) {
    try {
      const url = new URL(match[0]);
      const hostname = url.hostname.toLowerCase();
      findings.domains.add(hostname);

      if (hostname.includes(".local") || hostname.includes(".internal")) {
        findings.internalDomains.add(hostname);
      }

      const parts = hostname.split(".");
      if (parts.length > 2) {
        findings.subdomains.add(hostname);
      }
    } catch (error) {
      continue;
    }
  }

  const s3Matches = content.matchAll(s3Pattern);
  for (const match of s3Matches) {
    findings.s3Buckets.add(match[0].toLowerCase());
  }

  const domainMatches = content.matchAll(domainPattern);
  for (const match of domainMatches) {
    const domain = match[1].toLowerCase().replace(/["'`]/g, "");
    if (domain && !domain.startsWith(".")) {
      findings.domains.add(domain);

      if (domain.includes(".local") || domain.includes(".internal")) {
        findings.internalDomains.add(domain);
      }

      const parts = domain.split(".");
      if (parts.length > 2) {
        findings.subdomains.add(domain);
      }
    }
  }

  return findings;
}

function formatFindings(findings: DomainFindings, url: string): string | null {
  const parts: string[] = [`Domains and subdomains discovered in ${url}\n`];
  let hasFindings = false;

  if (findings.s3Buckets.size > 0) {
    hasFindings = true;
    parts.push(`\n**S3 Buckets (${findings.s3Buckets.size}):**`);
    const buckets = Array.from(findings.s3Buckets).slice(0, 20);
    parts.push(buckets.map((b) => `- ${b}`).join("\n"));
    if (findings.s3Buckets.size > 20) {
      parts.push(`... and ${findings.s3Buckets.size - 20} more`);
    }
  }

  if (findings.internalDomains.size > 0) {
    hasFindings = true;
    parts.push(`\n**Internal Domains (${findings.internalDomains.size}):**`);
    const internal = Array.from(findings.internalDomains).slice(0, 20);
    parts.push(internal.map((d) => `- ${d}`).join("\n"));
    if (findings.internalDomains.size > 20) {
      parts.push(`... and ${findings.internalDomains.size - 20} more`);
    }
  }

  if (findings.subdomains.size > 0) {
    hasFindings = true;
    parts.push(`\n**Subdomains (${findings.subdomains.size}):**`);
    const subs = Array.from(findings.subdomains).slice(0, 20);
    parts.push(subs.map((s) => `- ${s}`).join("\n"));
    if (findings.subdomains.size > 20) {
      parts.push(`... and ${findings.subdomains.size - 20} more`);
    }
  }

  if (findings.domains.size > 0 && findings.domains.size > findings.subdomains.size) {
    hasFindings = true;
    const rootDomains = Array.from(findings.domains).filter(
      (d) => d.split(".").length === 2
    );
    if (rootDomains.length > 0) {
      parts.push(`\n**Root Domains (${rootDomains.length}):**`);
      const roots = rootDomains.slice(0, 20);
      parts.push(roots.map((r) => `- ${r}`).join("\n"));
      if (rootDomains.length > 20) {
        parts.push(`... and ${rootDomains.length - 20} more`);
      }
    }
  }

  return hasFindings ? parts.join("\n") : null;
}

async function main() {
  try {
    const stdinData = await readStdin();
    const event: HookEvent = JSON.parse(stdinData);

    if (!event.asset || !event.asset.file_path || !event.asset.url) {
      console.error("Invalid event data: missing asset.file_path or asset.url");
      process.exit(1);
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("DISCORD_WEBHOOK_URL environment variable is not set");
      process.exit(1);
    }

    const content = fs.readFileSync(event.asset.file_path, "utf8");
    const findings = extractDomains(content);
    const message = formatFindings(findings, event.asset.url);

    if (message) {
      await sendDiscordWebhook(webhookUrl, message);
      console.log(
        `Discovered ${findings.domains.size} unique domains, ${findings.s3Buckets.size} S3 buckets`
      );
    }
  } catch (error) {
    console.error("Error processing hook:", error);
    process.exit(1);
  }
}

main();
