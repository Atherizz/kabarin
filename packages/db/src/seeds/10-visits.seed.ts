import type { AppDatabase } from "../create-db";
import { volunteerVisits } from "../schema";
import {
  COMMUNITY_RT01_ID,
  ELD_SOEPARDI_ID,
  ELD_SRI_ID,
  VOL_DIMAS_ID,
  ESC_SRI_ID,
  VIS_SRI_ID,
  VIS_SOEPARDI_ID,
  generateSecureHexToken,
} from "./constants";

export async function seedVisits(db: AppDatabase) {
  const tokenVisitSri = generateSecureHexToken();

  await db.insert(volunteerVisits).values([
    // Active visit task for Mbah Sri (with genuine 64-hex token valid 24h)
    {
      id: VIS_SRI_ID,
      communityUnitId: COMMUNITY_RT01_ID,
      elderlyId: ELD_SRI_ID,
      volunteerId: VOL_DIMAS_ID,
      escalationLogId: ESC_SRI_ID,
      visitType: "escalation",
      formToken: tokenVisitSri,
      tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      status: "pending",
      volunteerNotes:
        "Kunjungan fisik untuk mengecek kondisi Mbah Sri yang belum merespons sapaan pagi.",
    },
    // Completed visit yesterday for Mbah Soepardi
    {
      id: VIS_SOEPARDI_ID,
      communityUnitId: COMMUNITY_RT01_ID,
      elderlyId: ELD_SOEPARDI_ID,
      volunteerId: VOL_DIMAS_ID,
      visitType: "routine",
      formToken: generateSecureHexToken(),
      tokenExpiresAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
      visitedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: "completed",
      reportedCondition: "good",
      reportedCause: "other",
      medicationTaken: true,
      volunteerNotes:
        "Mbah Soepardi sehat ceria, tensi normal 125/80 mmHg, stok obat Amlodipine aman.",
    },
  ]);

  return {
    tokenVisitSri,
  };
}
