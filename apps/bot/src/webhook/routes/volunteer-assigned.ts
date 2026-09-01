import type { Context } from "hono";
import type { AppDatabase } from "@kabarin/db";
import type { BotVolunteerAssignedPayload } from "@kabarin/types";
import { getSocket } from "../../client";
import { sendText } from "../../senders/send";
import { BOT_TEMPLATES } from "../../senders/templates";

export async function handleVolunteerAssigned(c: Context, db: AppDatabase) {
  const sock = getSocket();
  if (!sock) {
    return c.json({ success: false, error: "Bot is not connected to WhatsApp" }, 503);
  }

  const appBaseUrl = process.env.APP_BASE_URL || "https://kabarin.pages.dev";
  const body = (await c.req.json().catch(() => ({}))) as BotVolunteerAssignedPayload;

  const {
    elderlyId,
    elderlyName,
    rt,
    communityUnitId,
    volunteerName,
    volunteerPhone,
    isPrimary,
    familyContacts,
  } = body;

  // 1. Notify the assigned volunteer
  if (volunteerPhone) {
    const volMsg = BOT_TEMPLATES.volunteerAssigned(volunteerName, elderlyName, rt);
    await sendText(sock, volunteerPhone, volMsg, { communityUnitId, elderlyId, db });
  }

  // 2. Notify family contacts that a volunteer has been assigned
  if (familyContacts && familyContacts.length > 0) {
    for (const fam of familyContacts) {
      if (fam.phone && fam.accessToken) {
        const statusUrl = `${appBaseUrl}/status/${fam.accessToken}`;
        const famMsg = BOT_TEMPLATES.familyVolunteerAssigned(
          fam.name,
          elderlyName,
          volunteerName,
          isPrimary,
          statusUrl
        );
        await sendText(sock, fam.phone, famMsg, { communityUnitId, elderlyId, db });
      }
    }
  }

  return c.json({ success: true });
}
