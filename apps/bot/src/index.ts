import { createDB } from "@kabarin/db";
import { createWhatsAppClient } from "./client";
import { createWebhookServer } from "./webhook";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[fatal] DATABASE_URL environment variable is missing.");
  process.exit(1);
}

const db = createDB(databaseUrl);
const webhookPort = Number(process.env.BOT_WEBHOOK_PORT) || 3001;

async function main() {
  const webhookApp = createWebhookServer(db);
  const server = Bun.serve({
    port: webhookPort,
    fetch: webhookApp.fetch,
  });
  console.log(`[webhook] Server listening on http://localhost:${server.port}`);

  await createWhatsAppClient(db, {
    onReady: async (_sock, userJid) => {
      console.log(`[bot] Ready as [${userJid}]`);
    },
    onMessage: async (_sock, m) => {
      const message = m.messages[0];
      if (!message?.key?.fromMe && message?.message) {
        const from = message.key.remoteJid;
        const text =
          message.message.conversation ||
          message.message.extendedTextMessage?.text ||
          "[media/audio]";
        console.log(`[inbound] ${from}: ${text}`);
      }
    },
  });
}

main().catch((err) => {
  console.error("[fatal] Unhandled error in bot process:", err);
});
