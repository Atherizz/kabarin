import type { Context } from "hono";
import type { AppDatabase } from "@kabarin/db";
import type { BotElderlySubmittedPayload } from "@kabarin/types";
import { getSocket } from "../../client";
import { sendText } from "../../senders/send";
import { BOT_TEMPLATES } from "../../senders/templates";

export async function handleElderlySubmitted(c: Context, db: AppDatabase) {
  const sock = getSocket();
  if (!sock) {
    return c.json({ success: false, error: "Bot is not connected to WhatsApp" }, 503);
  }

  const appBaseUrl = process.env.APP_BASE_URL || "https://kabarin.pages.dev";
  const body = (await c.req.json().catch(() => ({}))) as BotElderlySubmittedPayload;

  const {
    elderlyId,
    elderlyName,
    elderlyPhone,
    rt,
    rw,
    communityUnitId,
    submittedByFamilyName,
    familyContacts,
    cadrePhone,
    cadreName,
  } = body;

  // 1. Greet elderly if phone provided
  if (elderlyPhone) {
    const welcomeMsg = BOT_TEMPLATES.elderlyWelcome(elderlyName, rt, rw);
    await sendText(sock, elderlyPhone, welcomeMsg, { communityUnitId, elderlyId, db });
  }

  // 2. Notify family contacts with status URL
  if (familyContacts && familyContacts.length > 0) {
    for (const fam of familyContacts) {
      if (fam.phone && fam.accessToken) {
        const statusUrl = `${appBaseUrl}/status/${fam.accessToken}`;
        const famMsg = BOT_TEMPLATES.familyLinked(fam.name, elderlyName, rt, statusUrl);
        await sendText(sock, fam.phone, famMsg, { communityUnitId, elderlyId, db });
      }
    }
  }

  // 3. Send WhatsApp Alert to Cadre RT
  if (cadrePhone) {
    const cadreMsg = BOT_TEMPLATES.cadreNewElderlySubmissionAlert(
      cadreName || "RT",
      elderlyName,
      rt,
      submittedByFamilyName
    );
    await sendText(sock, cadrePhone, cadreMsg, { communityUnitId, elderlyId, db });
  }

  return c.json({ success: true });
}
