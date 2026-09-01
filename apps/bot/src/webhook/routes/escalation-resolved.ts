import type { Context } from "hono";
import type { AppDatabase } from "@kabarin/db";
import type { BotEscalationResolvedPayload } from "@kabarin/types";
import { getSocket } from "../../client";
import { sendText } from "../../senders/send";
import { BOT_TEMPLATES } from "../../senders/templates";

export async function handleEscalationResolved(c: Context, db: AppDatabase) {
  const sock = getSocket();
  if (!sock) {
    return c.json({ success: false, error: "Bot is not connected to WhatsApp" }, 503);
  }

  const appBaseUrl = process.env.APP_BASE_URL || "https://kabarin.pages.dev";
  const body = (await c.req.json().catch(() => ({}))) as BotEscalationResolvedPayload;

  const {
    elderlyId,
    elderlyName,
    communityUnitId,
    volunteerName = "Relawan RT",
    resolutionNotes = "Kunjungan telah selesai dilaksanakan dengan aman.",
    familyContacts,
  } = body;

  // Notify all family contacts that the elderly is safe and resolved
  if (familyContacts && familyContacts.length > 0) {
    for (const fam of familyContacts) {
      if (fam.phone && fam.accessToken) {
        const statusUrl = `${appBaseUrl}/status/${fam.accessToken}`;
        const famMsg = BOT_TEMPLATES.familyEscalationResolved(
          fam.name,
          elderlyName,
          volunteerName,
          resolutionNotes,
          statusUrl
        );
        await sendText(sock, fam.phone, famMsg, { communityUnitId, elderlyId, db });
      }
    }
  }

  return c.json({ success: true });
}
