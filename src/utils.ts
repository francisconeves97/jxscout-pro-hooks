import * as http from "http";
import * as https from "https";

export async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      resolve(data);
    });
    process.stdin.on("error", reject);
  });
}

export function sendDiscordWebhook(
  webhookUrl: string,
  message: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const isHttps = url.protocol === "https:";
    const client = isHttps ? https : http;

    const payload = JSON.stringify({
      content: message,
    });

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = client.request(options, (res: http.IncomingMessage) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(
          new Error(`Webhook request failed with status ${res.statusCode}`)
        );
      }
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}
