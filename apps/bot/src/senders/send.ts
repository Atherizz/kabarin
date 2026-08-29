import type { WASocket } from "@whiskeysockets/baileys";
import { chatMessages } from "@kabarin/db";
import type { AppDatabase } from "@kabarin/db";

export function formatPhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  }
  return `${cleaned}@s.whatsapp.net`;
}

export function cleanDigits(phoneOrJid: string): string {
  return phoneOrJid.split("@")[0].replace(/[^0-9]/g, "");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomJitter(minMs = 2000, maxMs = 3500): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return sleep(ms);
}

export interface SendMessageOptions {
  communityUnitId?: string;
  elderlyId?: string;
  checkinSessionId?: string;
  senderType?: "bot" | "system";
  db?: AppDatabase;
  botPhone?: string;
}

export async function sendText(
  sock: WASocket,
  targetPhone: string,
  message: string,
  options?: SendMessageOptions
): Promise<boolean> {
  try {
    const jid = formatPhone(targetPhone);

    await sock.sendPresenceUpdate("composing", jid).catch(() => {});
    await sleep(1000);

    const result = await sock.sendMessage(jid, { text: message.trim() });
    await sock.sendPresenceUpdate("paused", jid).catch(() => {});

    if (options?.db && options?.communityUnitId) {
      const messageId = result?.key?.id || crypto.randomUUID();
      await options.db.insert(chatMessages).values({
        id: messageId,
        communityUnitId: options.communityUnitId,
        elderlyId: options.elderlyId || null,
        checkinSessionId: options.checkinSessionId || null,
        senderType: options.senderType || "bot",
        senderPhone: options.botPhone || null,
        recipientPhone: cleanDigits(targetPhone),
        messageType: "text",
        content: message.trim(),
        metadata: { baileysKey: result?.key },
      }).catch((err) => {
        console.error("[db] Failed to log chat message:", err);
      });
    }

    await randomJitter(1500, 2500);
    return true;
  } catch (error) {
    console.error(`[sender] Failed to send message to ${targetPhone}:`, error);
    return false;
  }
}
