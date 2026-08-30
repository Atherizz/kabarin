import type { WASocket } from "@whiskeysockets/baileys";
import type { AppDatabase } from "@kabarin/db";
import { eq, and, lte, checkinSessions } from "@kabarin/db";
import { sendText } from "../senders/send";
import { generateReminderGreeting } from "../ai";
import { dispatchEscalation } from "../escalation";

export async function processGracePeriodReminders(
  sock: WASocket,
  db: AppDatabase
): Promise<void> {
  const now = new Date();
  const todayDateStr = now.toISOString().split("T")[0];
  const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const pendingReminders = await db.query.checkinSessions.findMany({
    where: and(
      eq(checkinSessions.sessionDate, todayDateStr),
      eq(checkinSessions.status, "sent"),
      lte(checkinSessions.sentAt, sixtyMinutesAgo)
    ),
    with: {
      elderly: true,
    },
  });

  for (const session of pendingReminders) {
    const senior = session.elderly;
    if (!senior || !senior.phone) continue;

    const reminderMsg = await generateReminderGreeting({
      elderlyName: senior.name,
      gender: senior.gender,
      minutesElapsed: 60,
    });

    await db
      .update(checkinSessions)
      .set({
        status: "reminded",
        reminderSentAt: now,
        updatedAt: now,
      })
      .where(eq(checkinSessions.id, session.id));

    await sendText(sock, senior.phone, reminderMsg, {
      communityUnitId: senior.communityUnitId,
      elderlyId: senior.id,
      checkinSessionId: session.id,
      db,
    });

    console.log(`[scheduler] Sent dynamic AI 60m reminder to ${senior.name} (${senior.phone})`);
  }
}

export async function processGracePeriodEscalations(
  sock: WASocket,
  db: AppDatabase
): Promise<void> {
  const now = new Date();
  const todayDateStr = now.toISOString().split("T")[0];
  const thirtyMinutesAfterReminder = new Date(now.getTime() - 30 * 60 * 1000);

  const unrepliedSessions = await db.query.checkinSessions.findMany({
    where: and(
      eq(checkinSessions.sessionDate, todayDateStr),
      eq(checkinSessions.status, "reminded"),
      lte(checkinSessions.reminderSentAt, thirtyMinutesAfterReminder)
    ),
    with: {
      elderly: true,
    },
  });

  for (const session of unrepliedSessions) {
    const senior = session.elderly;
    if (!senior) continue;

    console.log(
      `[scheduler] Senior ${senior.name} has not replied >90 minutes. Escalating to Tier 1.`
    );

    await db
      .update(checkinSessions)
      .set({
        status: "escalated",
        updatedAt: now,
      })
      .where(eq(checkinSessions.id, session.id));

    await dispatchEscalation({
      db,
      sock,
      elderlyId: senior.id,
      tier: 1,
      reason:
        "Lansia belum merespons sapaan pagi dan pengingat ke-2 (>90 menit). Perlu verifikasi fisik oleh relawan.",
      checkinSessionId: session.id,
      triggeredBy: "no_response",
    });
  }
}
