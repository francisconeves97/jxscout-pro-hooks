import * as fs from "fs";
import { HookEvent } from "../../src/types";
import { readStdin, sendDiscordWebhook } from "../../src/utils";

interface Finding {
  line: number;
  code: string;
  pattern: string;
  severity: "high" | "medium";
}

const cssSinks = [
  { pattern: /\.style\.cssText\s*=/gi, name: "style.cssText assignment", severity: "high" as const },
  { pattern: /\.setAttribute\s*\(\s*['"`]style['"`]/gi, name: "setAttribute('style')", severity: "high" as const },
  { pattern: /<style[^>]*>.*\$\{/gi, name: "Template literal in <style> tag", severity: "high" as const },
  { pattern: /styleElement\.(innerHTML|textContent)\s*=/gi, name: "Style element content assignment", severity: "high" as const },
  { pattern: /\.insertRule\s*\(/gi, name: "CSSStyleSheet.insertRule()", severity: "medium" as const },
  { pattern: /document\.createTextNode.*style/gi, name: "Dynamic style text node", severity: "medium" as const },
  { pattern: /styled\.[a-z]+`[\s\S]*?\$\{/gi, name: "styled-components with interpolation", severity: "medium" as const },
];

function analyzeFile(content: string): Finding[] {
  const lines = content.split("\n");
  const findings: Finding[] = [];

  lines.forEach((line, index) => {
    for (const sink of cssSinks) {
      const matches = line.matchAll(sink.pattern);
      for (const match of matches) {
        findings.push({
          line: index + 1,
          code: line.trim(),
          pattern: sink.name,
          severity: sink.severity,
        });
      }
    }
  });

  return findings;
}

function formatFindings(findings: Finding[], url: string): string | null {
  if (findings.length === 0) {
    return null;
  }

  const parts: string[] = [`Potential CSS injection vectors in ${url}`];
  parts.push(`\nFound ${findings.length} dynamic CSS manipulation(s)\n`);

  const high = findings.filter((f) => f.severity === "high");
  const medium = findings.filter((f) => f.severity === "medium");

  if (high.length > 0) {
    parts.push(`**HIGH SEVERITY (${high.length}):**`);
    high.slice(0, 10).forEach((finding) => {
      parts.push(`Line ${finding.line}: ${finding.pattern}`);
      parts.push(`  ${finding.code}`);
    });
    if (high.length > 10) {
      parts.push(`  ... and ${high.length - 10} more high severity findings`);
    }
    parts.push("");
  }

  if (medium.length > 0) {
    parts.push(`**MEDIUM SEVERITY (${medium.length}):**`);
    medium.slice(0, 10).forEach((finding) => {
      parts.push(`Line ${finding.line}: ${finding.pattern}`);
      parts.push(`  ${finding.code}`);
    });
    if (medium.length > 10) {
      parts.push(`  ... and ${medium.length - 10} more medium severity findings`);
    }
  }

  parts.push(`\n**Note:** CSS injection can lead to data exfiltration, keylogging, and SSRF. Review if user input flows into these sinks.`);

  return parts.join("\n");
}

async function main() {
  try {
    const stdinData = await readStdin();
    const event: HookEvent = JSON.parse(stdinData);

    if (!event.asset || !event.asset.file_path || !event.asset.url) {
      console.error("Invalid event data: missing asset.file_path or asset.url");
      process.exit(1);
    }

    if (event.asset.content_type === "HTML") {
      return;
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("DISCORD_WEBHOOK_URL environment variable is not set");
      process.exit(1);
    }

    const content = fs.readFileSync(event.asset.file_path, "utf8");
    const findings = analyzeFile(content);

    const message = formatFindings(findings, event.asset.url);
    if (message) {
      await sendDiscordWebhook(webhookUrl, message);
      console.log(`Found ${findings.length} CSS injection vector(s)`);
    }
  } catch (error) {
    console.error("Error processing hook:", error);
    process.exit(1);
  }
}

main();
