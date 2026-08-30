import type { Context } from "hono";
import type { AppDatabase } from "@kabarin/db";
import type { BotVolunteerCreatedPayload } from "@kabarin/types";
import { getSocket } from "../../client";
import { sendText } from "../../senders/send";
import { BOT_TEMPLATES } from "../../senders/templates";

export async function handleVolunteerCreated(c: Context, db: AppDatabase) {
  const sock = getSocket();
  if (!sock) {
    return c.json({ success: false, error: "Bot is not connected to WhatsApp" }, 503);
  }

  const appBaseUrl = process.env.APP_BASE_URL || "https://kabarin.atherizz.dev";
  const body = (await c.req.json().catch(() => ({}))) as BotVolunteerCreatedPayload;

  const { name, phone, email, temporaryPassword = "Kabarin2026!" } = body;
  const loginUrl = `${appBaseUrl}/login`;
  const volMsg = BOT_TEMPLATES.volunteerProvisioned(
    name,
    email,
    temporaryPassword,
    loginUrl
  );

  await sendText(sock, phone, volMsg, { db });
  return c.json({ success: true });
}
