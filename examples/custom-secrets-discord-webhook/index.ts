import * as fs from "fs";
import { HookEvent } from "../../src/types";
import { readStdin, sendDiscordWebhook } from "../../src/utils";

function checkForAPIKey(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content.includes("APIKEY");
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return false;
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

    if (checkForAPIKey(event.asset.file_path)) {
      const message = `"APIKEY" found in ${event.asset.url}`;
      await sendDiscordWebhook(webhookUrl, message);
      console.log(`Discord webhook sent: ${message}`);
    }
  } catch (error) {
    console.error("Error processing hook:", error);
    process.exit(1);
  }
}

main();
