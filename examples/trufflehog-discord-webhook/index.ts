import { execFile } from "child_process";
import { promisify } from "util";
import { HookEvent } from "../../src/types";
import { readStdin, sendDiscordWebhook } from "../../src/utils";

const execFileAsync = promisify(execFile);

interface TruffleHogFinding {
  detectorType: string;
  decoderType: string;
  rawResult: string;
  file: string;
  line: string;
}

function parseTruffleHogOutput(output: string): TruffleHogFinding[] {
  const findings: TruffleHogFinding[] = [];
  const lines = output.split("\n");

  let i = 0;
  while (i < lines.length) {
    if (lines[i].includes("Found unverified result")) {
      const finding: Partial<TruffleHogFinding> = {};

      i++;
      while (
        i < lines.length &&
        !lines[i].includes("Found unverified result")
      ) {
        const line = lines[i].trim();
        if (line.startsWith("Detector Type:")) {
          finding.detectorType = line.replace("Detector Type:", "").trim();
        } else if (line.startsWith("Decoder Type:")) {
          finding.decoderType = line.replace("Decoder Type:", "").trim();
        } else if (line.startsWith("Raw result:")) {
          finding.rawResult = line.replace("Raw result:", "").trim();
        } else if (line.startsWith("File:")) {
          finding.file = line.replace("File:", "").trim();
        } else if (line.startsWith("Line:")) {
          finding.line = line.replace("Line:", "").trim();
        }
        i++;
      }

      if (
        finding.detectorType &&
        finding.decoderType &&
        finding.rawResult &&
        finding.file &&
        finding.line
      ) {
        findings.push(finding as TruffleHogFinding);
      }

      continue;
    }
    i++;
  }

  return findings;
}

function formatFindingMessage(finding: TruffleHogFinding, url: string): string {
  return `🔑 Secret found in ${url}

**Detector Type:** ${finding.detectorType}
**Decoder Type:** ${finding.decoderType}
**Raw Result:** ${finding.rawResult}
**File:** ${finding.file}
**Line:** ${finding.line}`;
}

async function runTruffleHog(filePath: string): Promise<TruffleHogFinding[]> {
  try {
    const { stdout } = await execFileAsync("trufflehog", [
      "filesystem",
      filePath,
      "--no-verification",
      "--log-level=-1",
    ]);

    return parseTruffleHogOutput(stdout);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.error("trufflehog command not found. Please install trufflehog.");
      return [];
    }
    if (error.stdout) {
      return parseTruffleHogOutput(error.stdout);
    }
    console.error(`Error running trufflehog:`, error);
    return [];
  }
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

    const findings = await runTruffleHog(event.asset.file_path);

    for (const finding of findings) {
      const message = formatFindingMessage(finding, event.asset.url);
      await sendDiscordWebhook(webhookUrl, message);
      console.log(`Discord webhook sent for finding: ${finding.detectorType}`);
    }
  } catch (error) {
    console.error("Error processing hook:", error);
    process.exit(1);
  }
}

main();
