import type { AppDatabase } from "../create-db";
import { escalationLogs } from "../schema";
import {
  COMMUNITY_RT01_ID,
  ELD_AMINAH_ID,
  ELD_KARTOWIJOYO_ID,
  ELD_SRI_ID,
  VOL_DIMAS_ID,
  VOL_WAHYU_ID,
  CHK_SRI_ID,
  CHK_AMINAH_ID,
  CHK_KARTOWIJOYO_ID,
  ESC_SRI_ID,
  ESC_AMINAH_ID,
  ESC_KARTOWIJOYO_ID,
} from "./constants";

export async function seedEscalations(db: AppDatabase) {
  await db.insert(escalationLogs).values([
    // Tier 1 — Mbah Sri Wahyuni (Timeout)
    {
      id: ESC_SRI_ID,
      communityUnitId: COMMUNITY_RT01_ID,
      elderlyId: ELD_SRI_ID,
      checkinSessionId: CHK_SRI_ID,
      tier: 1,
      triggerReason: "no_response",
      status: "open",
      tierHistory: [
        {
          tier: 1,
          action: "tier_1_volunteer_alert",
          targetType: "volunteer",
          targetId: VOL_DIMAS_ID,
          targetName: "Mas Dimas Prasetyo",
          targetPhone: "082133445566",
          note: "Mbah Sri belum membalas sapaan pagi. Tugas kunjungan fisik disiapkan.",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
    // Tier 2 — Mbah Siti Aminah (Pusing / Gejala)
    {
      id: ESC_AMINAH_ID,
      communityUnitId: COMMUNITY_RT01_ID,
      elderlyId: ELD_AMINAH_ID,
      checkinSessionId: CHK_AMINAH_ID,
      tier: 2,
      triggerReason: "ai_urgent_triage",
      status: "in_progress",
      familyNotifiedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      tierHistory: [
        {
          tier: 1,
          action: "tier_1_volunteer_notified",
          targetType: "volunteer",
          targetId: VOL_WAHYU_ID,
          targetName: "Mas Dimas Wahyu",
          note: "Relawan memantau keluhan pusing Mbah Aminah.",
          timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
        },
        {
          tier: 2,
          action: "tier_2_family_whatsapp_alert",
          targetType: "family",
          targetName: "Rian Hidayat",
          targetPhone: "081288990011",
          note: "Notifikasi WA terkirim ke anak di Jakarta mengenai keluhan pusing ibu.",
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
    // Tier 3 — Mbah Kartowijoyo (Darurat)
    {
      id: ESC_KARTOWIJOYO_ID,
      communityUnitId: COMMUNITY_RT01_ID,
      elderlyId: ELD_KARTOWIJOYO_ID,
      checkinSessionId: CHK_KARTOWIJOYO_ID,
      tier: 3,
      triggerReason: "manual_trigger",
      status: "open",
      puskesmasReferralDispatched: true,
      puskesmasDispatchedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      tierHistory: [
        {
          tier: 3,
          action: "tier_3_cadre_emergency_broadcast",
          targetType: "cadre",
          targetName: "Ibu Endang Astuti",
          targetPhone: "081234567890",
          note: "Peringatan darurat siaga RT aktif untuk Mbah Kartowijoyo.",
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
  ]);
}
