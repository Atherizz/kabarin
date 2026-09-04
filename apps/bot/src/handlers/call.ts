import type { WASocket, WACallEvent } from "@whiskeysockets/baileys";
import type { AppDatabase } from "@kabarin/db";
import { sendText } from "../senders/send";

// 2-minute in-memory cooldown per caller to prevent notification spam
const callCooldownMap = new Map<string, number>();
const COOLDOWN_MS = 2 * 60 * 1000;

export async function handleIncomingCall(
  sock: WASocket,
  db: AppDatabase,
  call: WACallEvent
): Promise<void> {
  const callerJid = call.from;
  if (!callerJid) return;

  console.log(`[call] Incoming call ${call.id} from ${callerJid} (status: ${call.status})`);

  if (call.status !== "offer") return;

  // 1. Immediately reject the incoming call
  try {
    await sock.rejectCall(call.id, callerJid);
    console.log(`[call] Rejected call ${call.id} from ${callerJid}`);
  } catch (err) {
    console.error(`[call] Failed to reject call ${call.id}:`, err);
  }

  // 2. Anti-spam cooldown check before sending text explanation
  const now = Date.now();
  const lastNotified = callCooldownMap.get(callerJid) || 0;
  if (now - lastNotified < COOLDOWN_MS) {
    console.log(`[call] Cooldown active for ${callerJid}. Skipping auto-reply.`);
    return;
  }
  callCooldownMap.set(callerJid, now);

  // 3. Send polite Indonesian guidance message
  const autoReplyMessage =
    "Mohon maaf, nomor bot Kabarin tidak dapat menerima panggilan telepon langsung.\n\n" +
    "Untuk memberikan kabar atau menyampaikan keluhan kesehatan, Bapak/Ibu cukup mengirimkan pesan teks atau rekaman suara (Voice Note).\n\n" +
    "Pesan Anda akan otomatis kami terima dan tindak lanjuti. Terima kasih.";

  await sendText(sock, callerJid, autoReplyMessage, {
    db,
    jitterMinMs: 1000,
    jitterMaxMs: 2000,
  });

  console.log(`[call] Sent call-education reply to ${callerJid}`);
}
