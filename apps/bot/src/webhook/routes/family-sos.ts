import type { Context } from "hono";
import type { AppDatabase } from "@kabarin/db";
import { eq, and, escalationLogs } from "@kabarin/db";
import type { BotFamilySosPayload } from "@kabarin/types";
import { getSocket } from "../../client";
import { dispatchEscalation } from "../../escalation";

export async function handleFamilySos(c: Context, db: AppDatabase) {
  const sock = getSocket();
  if (!sock) {
    return c.json({ success: false, error: "Bot is not connected to WhatsApp" }, 503);
  }

  const body = (await c.req.json().catch(() => ({}))) as BotFamilySosPayload;

  if (!body.elderlyId) {
    return c.json({ success: false, error: "Missing 'elderlyId'" }, 400);
  }

  const activeEscalation = await db.query.escalationLogs.findFirst({
    where: and(
      eq(escalationLogs.elderlyId, body.elderlyId),
      eq(escalationLogs.status, "open")
    ),
  });

  const targetTier = activeEscalation && activeEscalation.tier >= 2 ? 3 : 1;

  await dispatchEscalation({
    db,
    sock,
    elderlyId: body.elderlyId,
    tier: targetTier,
    reason:
      body.reason ||
      (targetTier === 3
        ? "Keluarga mengonfirmasi kebutuhan bantuan darurat segera (Tier 3) dari portal pemantauan."
        : "Keluarga meminta pengecekan fisik relawan ke rumah lansia dari portal pemantauan."),
    triggeredBy: "family_sos",
  });

  return c.json({ success: true, escalatedTier: targetTier });
}
