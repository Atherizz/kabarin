import { eq, and, volunteerVisits, user } from "@kabarin/db";
import { sendText } from "../senders/send";
import { generate64HexToken, type EscalationContext } from "./context";

export function formatEmergencyReferralCard(ctx: EscalationContext): string {
  const { elderly, activeMedications, faskes, primaryVol, primaryFamily, reason, now } = ctx;

  const timeStr = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(now);

  const mapsUrl =
    elderly.latitude && elderly.longitude
      ? `https://maps.google.com/?q=${elderly.latitude},${elderly.longitude}`
      : null;

  const medsText =
    activeMedications && activeMedications.length > 0
      ? activeMedications
          .map((m) => `- ${m.medicationName} (${m.dosage} - ${m.frequency})`)
          .join("\n")
      : "- Tidak ada obat rutin tercatat";

  return (
    `*RUJUKAN MEDIS DARURAT (TIER 3)*\n` +
    `Sistem Pemantauan Lansia Kabarin RT ${elderly.rt}\n\n` +
    `*Data Pasien:*\n` +
    `- Nama: Mbah ${elderly.name} (${elderly.age} Th, ${elderly.gender === "male" ? "Laki-laki" : "Perempuan"})\n` +
    `- Alamat: ${elderly.address} (RT ${elderly.rt} / RW ${elderly.rw})\n` +
    (mapsUrl ? `- Titik Lokasi: ${mapsUrl}\n` : "") +
    `- Indikasi Kritis: ${reason}\n` +
    `- Waktu Kejadian: ${timeStr} WIB\n\n` +
    `*Riwayat Medis & Obat:*\n` +
    `- Diagnosis: ${elderly.medicalHistory || "Tidak ada data riwayat"}\n` +
    `${medsText}\n\n` +
    `*Kontak Rujukan & Pendamping:*\n` +
    `- Puskesmas Pembina: ${faskes.healthFacilityName || "Puskesmas Kendalsari"} (${faskes.healthFacilityPhone || "-"})\n` +
    `- Ambulans: ${faskes.ambulancePhone || "119"}\n` +
    `- Relawan Pendamping: ${primaryVol?.name || "-"} (${primaryVol?.phone || "-"})\n` +
    `- Keluarga: ${primaryFamily?.name || "-"} (${primaryFamily?.phone || "-"})\n\n` +
    `Pesan ini diterbitkan otomatis untuk mempercepat tindakan rujukan dan koordinasi medis.`
  );
}

export async function dispatchTier1(ctx: EscalationContext): Promise<void> {
  const { db, sock, elderly, communityUnitId, primaryVol, reason, now, appBaseUrl } = ctx;

  const existingVisit = await db.query.volunteerVisits.findFirst({
    where: and(
      eq(volunteerVisits.elderlyId, elderly.id),
      eq(volunteerVisits.status, "pending")
    ),
  });

  let formToken = existingVisit?.formToken;

  if (!existingVisit) {
    formToken = generate64HexToken();
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
  }

  if (!primaryVol?.phone) return;

  const reportUrl = `${appBaseUrl}/lapor/${formToken}`;
  const message =
    `*Pemberitahuan Kunjungan Lansia — RT ${elderly.rt}*\n\n` +
    `Mas/Mbak ${primaryVol.name}, mohon bantuan memeriksa kondisi Mbah *${elderly.name}* di ${elderly.address} (RT ${elderly.rt} / RW ${elderly.rw}).\n\n` +
    `Keterangan: ${reason}\n\n` +
    `Panduan observasi dan laporan kunjungan:\n` +
    `${reportUrl}`;

  await sendText(sock, primaryVol.phone, message, {
    communityUnitId,
    elderlyId: elderly.id,
    db,
  });

  console.log(`[escalation] Tier 1 WA sent to primary volunteer ${primaryVol.name}`);
}

