import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { usePostgresAuthState } from "./store";
import type { AppDatabase } from "@kabarin/db";
import { registerLidMapping } from "./handlers/lid-cache";

let sock: WASocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 15;

export function getSocket(): WASocket | null {
  return sock;
}

export interface WhatsAppClientCallbacks {
  onMessage?: (sock: WASocket, msg: any) => Promise<void>;
  onReady?: (sock: WASocket, userJid: string) => Promise<void>;
}

export async function createWhatsAppClient(
  db: AppDatabase,
  callbacks?: WhatsAppClientCallbacks
): Promise<WASocket> {
  const logger = pino({ level: "silent" });
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`[baileys] version: ${version.join(".")} (latest: ${isLatest})`);

  const { state, saveCreds } = await usePostgresAuthState(db);

  sock = makeWASocket({
    version,
    logger,
    auth: state,
    printQRInTerminal: false,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    defaultQueryTimeoutMs: undefined,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    browser: ["Kabarin Bot", "Chrome", "1.0.0"],
    shouldIgnoreJid: (jid) => jid === "status@broadcast" || jid.endsWith("@newsletter"),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n[auth] Scan the QR code below using WhatsApp (Linked Devices):");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const error = lastDisconnect?.error as Boom | undefined;
      const statusCode = error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`[connection] Closed (status: ${statusCode}, reconnect: ${shouldReconnect})`);

      if (statusCode === DisconnectReason.loggedOut) {
        console.error("[auth] Logged out from WhatsApp. Clear session in database to re-authenticate.");
      } else if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const backoffMs = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 30000);
        console.log(`[connection] Reconnecting attempt #${reconnectAttempts} in ${(backoffMs / 1000).toFixed(1)}s...`);
        setTimeout(() => {
          createWhatsAppClient(db, callbacks).catch(console.error);
        }, backoffMs);
      }
    } else if (connection === "open") {
      reconnectAttempts = 0;
      const botJid = sock?.user?.id || "unknown";
      console.log(`[connection] Connected successfully as ${botJid}`);

      if (callbacks?.onReady && sock) {
        await callbacks.onReady(sock, botJid);
      }
    }
  });

  sock.ev.on("chats.phoneNumberShare", async ({ lid, jid }) => {
    if (lid && jid) {
      console.log(`[baileys] Phone number share: ${lid} -> ${jid}`);
      await registerLidMapping(lid, jid, db);
    }
  });

  sock.ev.on("contacts.upsert", async (contacts) => {
    for (const c of contacts) {
      const lid = (c as any).lid;
      if (c.id && lid) {
        await registerLidMapping(lid, c.id, db);
      }
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    // Ignore status broadcast updates (WhatsApp Stories) and newsletters
    const msg = m.messages?.[0];
    const remoteJid = msg?.key?.remoteJid;
    if (remoteJid === "status@broadcast" || remoteJid?.endsWith("@newsletter")) {
      return;
    }

    if (callbacks?.onMessage && sock) {
      await callbacks.onMessage(sock, m);
    }
  });

  return sock;
}
