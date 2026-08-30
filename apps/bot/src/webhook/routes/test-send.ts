import type { Context } from "hono";
import { getSocket } from "../../client";
import { sendText } from "../../senders/send";

export async function handleTestSend(c: Context) {
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
}
