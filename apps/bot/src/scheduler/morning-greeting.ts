import type { WASocket } from "@whiskeysockets/baileys";
import type { AppDatabase } from "@kabarin/db";
import { eq, and, elderly, elderlyMedications, checkinSessions } from "@kabarin/db";
import { sendText } from "../senders/send";
import { generateMorningGreeting } from "../ai";

const INDONESIAN_DAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

export async function processMorningGreetings(
  sock: WASocket,
  db: AppDatabase
): Promise<void> {
  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, "0");
  const currentMinutes = String(now.getMinutes()).padStart(2, "0");
  const currentTimeStr = `${currentHours}:${currentMinutes}`;
  const todayDateStr = now.toISOString().split("T")[0];
  const dayName = INDONESIAN_DAYS[now.getDay()] || "Hari Ini";

  const targetSeniors = await db.query.elderly.findMany({
    where: and(
      eq(elderly.monitoringMode, "active"),
      eq(elderly.verificationStatus, "verified"),
      eq(elderly.preferredCheckinTime, currentTimeStr)
    ),
    with: {
      medications: {
        where: eq(elderlyMedications.isActive, true),
      },
    },
  });

  for (const senior of targetSeniors) {
    if (!senior.phone) continue;

    const existingSession = await db.query.checkinSessions.findFirst({
      where: and(
        eq(checkinSessions.elderlyId, senior.id),
        eq(checkinSessions.sessionDate, todayDateStr)
      ),
    });

    if (existingSession && existingSession.status !== "pending") {
      continue;
    }

    const morningMeds = senior.medications
      .filter((m) => m.timeOfDay === "morning" || m.timeOfDay === "afternoon")
      .map((m) => ({ medicationName: m.medicationName, dosage: m.dosage }));

    const greetingMsg = await generateMorningGreeting({
      elderlyName: senior.name,
      gender: senior.gender,
      age: senior.age,
      dayName,
      morningMedications: morningMeds,
      previousDayNote: senior.notes,
    });

    const sessionId = existingSession?.id ?? crypto.randomUUID();

    if (!existingSession) {
      await db.insert(checkinSessions).values({
        id: sessionId,
        communityUnitId: senior.communityUnitId,
        elderlyId: senior.id,
        sessionDate: todayDateStr,
        status: "sent",
        sentAt: now,
      });
    } else {
      await db
        .update(checkinSessions)
        .set({
          status: "sent",
          sentAt: now,
          updatedAt: now,
        })
        .where(eq(checkinSessions.id, sessionId));
    }

    await sendText(sock, senior.phone, greetingMsg, {
      communityUnitId: senior.communityUnitId,
      elderlyId: senior.id,
      checkinSessionId: sessionId,
      db,
    });

    console.log(
      `[scheduler] Sent dynamic AI morning greeting to ${senior.name} (${senior.phone})`
    );
  }
}
