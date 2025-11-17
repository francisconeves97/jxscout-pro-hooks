import * as fs from "fs";
import { HookEvent } from "../../src/types";
import { readStdin, sendDiscordWebhook } from "../../src/utils";

interface JWTAnalysis {
  token: string;
  header: any;
  payload: any;
  issues: string[];
  sensitiveFields: string[];
}

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(base64 + padding, "base64").toString("utf8");
}

function analyzeJWT(token: string): JWTAnalysis | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const header = JSON.parse(decodeBase64Url(parts[0]));
    const payload = JSON.parse(decodeBase64Url(parts[1]));

    const issues: string[] = [];
    const sensitiveFields: string[] = [];

    if (header.alg === "none" || header.alg === "None" || header.alg === "NONE") {
      issues.push("CRITICAL: Algorithm is 'none' - no signature verification");
    }

    const weakAlgorithms = ["HS256", "HS384", "HS512"];
    if (weakAlgorithms.includes(header.alg)) {
      issues.push(`Weak algorithm: ${header.alg} (symmetric key)`);
    }

    const sensitiveKeys = [
      "email",
      "password",
      "pwd",
      "secret",
      "api_key",
      "apikey",
      "token",
      "access_token",
      "refresh_token",
      "private_key",
      "ssn",
      "credit_card",
      "role",
      "roles",
      "permissions",
      "admin",
      "isAdmin",
      "is_admin",
      "superuser",
      "userId",
      "user_id",
      "id",
    ];

    for (const key of Object.keys(payload)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
        sensitiveFields.push(`${key}: ${JSON.stringify(payload[key])}`);
      }
    }

    if (payload.debug === true || payload.test === true) {
      issues.push("Token has debug/test flags enabled");
    }

    if (payload.exp) {
      const expDate = new Date(payload.exp * 1000);
      const now = new Date();
      if (expDate < now) {
        issues.push(`Token expired on ${expDate.toISOString()}`);
      } else {
        const daysUntilExpiry = Math.floor(
          (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry > 365) {
          issues.push(`Token has very long expiry: ${daysUntilExpiry} days`);
        }
      }
    } else {
      issues.push("Token has no expiration (exp) claim");
    }

    return {
      token: token.substring(0, 50) + "...",
      header,
      payload,
      issues,
      sensitiveFields,
    };
  } catch (error) {
    return null;
  }
}

function findJWTs(content: string): string[] {
  const jwtPattern = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g;
  const matches = content.match(jwtPattern);
  return matches ? Array.from(new Set(matches)) : [];
}

function formatAnalysis(analysis: JWTAnalysis, url: string): string {
  const parts: string[] = [`JWT Token found in ${url}\n`];

  parts.push(`**Token Preview:** ${analysis.token}`);
  parts.push(`\n**Header:**`);
  parts.push("```json");
  parts.push(JSON.stringify(analysis.header, null, 2));
  parts.push("```");

  parts.push(`\n**Payload:**`);
  parts.push("```json");
  parts.push(JSON.stringify(analysis.payload, null, 2));
  parts.push("```");

  if (analysis.issues.length > 0) {
    parts.push(`\n**Security Issues (${analysis.issues.length}):**`);
    analysis.issues.forEach((issue) => {
      parts.push(`- ${issue}`);
    });
  }

  if (analysis.sensitiveFields.length > 0) {
    parts.push(`\n**Sensitive Fields (${analysis.sensitiveFields.length}):**`);
    analysis.sensitiveFields.forEach((field) => {
      parts.push(`- ${field}`);
    });
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

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("DISCORD_WEBHOOK_URL environment variable is not set");
      process.exit(1);
    }

    const content = fs.readFileSync(event.asset.file_path, "utf8");
    const jwts = findJWTs(content);

    if (jwts.length === 0) {
      return;
    }

    console.log(`Found ${jwts.length} JWT token(s)`);

    for (const jwt of jwts.slice(0, 5)) {
      const analysis = analyzeJWT(jwt);
      if (analysis) {
        const message = formatAnalysis(analysis, event.asset.url);
        await sendDiscordWebhook(webhookUrl, message);
        console.log(`Analyzed JWT with ${analysis.issues.length} issue(s)`);
      }
    }

    if (jwts.length > 5) {
      console.log(`Analyzed first 5 of ${jwts.length} tokens`);
    }
  } catch (error) {
    console.error("Error processing hook:", error);
    process.exit(1);
  }
}

main();
