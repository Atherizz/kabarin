import type { Context } from "hono";
import type { AppDatabase } from "@kabarin/db";
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

  await dispatchEscalation({
    db,
    sock,
    elderlyId: body.elderlyId,
    tier: 3,
    reason:
      body.reason ||
      "Keluarga menekan tombol darurat 'Kirim Kabar Sekarang' dari portal pemantauan.",
    triggeredBy: "family_sos",
  });

  return c.json({ success: true });
}
