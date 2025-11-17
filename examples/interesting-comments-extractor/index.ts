import * as fs from "fs";
import { HookEvent } from "../../src/types";
import { readStdin, sendDiscordWebhook } from "../../src/utils";

interface Comment {
  line: number;
  type: string;
  text: string;
  keyword: string;
  severity: "high" | "medium" | "low";
}

const interestingKeywords = [
  { pattern: /\b(SECURITY|SEC|VULNERABILITY|VULN|CVE)\b/i, name: "SECURITY", severity: "high" as const },
  { pattern: /\b(PASSWORD|PASSWD|PWD|SECRET|API[_-]?KEY|APIKEY|TOKEN|CREDENTIAL)\b/i, name: "CREDENTIALS", severity: "high" as const },
  { pattern: /\b(XXX|FIXME|FIX|BUG|BUGBUG)\b/i, name: "BUG", severity: "medium" as const },
  { pattern: /\b(HACK|WORKAROUND|TEMP|TEMPORARY)\b/i, name: "HACK", severity: "medium" as const },
  { pattern: /\b(TODO|TO DO|TO-DO)\b/i, name: "TODO", severity: "low" as const },
  { pattern: /\b(NOTE|IMPORTANT|WARNING|WARN|CAUTION)\b/i, name: "NOTE", severity: "low" as const },
  { pattern: /\b(DEPRECATED|OBSOLETE|LEGACY)\b/i, name: "DEPRECATED", severity: "low" as const },
  { pattern: /\b(DEBUG|DEBUGGING|TEST|TESTING)\b/i, name: "DEBUG", severity: "medium" as const },
  { pattern: /\b(REMOVE|DELETE|CLEANUP|CLEAN)\b/i, name: "CLEANUP", severity: "low" as const },
];

function extractComments(content: string): Comment[] {
  const comments: Comment[] = [];
  const lines = content.split("\n");
  let inMultilineComment = false;
  let multilineStart = 0;
  let multilineText = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    if (inMultilineComment) {
      const endMatch = line.indexOf("*/");
      if (endMatch !== -1) {
        multilineText += " " + line.substring(0, endMatch).trim();
        inMultilineComment = false;

        for (const keyword of interestingKeywords) {
          if (keyword.pattern.test(multilineText)) {
            comments.push({
              line: multilineStart,
              type: "multiline",
              text: multilineText.trim(),
              keyword: keyword.name,
              severity: keyword.severity,
            });
            break;
          }
        }
        multilineText = "";
      } else {
        multilineText += " " + line.trim();
      }
      continue;
    }

    const multilineMatch = line.indexOf("/*");
    if (multilineMatch !== -1) {
      const endMatch = line.indexOf("*/", multilineMatch + 2);
      if (endMatch !== -1) {
        const commentText = line.substring(multilineMatch + 2, endMatch).trim();
        for (const keyword of interestingKeywords) {
          if (keyword.pattern.test(commentText)) {
            comments.push({
              line: lineNumber,
              type: "inline",
              text: commentText,
              keyword: keyword.name,
              severity: keyword.severity,
            });
            break;
          }
        }
      } else {
        inMultilineComment = true;
        multilineStart = lineNumber;
        multilineText = line.substring(multilineMatch + 2).trim();
      }
      continue;
    }

    const singleLineMatch = line.indexOf("//");
    if (singleLineMatch !== -1) {
      const commentText = line.substring(singleLineMatch + 2).trim();
      for (const keyword of interestingKeywords) {
        if (keyword.pattern.test(commentText)) {
          comments.push({
            line: lineNumber,
            type: "single",
            text: commentText,
            keyword: keyword.name,
            severity: keyword.severity,
          });
          break;
        }
      }
    }
  }

  return comments;
}

function formatComments(comments: Comment[], url: string): string | null {
  if (comments.length === 0) {
    return null;
  }

  const parts: string[] = [`Interesting developer comments found in ${url}`];
  parts.push(`\nTotal: ${comments.length} comment(s)\n`);

  const high = comments.filter((c) => c.severity === "high");
  const medium = comments.filter((c) => c.severity === "medium");
  const low = comments.filter((c) => c.severity === "low");

  if (high.length > 0) {
    parts.push(`**HIGH PRIORITY (${high.length}):**`);
    high.slice(0, 10).forEach((comment) => {
      const truncated =
        comment.text.length > 150
          ? comment.text.substring(0, 150) + "..."
          : comment.text;
      parts.push(`Line ${comment.line} [${comment.keyword}]: ${truncated}`);
    });
    if (high.length > 10) {
      parts.push(`... and ${high.length - 10} more high priority comments\n`);
    } else {
      parts.push("");
    }
  }

  if (medium.length > 0) {
    parts.push(`**MEDIUM PRIORITY (${medium.length}):**`);
    medium.slice(0, 10).forEach((comment) => {
      const truncated =
        comment.text.length > 150
          ? comment.text.substring(0, 150) + "..."
          : comment.text;
      parts.push(`Line ${comment.line} [${comment.keyword}]: ${truncated}`);
    });
    if (medium.length > 10) {
      parts.push(`... and ${medium.length - 10} more medium priority comments\n`);
    } else {
      parts.push("");
    }
  }

  if (low.length > 0 && low.length <= 15) {
    parts.push(`**LOW PRIORITY (${low.length}):**`);
    low.forEach((comment) => {
      const truncated =
        comment.text.length > 150
          ? comment.text.substring(0, 150) + "..."
          : comment.text;
      parts.push(`Line ${comment.line} [${comment.keyword}]: ${truncated}`);
    });
  } else if (low.length > 15) {
    parts.push(`**LOW PRIORITY:** ${low.length} comments (not shown)`);
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
    const comments = extractComments(content);

    const message = formatComments(comments, event.asset.url);
    if (message) {
      await sendDiscordWebhook(webhookUrl, message);
      console.log(`Found ${comments.length} interesting comment(s)`);
    }
  } catch (error) {
    console.error("Error processing hook:", error);
    process.exit(1);
  }
}

main();
