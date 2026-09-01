import type { WASocket, proto } from "@whiskeysockets/baileys";
import type { AppDatabase } from "@kabarin/db";
import {
  eq,
  or,
  and,
  elderly,
  elderlyMedications,
  checkinSessions,
  chatMessages,
} from "@kabarin/db";
import { cleanDigits, sendText } from "../senders/send";
import { triageElderlyResponse } from "../ai";
import { dispatchEscalation } from "../escalation";
import { transcribeVoiceNote } from "./voice";

export async function handleInboundMessage(
  sock: WASocket,
  db: AppDatabase,
  msg: proto.IWebMessageInfo
): Promise<void> {
  const remoteJid = msg.key.remoteJid;
  if (!remoteJid || msg.key.fromMe) return;

  if (
    remoteJid === "status@broadcast" ||
    remoteJid.endsWith("@g.us") ||
    remoteJid.endsWith("@newsletter")
  ) {
    return;
  }

  const messageContent = msg.message;
  if (!messageContent) return;

  const isAudio = Boolean(
    messageContent.audioMessage ||
      messageContent.ephemeralMessage?.message?.audioMessage
  );

  let textContent =
    messageContent.conversation ||
    messageContent.extendedTextMessage?.text ||
    messageContent.imageMessage?.caption ||
    messageContent.videoMessage?.caption ||
    "";

  if (isAudio && !textContent) {
    const transcript = await transcribeVoiceNote(sock, msg);
    if (transcript) {
      textContent = transcript;
    } else {
      console.log("[inbound] Voice note transcription failed or returned empty. Skipping.");
      return;
    }
  }

  if (!textContent.trim() && !isAudio) return;

  console.log(`[inbound] Message received from ${remoteJid}: "${textContent}"`);

  // Build list of candidate phone / LID strings for DB matching
  const candidatePhones = new Set<string>();
  const rawDigits = cleanDigits(remoteJid);
  candidatePhones.add(rawDigits);
  candidatePhones.add(remoteJid);

  if (rawDigits.startsWith("0")) {
    candidatePhones.add(`62${rawDigits.slice(1)}`);
  } else if (rawDigits.startsWith("62")) {
    candidatePhones.add(`0${rawDigits.slice(2)}`);
  } else if (rawDigits.startsWith("8")) {
    candidatePhones.add(`62${rawDigits}`);
    candidatePhones.add(`0${rawDigits}`);
  }

  // Attempt LID-to-PN resolution via Baileys internal signal repository
  if (remoteJid.endsWith("@lid")) {
    try {
      const resolved = await (sock as any).signalRepository?.lidToJid?.(remoteJid);
      if (resolved) {
        const resDigits = cleanDigits(resolved);
        candidatePhones.add(resDigits);
        if (resDigits.startsWith("62")) {
          candidatePhones.add(`0${resDigits.slice(2)}`);
        } else if (resDigits.startsWith("0")) {
          candidatePhones.add(`62${resDigits.slice(1)}`);
        }
        console.log(`[inbound] Resolved LID ${remoteJid} -> ${resolved}`);
      }
    } catch {}
  }

  const matchConditions = Array.from(candidatePhones).map((p) => eq(elderly.phone, p));

  const elderlyRecord = await db.query.elderly.findFirst({
    where: or(...matchConditions),
    with: {
      medications: {
        where: eq(elderlyMedications.isActive, true),
      },
    },
  });

  if (!elderlyRecord) {
    console.log(
      `[inbound] Phone / LID ${rawDigits} is not registered as an elderly in DB. Candidate checks: [${Array.from(candidatePhones).join(", ")}]`
    );
    return;
  }

  console.log(
    `[inbound] Identified senior: ${elderlyRecord.name} (ID: ${elderlyRecord.id}, Status: ${elderlyRecord.currentStatus})`
  );

  const todayDateStr = new Date().toISOString().split("T")[0];
  let todaySession = await db.query.checkinSessions.findFirst({
    where: and(
      eq(checkinSessions.elderlyId, elderlyRecord.id),
      eq(checkinSessions.sessionDate, todayDateStr)
    ),
  });

  if (!todaySession) {
    const sessionId = crypto.randomUUID();
    const [createdSession] = await db
      .insert(checkinSessions)
      .values({
        id: sessionId,
        communityUnitId: elderlyRecord.communityUnitId,
        elderlyId: elderlyRecord.id,
        sessionDate: todayDateStr,
        status: "pending",
        replyType: isAudio ? "voice" : "text",
      })
      .returning();
    todaySession = createdSession;
  }

  const activeMeds = elderlyRecord.medications.map((m) => ({
    medicationName: m.medicationName,
    dosage: m.dosage,
    frequency: m.frequency,
    timeOfDay: m.timeOfDay,
  }));

  const triageResult = await triageElderlyResponse({
    elderlyId: elderlyRecord.id,
    elderlyName: elderlyRecord.name,
    age: elderlyRecord.age,
    gender: elderlyRecord.gender,
    address: elderlyRecord.address,
    medicalHistory: elderlyRecord.medicalHistory,
    activeMedications: activeMeds,
    messageText: textContent,
    messageType: isAudio ? "voice" : "text",
  });

  console.log(
    `[triage] Evaluation for ${elderlyRecord.name}: Urgency=${triageResult.urgency}, Status=${triageResult.status}, ShouldEscalate=${triageResult.shouldEscalate}, Tier=${triageResult.escalationTier}`
  );

  const messageId = msg.key.id || crypto.randomUUID();
  await db.insert(chatMessages).values({
    id: messageId,
    communityUnitId: elderlyRecord.communityUnitId,
    elderlyId: elderlyRecord.id,
    checkinSessionId: todaySession.id,
    senderType: "elderly",
    senderPhone: rawDigits,
    recipientPhone: cleanDigits(sock.user?.id || ""),
    messageType: isAudio ? "voice" : "text",
    content: textContent,
    metadata: { triageResult },
  });

  await db
    .update(checkinSessions)
    .set({
      status: triageResult.shouldEscalate ? "escalated" : "replied",
      replyType: isAudio ? "voice" : "text",
      rawText: textContent,
      repliedAt: new Date(),
      aiTriageResult: triageResult,
      updatedAt: new Date(),
    })
    .where(eq(checkinSessions.id, todaySession.id));

  // Reply back directly to sender's active JID thread (whether LID or phone JID)
  await sendText(sock, remoteJid, triageResult.replyMessage, {
    communityUnitId: elderlyRecord.communityUnitId,
    elderlyId: elderlyRecord.id,
    checkinSessionId: todaySession.id,
    db,
  });

  if (triageResult.shouldEscalate && triageResult.escalationTier) {
    console.log(
      `[router] Triggering Tier ${triageResult.escalationTier} escalation for ${elderlyRecord.name}: ${triageResult.escalationReason}`
    );
    await dispatchEscalation({
      db,
      sock,
      elderlyId: elderlyRecord.id,
      tier: triageResult.escalationTier,
      reason:
        triageResult.escalationReason ||
        `Lansia menyampaikan keluhan saat sapaan pagi: "${textContent}"`,
      checkinSessionId: todaySession.id,
      triggeredBy: "ai_triage",
    });
  }
}
