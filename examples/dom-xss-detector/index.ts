import * as fs from "fs";
import { HookEvent } from "../../src/types";
import { readStdin, sendDiscordWebhook } from "../../src/utils";

interface Finding {
  line: number;
  code: string;
  type: "sink" | "source";
  pattern: string;
  severity: "high" | "medium";
}

const dangerousSinks = [
  { pattern: /\.innerHTML\s*=/gi, name: "innerHTML", severity: "high" as const },
  { pattern: /\.outerHTML\s*=/gi, name: "outerHTML", severity: "high" as const },
  { pattern: /document\.write\(/gi, name: "document.write()", severity: "high" as const },
  { pattern: /document\.writeln\(/gi, name: "document.writeln()", severity: "high" as const },
  { pattern: /eval\(/gi, name: "eval()", severity: "high" as const },
  { pattern: /setTimeout\s*\(\s*["'`]/gi, name: "setTimeout() with string", severity: "high" as const },
  { pattern: /setInterval\s*\(\s*["'`]/gi, name: "setInterval() with string", severity: "high" as const },
  { pattern: /\.insertAdjacentHTML\(/gi, name: "insertAdjacentHTML()", severity: "high" as const },
  { pattern: /\.executeScript\(/gi, name: "executeScript()", severity: "high" as const },
  { pattern: /\.setHTMLUnsafe\(/gi, name: "setHTMLUnsafe()", severity: "high" as const },
  { pattern: /new\s+Function\s*\(/gi, name: "new Function()", severity: "high" as const },
  { pattern: /\$\([^)]*\)\.html\(/gi, name: "jQuery .html()", severity: "medium" as const },
  { pattern: /\$\([^)]*\)\.append\(/gi, name: "jQuery .append()", severity: "medium" as const },
];

const untrustedSources = [
  { pattern: /location\.hash/gi, name: "location.hash" },
  { pattern: /location\.search/gi, name: "location.search" },
  { pattern: /location\.href/gi, name: "location.href" },
  { pattern: /location\.pathname/gi, name: "location.pathname" },
  { pattern: /document\.URL/gi, name: "document.URL" },
  { pattern: /document\.documentURI/gi, name: "document.documentURI" },
  { pattern: /document\.baseURI/gi, name: "document.baseURI" },
  { pattern: /document\.referrer/gi, name: "document.referrer" },
  { pattern: /window\.name/gi, name: "window.name" },
  { pattern: /document\.cookie/gi, name: "document.cookie" },
  { pattern: /localStorage\.getItem/gi, name: "localStorage.getItem()" },
  { pattern: /sessionStorage\.getItem/gi, name: "sessionStorage.getItem()" },
];

function analyzeFile(content: string): {
  sinks: Finding[];
  sources: Finding[];
} {
  const lines = content.split("\n");
  const sinks: Finding[] = [];
  const sources: Finding[] = [];

  lines.forEach((line, index) => {
    for (const sink of dangerousSinks) {
      const matches = line.matchAll(sink.pattern);
      for (const match of matches) {
        sinks.push({
          line: index + 1,
          code: line.trim(),
          type: "sink",
          pattern: sink.name,
          severity: sink.severity,
        });
      }
    }

    for (const source of untrustedSources) {
      const matches = line.matchAll(source.pattern);
      for (const match of matches) {
        sources.push({
          line: index + 1,
          code: line.trim(),
          type: "source",
          pattern: source.name,
          severity: "medium",
        });
      }
    }
  });

  return { sinks, sources };
}

function formatFindings(
  sinks: Finding[],
  sources: Finding[],
  url: string
): string | null {
  if (sinks.length === 0 && sources.length === 0) {
    return null;
  }

  const parts: string[] = [];

  if (sinks.length > 0 && sources.length > 0) {
    parts.push(`POTENTIAL DOM XSS VECTORS in ${url}`);
    parts.push(
      `\nFound ${sinks.length} dangerous sink(s) and ${sources.length} untrusted source(s)`
    );
  } else if (sinks.length > 0) {
    parts.push(`Dangerous sinks found in ${url}`);
    parts.push(`\nFound ${sinks.length} dangerous sink(s)`);
  } else {
    parts.push(`Untrusted sources found in ${url}`);
    parts.push(`\nFound ${sources.length} untrusted source(s)`);
  }

  if (sinks.length > 0) {
    parts.push(`\n**Dangerous Sinks:**`);
    const highSeverity = sinks.filter((s) => s.severity === "high");
    const mediumSeverity = sinks.filter((s) => s.severity === "medium");

    if (highSeverity.length > 0) {
      parts.push(`\nHIGH SEVERITY (${highSeverity.length}):`);
      highSeverity.slice(0, 10).forEach((sink) => {
        parts.push(`Line ${sink.line}: ${sink.pattern}`);
        parts.push(`  ${sink.code}`);
      });
      if (highSeverity.length > 10) {
        parts.push(`  ... and ${highSeverity.length - 10} more high severity sinks`);
      }
    }

    if (mediumSeverity.length > 0) {
      parts.push(`\nMEDIUM SEVERITY (${mediumSeverity.length}):`);
      mediumSeverity.slice(0, 5).forEach((sink) => {
        parts.push(`Line ${sink.line}: ${sink.pattern}`);
        parts.push(`  ${sink.code}`);
      });
      if (mediumSeverity.length > 5) {
        parts.push(`  ... and ${mediumSeverity.length - 5} more medium severity sinks`);
      }
    }
  }

  if (sources.length > 0) {
    parts.push(`\n**Untrusted Sources:**`);
    sources.slice(0, 10).forEach((source) => {
      parts.push(`Line ${source.line}: ${source.pattern}`);
      parts.push(`  ${source.code}`);
    });
    if (sources.length > 10) {
      parts.push(`  ... and ${sources.length - 10} more sources`);
    }
  }

  if (sinks.length > 0 && sources.length > 0) {
    parts.push(`\n**Recommendation:**`);
    parts.push(
      `Review if any untrusted source flows into dangerous sinks without proper sanitization.`
    );
  }

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
    const { sinks, sources } = analyzeFile(content);

    const message = formatFindings(sinks, sources, event.asset.url);
    if (message) {
      await sendDiscordWebhook(webhookUrl, message);
      console.log(
        `Found ${sinks.length} sink(s) and ${sources.length} source(s)`
      );
    }
  } catch (error) {
    console.error("Error processing hook:", error);
    process.exit(1);
  }
}

main();
