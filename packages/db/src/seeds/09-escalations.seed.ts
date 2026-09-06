import type { AppDatabase } from "../create-db";
import { escalationLogs } from "../schema";
import {
  COMMUNITY_RT01_ID,
  ELD_SOEPARDI_ID,
  ELD_KARTOWIJOYO_ID,
  VOL_DIMAS_ID,
  CHK_SOEPARDI_ID,
  CHK_KARTOWIJOYO_ID,
  ESC_SOEPARDI_ID,
  ESC_KARTOWIJOYO_ID,
} from "./constants";

export async function seedEscalations(db: AppDatabase) {
  await db.insert(escalationLogs).values([
    // Tier 2: Mbah Soepardi
    {
      id: ESC_SOEPARDI_ID,
      communityUnitId: COMMUNITY_RT01_ID,
      elderlyId: ELD_SOEPARDI_ID,
      checkinSessionId: CHK_SOEPARDI_ID,
      tier: 2,
      triggerReason: "ai_urgent_triage",
      status: "in_progress",
      familyNotifiedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      tierHistory: [
        {
          tier: 1,
          action: "tier_1_volunteer_alert",
          targetType: "volunteer",
          targetId: VOL_DIMAS_ID,
          targetName: "Mas Dimas Prasetyo",
          targetPhone: "087847512517",
          note: "Relawan memantau kondisi tensi Mbah Soepardi.",
          timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
        },
        {
          tier: 2,
          action: "tier_2_family_whatsapp_alert",
          targetType: "family",
          targetName: "Budi Hidayat",
          targetPhone: "085840625208",
          note: "Notifikasi WA terkirim ke anak mengenai kondisi Mbah Soepardi.",
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
    // Tier 3: Mbah Kartowijoyo
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
          targetPhone: "081330964079",
          note: "Peringatan darurat siaga RT aktif untuk Mbah Kartowijoyo.",
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
  ]);
}
