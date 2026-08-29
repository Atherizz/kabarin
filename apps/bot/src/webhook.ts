import { Hono } from "hono";
import { getSocket } from "./client";
import { sendText } from "./senders/send";
import type { AppDatabase } from "@kabarin/db";

export function createWebhookServer(db: AppDatabase) {
  const app = new Hono();
  const secret = process.env.WEBHOOK_SECRET || "kabarin-bot-secret";

  // Health check
  app.get("/health", (c) => {
    const sock = getSocket();
    const isConnected = !!sock?.user?.id;
    return c.json({
      status: "ok",
      botConnected: isConnected,
      botPhone: sock?.user?.id || null,
      timestamp: new Date().toISOString(),
    });
  });

  // Secret verification middleware for mutating webhooks
  app.use("/webhook/*", async (c, next) => {
    const incomingSecret = c.req.header("x-webhook-secret");
    if (incomingSecret !== secret) {
      return c.json({ success: false, error: "Unauthorized webhook secret" }, 401);
    }
    return next();
  });

  // Test send endpoint for verification
  app.post("/webhook/test-send", async (c) => {
    const sock = getSocket();
    if (!sock) {
      return c.json({ success: false, error: "Bot is not connected to WhatsApp" }, 503);
    }

    const body = await c.req.json().catch(() => ({}));
    const { phone, message } = body as { phone?: string; message?: string };

    if (!phone || !message) {
      return c.json({ success: false, error: "Missing 'phone' or 'message'" }, 400);
    }

    const sent = await sendText(sock, phone, message);
    return c.json({ success: sent });
  });

  return app;
}
