import type { AppDatabase } from "@kabarin/db";
import { botAuthState, like } from "@kabarin/db";
import { cleanDigits } from "../senders/send";

const lidToPhoneMap = new Map<string, string>();
const phoneToLidMap = new Map<string, string>();

// Seed default mappings for demo whitelist
const DEFAULT_LID_MAPPINGS: Record<string, string> = {
  // Mbah Soepardi (Lansia Seed)
  "240200357777615": "085648907716",
  // Lansia Manual (untuk simulasi input via web)
  "142069381210117": "085235342960",
  // Mbah Sutrisno (Teman Presenter)
  "135197316137086": "087847512517",
};

for (const [lid, phone] of Object.entries(DEFAULT_LID_MAPPINGS)) {
  const cLid = cleanDigits(lid);
  const cPhone = cleanDigits(phone);
  lidToPhoneMap.set(cLid, cPhone);
  phoneToLidMap.set(cPhone, cLid);
}

export async function initLidCache(db: AppDatabase): Promise<void> {
  try {
    const rows = await db.query.botAuthState.findMany({
      where: like(botAuthState.key, "lid:%"),
    });

    for (const row of rows) {
      const lid = row.key.replace(/^lid:/, "");
      const phone = row.value;
      const cLid = cleanDigits(lid);
      const cPhone = cleanDigits(phone);
      if (cLid && cPhone) {
        lidToPhoneMap.set(cLid, cPhone);
        phoneToLidMap.set(cPhone, cLid);
      }
    }

    console.log(`[lid-cache] Initialized with ${lidToPhoneMap.size} mappings`);
  } catch (err) {
    console.error("[lid-cache] Failed to load mappings from database:", err);
  }
}

export async function registerLidMapping(
  lid: string,
  phone: string,
  db?: AppDatabase
): Promise<void> {
  const cLid = cleanDigits(lid);
  const cPhone = cleanDigits(phone);
  if (!cLid || !cPhone) return;

  lidToPhoneMap.set(cLid, cPhone);
  phoneToLidMap.set(cPhone, cLid);

  if (db) {
    try {
      await db
        .insert(botAuthState)
        .values({
          key: `lid:${cLid}`,
          value: cPhone,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: botAuthState.key,
          set: {
            value: cPhone,
            updatedAt: new Date(),
          },
        });
    } catch (err) {
      console.error(`[lid-cache] Failed to persist mapping for ${cLid}:`, err);
    }
  }
}

export function getPhoneFromLid(lidOrJid: string): string | undefined {
  const cLid = cleanDigits(lidOrJid);
  return lidToPhoneMap.get(cLid);
}

export function getLidFromPhone(phoneOrJid: string): string | undefined {
  const cPhone = cleanDigits(phoneOrJid);
  return phoneToLidMap.get(cPhone);
}