export async function dispatchTier2(ctx: EscalationContext): Promise<void> {
  const { db, sock, elderly, communityUnitId, primaryVol, secondaryVol, primaryFamily, reason, appBaseUrl, triggeredBy } = ctx;

  if (triggeredBy === "volunteer_timeout" && secondaryVol?.phone && secondaryVol.id !== primaryVol?.id) {
    try {
      const existingVisit = await db.query.volunteerVisits.findFirst({
        where: and(
          eq(volunteerVisits.elderlyId, elderly.id),
          eq(volunteerVisits.status, "pending")
        ),
      });

      if (existingVisit) {
        await db
          .update(volunteerVisits)
          .set({
            volunteerId: secondaryVol.id,
            updatedAt: new Date(),
          })
          .where(eq(volunteerVisits.id, existingVisit.id));
      }

      const reportUrl = existingVisit?.formToken
        ? `\n\nPanduan observasi dan laporan kunjungan:\n${appBaseUrl}/lapor/${existingVisit.formToken}`
        : "";

      const secMsg =
        `*Pemberitahuan Siaga Pengganti — RT ${elderly.rt}*\n\n` +
        `Mas/Mbak ${secondaryVol.name}, relawan utama (${primaryVol?.name ?? "Kader"}) belum memberikan konfirmasi laporan kunjungan.\n` +
        `Mohon bantuan mengecek kondisi Mbah *${elderly.name}* di ${elderly.address} (RT ${elderly.rt} / RW ${elderly.rw}).\n\n` +
        `Keterangan: ${reason}` +
        reportUrl;

      await sendText(sock, secondaryVol.phone, secMsg, {
        communityUnitId,
        elderlyId: elderly.id,
        db,
        jitterMinMs: 2000,
        jitterMaxMs: 3500,
      });
      console.log(`[escalation] Tier 2 WA sent to secondary volunteer ${secondaryVol.name} (triggeredBy: volunteer_timeout)`);
    } catch (err) {
      console.error(`[escalation] Failed sending Tier 2 WA to secondary volunteer ${secondaryVol.name}:`, err);
    }
  }

  if (primaryFamily?.phone && primaryFamily.notifyViaWhatsapp) {
    try {
      const statusUrl = `${appBaseUrl}/status/${primaryFamily.accessToken}`;
      const relawanNote =
        triggeredBy === "volunteer_timeout"
          ? `Relawan utama sedang berhalangan, sehingga penugasan dialihkan ke relawan cadangan (${secondaryVol?.name ?? "Kader Posyandu"}).`
          : `Relawan RT ${elderly.rt} (${primaryVol?.name ?? "Kader Posyandu"}) sudah ditugaskan untuk mengunjungi rumah beliau.`;

      const famMsg =
        `*Kabar Pemantauan Orang Tua — Kabarin RT ${elderly.rt}*\n\n` +
        `Halo ${primaryFamily.name},\n` +
        `Orang tua Anda, Mbah *${elderly.name}*, terdeteksi memerlukan perhatian:\n` +
        `Keterangan: ${reason}\n\n` +
        `${relawanNote}\n\n` +
        `Perkembangan kondisi dan hasil kunjungan dapat dipantau di tautan berikut:\n` +
        `${statusUrl}`;

      await sendText(sock, primaryFamily.phone, famMsg, {
        communityUnitId,
        elderlyId: elderly.id,
        db,
        jitterMinMs: 2000,
        jitterMaxMs: 3500,
      });
      console.log(`[escalation] Tier 2 WA sent to primary family ${primaryFamily.name}`);
    } catch (err) {
      console.error(`[escalation] Failed sending Tier 2 WA to primary family ${primaryFamily.name}:`, err);
    }
  }
}

