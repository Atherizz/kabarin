import type { Context } from "hono";
import type { AppDatabase } from "@kabarin/db";
import type { BotElderlyOnboardedPayload } from "@kabarin/types";
import { getSocket } from "../../client";
import { sendText } from "../../senders/send";
import { BOT_TEMPLATES } from "../../senders/templates";

export async function handleElderlyOnboarded(c: Context, db: AppDatabase) {
  const sock = getSocket();
  if (!sock) {
    return c.json({ success: false, error: "Bot is not connected to WhatsApp" }, 503);
  }

  const appBaseUrl = process.env.APP_BASE_URL || "https://kabarin.atherizz.dev";
  const body = (await c.req.json().catch(() => ({}))) as BotElderlyOnboardedPayload;

  const {
    elderlyId,
    elderlyName,
    elderlyPhone,
    rt,
    rw,
    communityUnitId,
    familyContacts,
    volunteerAssignments,
  } = body;

  if (elderlyPhone) {
    const welcomeMsg = BOT_TEMPLATES.elderlyWelcome(elderlyName, rt, rw);
    await sendText(sock, elderlyPhone, welcomeMsg, { communityUnitId, elderlyId, db });
  }

  if (familyContacts && familyContacts.length > 0) {
    for (const fam of familyContacts) {
      if (fam.phone && fam.accessToken) {
        const statusUrl = `${appBaseUrl}/status/${fam.accessToken}`;
        const famMsg = BOT_TEMPLATES.familyLinked(fam.name, elderlyName, rt, statusUrl);
        await sendText(sock, fam.phone, famMsg, { communityUnitId, elderlyId, db });
      }
    }
  }

  if (volunteerAssignments && volunteerAssignments.length > 0) {
    for (const vol of volunteerAssignments) {
      if (vol.phone) {
        const volMsg = BOT_TEMPLATES.volunteerAssigned(vol.name, elderlyName, rt);
        await sendText(sock, vol.phone, volMsg, { communityUnitId, elderlyId, db });
      }
    }
  }

  return c.json({ success: true });
}
