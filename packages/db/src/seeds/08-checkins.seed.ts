import type { AppDatabase } from "../create-db";
import { checkinSessions } from "../schema";
import {
  COMMUNITY_RT01_ID,
  ELD_SOEPARDI_ID,
  ELD_AMINAH_ID,
  ELD_KARTOWIJOYO_ID,
  ELD_SRI_ID,
  CHK_SOEPARDI_ID,
  CHK_AMINAH_ID,
  CHK_KARTOWIJOYO_ID,
  CHK_SRI_ID,
} from "./constants";

export async function seedCheckins(db: AppDatabase) {
  const todayWib = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  await db.insert(checkinSessions).values([
    // Mbah Soepardi
    {
      id: CHK_SOEPARDI_ID,
      communityUnitId: COMMUNITY_RT01_ID,
      elderlyId: ELD_SOEPARDI_ID,
      sessionDate: todayWib,
      status: "replied",
      sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      repliedAt: new Date(Date.now() - 3.8 * 60 * 60 * 1000),
      replyType: "voice",
      rawText:
        "Alhamdulillah Mas Dimas, kulo sehat walafiat, wau enjing sampun sarapan bubur ayam kaliyan ngunjuk obat tensi.",
      voiceAudioUrl: "https://storage.kabarin.id/audio/soepardi-checkin-today.ogg",
      aiTriageResult: {
        urgency: "normal",
        symptoms: [],
        medicationCompliance: true,
        clinicalReasoning:
          "Lansia mengonfirmasi sudah sarapan bubur dan meminum obat anti-hipertensi secara rutin. Suara jernih dan bersemangat.",
        recommendedAction: "Pertahankan pemantauan sapaan rutin esok hari pukul 07:00.",
        toolsExecuted: ["whisper_stt", "triage_classifier", "update_elderly_status"],
      },
    },
    // Mbah Kartowijoyo
    {
      id: CHK_KARTOWIJOYO_ID,
      communityUnitId: COMMUNITY_RT01_ID,
      elderlyId: ELD_KARTOWIJOYO_ID,
      sessionDate: todayWib,
      status: "escalated",
      sentAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      reminderSentAt: new Date(Date.now() - 4.5 * 60 * 60 * 1000),
      replyType: "none",
      aiTriageResult: {
        urgency: "emergency",
        symptoms: ["Tidak ada respon sapaan", "Tirah baring total"],
        medicationCompliance: false,
        clinicalReasoning:
          "Lansia kategori homebound pasca stroke tidak merespons pengingat dan tidak memiliki HP mandiri.",
        recommendedAction: "Dispatch kunjungan fisik darurat oleh relawan terdekat.",
        toolsExecuted: ["timeout_escalator", "dispatch_volunteer_visit"],
      },
    },
  ]);
}