export async function dispatchTier3(ctx: EscalationContext): Promise<void> {
  const { db, sock, elderly, communityUnitId, allFamilies, primaryVol, secondaryVol, appBaseUrl } = ctx;

  const baseReferralCard = formatEmergencyReferralCard(ctx);

  for (const fam of allFamilies) {
    if (!fam.phone || !fam.notifyViaWhatsapp) continue;

    try {
      const famStatusUrl = `${appBaseUrl}/status/${fam.accessToken}`;
      const famMsg =
        `*PEMBERITAHUAN DARURAT KELUARGA — RT ${elderly.rt}*\n\n` +
        `Halo ${fam.name},\n` +
        `Berikut Kartu Rujukan Medis Darurat untuk orang tua Anda, Mbah *${elderly.name}*:\n\n` +
        `${baseReferralCard}\n\n` +
        `Pengurus RT dan relawan sedang mengoordinasikan bantuan darurat ke lokasi. Pantau perkembangan status di:\n` +
        `${famStatusUrl}`;

      await sendText(sock, fam.phone, famMsg, {
        communityUnitId,
        elderlyId: elderly.id,
        db,
        jitterMinMs: 2500,
        jitterMaxMs: 4500,
      });
      console.log(`[escalation] Tier 3 WA sent to family member: ${fam.name} (${fam.phone})`);
    } catch (err) {
      console.error(`[escalation] Failed sending Tier 3 WA to family ${fam.name}:`, err);
    }
  }

  try {
    const cadreUsers = await db.query.user.findMany({
      where: and(eq(user.communityUnitId, communityUnitId), eq(user.role, "cadre")),
    });

    for (const cadre of cadreUsers) {
      if (!cadre.phone) continue;
      try {
        const cadreMsg =
          `*ALARM DARURAT KOORDINASI WILAYAH RT ${elderly.rt}*\n\n` +
          `Ibu/Bapak Kader ${cadre.name},\n` +
          `Warga lansia Mbah *${elderly.name}* mengalami kondisi darurat kritis (Tier 3).\n\n` +
          `${baseReferralCard}\n\n` +
          `Mohon segera koordinasikan bantuan faskes / ambulans siaga dan pantau perkembangan melalui Dasbor RT.`;

        await sendText(sock, cadre.phone, cadreMsg, {
          communityUnitId,
          elderlyId: elderly.id,
          db,
          jitterMinMs: 2500,
          jitterMaxMs: 4000,
        });
        console.log(`[escalation] Tier 3 WA sent to cadre: ${cadre.name} (${cadre.phone})`);
      } catch (err) {
        console.error(`[escalation] Failed sending Tier 3 WA to cadre ${cadre.name}:`, err);
      }
    }
  } catch (err) {
    console.error("[escalation] Failed querying cadre users:", err);
  }

  const volunteersToAlert = [primaryVol, secondaryVol].filter(
    (v, idx, arr): v is NonNullable<typeof v> =>
      Boolean(v?.phone) && arr.findIndex((x) => x?.id === v?.id) === idx
  );

  for (const vol of volunteersToAlert) {
    try {
      const volMsg =
        `*PANGGILAN TANGGAP DARURAT TIER 3 — SEGERA KE LOKASI*\n\n` +
        `Mas/Mbak ${vol.name} (Relawan Pendamping),\n` +
        `Mbah *${elderly.name}* membutuhkan pertolongan medis darurat saat ini. Mohon segera datangi rumah beliau dengan membawa data rujukan berikut:\n\n` +
        `${baseReferralCard}`;

      await sendText(sock, vol.phone, volMsg, {
        communityUnitId,
        elderlyId: elderly.id,
        db,
        jitterMinMs: 2500,
        jitterMaxMs: 4000,
      });
      console.log(`[escalation] Tier 3 WA sent to volunteer: ${vol.name} (${vol.phone})`);
    } catch (err) {
      console.error(`[escalation] Failed sending Tier 3 WA to volunteer ${vol.name}:`, err);
    }
  }

  console.log(`[escalation] Tier 3 Emergency Referral Card successfully processed for all designated parties.`);
}
