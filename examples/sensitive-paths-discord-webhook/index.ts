import { execFile } from "child_process";
import { promisify } from "util";
import { HookEvent } from "../../src/types";
import { readStdin, sendDiscordWebhook } from "../../src/utils";

const execFileAsync = promisify(execFile);

async function getPathsFromJxscoutPro(filePath: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("jxscout-pro", [
      "-c",
      "descriptors",
      "--descriptor-types",
      "paths",
      "--file-paths",
      filePath,
    ]);
    const paths = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    return paths;
  } catch (error) {
    console.error(`Error running jxscout-pro:`, error);
    return [];
  }
}

function checkForAdminPaths(paths: string[]): string[] {
  return paths.filter((path) => path.toLowerCase().includes("admin"));
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
      console.log("Skipping HTML content type");
      return;
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("DISCORD_WEBHOOK_URL environment variable is not set");
      process.exit(1);
    }

    const paths = await getPathsFromJxscoutPro(event.asset.file_path);
    const adminPaths = checkForAdminPaths(paths);

    if (adminPaths.length > 0) {
      const message = `Sensitive paths containing "admin" found in ${
        event.asset.url
      }:\n${adminPaths.join("\n")}`;
      await sendDiscordWebhook(webhookUrl, message);
      console.log(`Discord webhook sent: ${message}`);
    }
  } catch (error) {
    console.error("Error processing hook:", error);
    process.exit(1);
  }
}

main();
