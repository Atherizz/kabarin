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

import { handleInboundMessage } from "./handlers/router";
import { initLidCache } from "./handlers/lid-cache";
import { startScheduler, startDbScheduler } from "./scheduler";

async function main() {
  await initLidCache(db);
  startDbScheduler(db);

  const webhookApp = createWebhookServer(db);
  const server = Bun.serve({
    port: webhookPort,
    fetch: webhookApp.fetch,
  });
  console.log(`[webhook] Server listening on http://localhost:${server.port}`);

  await createWhatsAppClient(db, {
    onReady: async (sock, userJid) => {
      console.log(`[bot] Ready as [${userJid}]`);
      startScheduler(sock, db);
    },
    onMessage: async (sock, m) => {
      const message = m.messages[0];
      if (message) {
        await handleInboundMessage(sock, db, message).catch((err) => {
          console.error("[router] Error handling inbound message:", err);
        });
      }
    },
  });
}

main().catch((err) => {
  console.error("[fatal] Unhandled error in bot process:", err);
});
