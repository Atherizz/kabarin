import { eq, and, volunteerVisits, user } from "@kabarin/db";
import { sendText } from "../senders/send";
import { generate64HexToken, type EscalationContext } from "./context";

export async function dispatchTier1(ctx: EscalationContext): Promise<void> {
  const { db, sock, elderly, communityUnitId, primaryVol, reason, now, appBaseUrl } = ctx;

  const formToken = generate64HexToken();
  const tokenExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const guidedChecklist = (elderly.defaultChecklist as Array<{
    question: string;
    type: "yes_no";
  }>) ?? [
    { question: "Apakah lansia terlihat sadar dan bisa berkomunikasi jelas?", type: "yes_no" },
    { question: "Apakah lansia mengeluh pusing atau rasa tidak nyaman?", type: "yes_no" },
    { question: "Apakah lansia sudah makan dan minum obat hari ini?", type: "yes_no" },
  ];

  await db.insert(volunteerVisits).values({
    id: crypto.randomUUID(),
    communityUnitId,
    elderlyId: elderly.id,
    volunteerId: primaryVol?.id ?? null,
    visitType: "escalation",
    formToken,
    tokenExpiresAt,
    status: "pending",
    volunteerNotes: reason,
    guidedChecklist,
    dispatchedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  if (!primaryVol?.phone) return;

  const reportUrl = `${appBaseUrl}/lapor/${formToken}`;
  const message =
    `⚠️ *Pemberitahuan Kunjungan Lansia — Kabarin RT ${elderly.rt}*\n\n` +
    `Halo Mas/Mbak ${primaryVol.name},\n` +
    `Mohon bantuan memeriksa kondisi Mbah *${elderly.name}* di ${elderly.address} (RT ${elderly.rt} / RW ${elderly.rw}).\n\n` +
    `📌 *Alasan:* ${reason}\n\n` +
    `Buka tautan ini untuk panduan observasi & mengisi laporan singkat kunjungan:\n` +
    `👉 ${reportUrl}`;

  await sendText(sock, primaryVol.phone, message, {
    communityUnitId,
    elderlyId: elderly.id,
    db,
  });

  console.log(`[escalation] Tier 1 WA sent to primary volunteer ${primaryVol.name}`);
}

export async function dispatchTier2(ctx: EscalationContext): Promise<void> {
  const { db, sock, elderly, communityUnitId, primaryVol, secondaryVol, primaryFamily, reason, appBaseUrl } = ctx;

  if (secondaryVol?.phone && secondaryVol.id !== primaryVol?.id) {
    const secMsg =
      `⚠️ *Pemberitahuan Siaga Pendamping — Kabarin RT ${elderly.rt}*\n\n` +
      `Halo Mas/Mbak ${secondaryVol.name},\n` +
      `Mbah *${elderly.name}* membutuhkan pantauan kondisi.\n` +
      `📌 *Alasan:* ${reason}\n` +
      `Relawan utama (${primaryVol?.name ?? "Kader"}) telah dihubungi. Mohon bersiap jika diperlukan bantuan pendampingan.`;

    await sendText(sock, secondaryVol.phone, secMsg, { communityUnitId, elderlyId: elderly.id, db });
  }

  if (primaryFamily?.phone && primaryFamily.notifyViaWhatsapp) {
    const statusUrl = `${appBaseUrl}/status/${primaryFamily.accessToken}`;
    const famMsg =
      `📢 *Kabar Pemantauan Orang Tua — Kabarin*\n\n` +
      `Halo ${primaryFamily.name},\n` +
      `Orang tua Anda, Mbah *${elderly.name}*, terdeteksi memerlukan perhatian:\n` +
      `📌 *Keluhan:* ${reason}\n\n` +
      `Relawan RT ${elderly.rt} (${primaryVol?.name ?? "Kader Posyandu"}) sudah ditugaskan untuk mengunjungi rumah beliau.\n\n` +
      `Pantau perkembangan kondisi dan hasil kunjungan secara real-time di sini:\n` +
      `👉 ${statusUrl}`;

    await sendText(sock, primaryFamily.phone, famMsg, { communityUnitId, elderlyId: elderly.id, db });
    console.log(`[escalation] Tier 2 WA sent to primary family ${primaryFamily.name}`);
  }
}

export async function dispatchTier3(ctx: EscalationContext): Promise<void> {
  const { db, sock, elderly, communityUnitId, otherFamilies, reason, appBaseUrl } = ctx;

  for (const fam of otherFamilies) {
    if (fam.phone && fam.notifyViaWhatsapp) {
      const famStatusUrl = `${appBaseUrl}/status/${fam.accessToken}`;
      const msg =
        `🚨 *PEMBERITAHUAN DARURAT — KABARIN RT ${elderly.rt}*\n\n` +
        `Halo ${fam.name},\n` +
        `Sistem mendeteksi indikasi DARURAT pada orang tua Anda, Mbah *${elderly.name}*:\n` +
        `📌 *Kondisi:* ${reason}\n\n` +
        `Tim relawan dan pengurus RT sedang bergerak ke lokasi. Pantau status langsung:\n` +
        `👉 ${famStatusUrl}`;

      await sendText(sock, fam.phone, msg, { communityUnitId, elderlyId: elderly.id, db });
    }
  }

  const cadreUsers = await db.query.user.findMany({
    where: and(eq(user.communityUnitId, communityUnitId), eq(user.role, "cadre")),
  });

  for (const cadre of cadreUsers) {
    if (cadre.phone) {
      const cadreMsg =
        `🚨 *ALARM DARURAT WILAYAH RT ${elderly.rt}*\n\n` +
        `Ibu/Bapak Kader ${cadre.name},\n` +
        `Warga lansia Mbah *${elderly.name}* (${elderly.address}) mengalami kondisi DARURAT KRITIS (Tier 3):\n` +
        `📌 *Indikasi:* ${reason}\n\n` +
        `Relawan lapangan dan keluarga telah disiagakan. Mohon koordinasi dan pantau Dashboard Kabarin.`;

      await sendText(sock, cadre.phone, cadreMsg, { communityUnitId, elderlyId: elderly.id, db });
    }
  }
}
