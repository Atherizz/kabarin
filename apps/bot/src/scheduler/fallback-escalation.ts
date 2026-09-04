import type { WASocket } from "@whiskeysockets/baileys";
import type { AppDatabase } from "@kabarin/db";
import { eq, and, lte, escalationLogs, volunteerVisits } from "@kabarin/db";
import { dispatchEscalation } from "../escalation";

// Default 15 minutes in production; configurable via VOLUNTEER_TIMEOUT_MINUTES in .env
const VOLUNTEER_TIMEOUT_MINUTES = Number(process.env.VOLUNTEER_TIMEOUT_MINUTES) || 15;

export async function processVolunteerTimeout(
  sock: WASocket,
  db: AppDatabase
): Promise<void> {
  const now = new Date();
  const timeoutThreshold = new Date(now.getTime() - VOLUNTEER_TIMEOUT_MINUTES * 60 * 1000);

  // Find open Tier 1 escalations older than the timeout threshold
  const timedOutTier1 = await db.query.escalationLogs.findMany({
    where: and(
      eq(escalationLogs.tier, 1),
      eq(escalationLogs.status, "open"),
      lte(escalationLogs.createdAt, timeoutThreshold)
    ),
    with: {
      elderly: true,
      visits: {
        where: eq(volunteerVisits.status, "pending"),
      },
    },
  });

  for (const esc of timedOutTier1) {
    // Only escalate if visit is still pending (volunteer hasn't submitted a report)
    if (!esc.visits || esc.visits.length === 0) continue;

    const senior = esc.elderly;
    if (!senior) continue;

    console.log(
      `[scheduler] Primary volunteer timeout (${VOLUNTEER_TIMEOUT_MINUTES}m) for ${senior.name}. Auto-escalating to Tier 2.`
    );

    await dispatchEscalation({
      db,
      sock,
      elderlyId: senior.id,
      tier: 2,
      reason: `Relawan utama belum memberikan konfirmasi laporan fisik setelah ${VOLUNTEER_TIMEOUT_MINUTES} menit. Penugasan dialihkan ke relawan cadangan dan keluarga dihubungi.`,
      checkinSessionId: esc.checkinSessionId,
      triggeredBy: "volunteer_timeout",
    });
  }
}
