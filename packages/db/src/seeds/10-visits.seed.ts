import type { AppDatabase } from "../create-db";
import { volunteerVisits } from "../schema";
import {
  COMMUNITY_RT01_ID,
  ELD_SOEPARDI_ID,
  VOL_DIMAS_ID,
  ESC_SOEPARDI_ID,
  VIS_SOEPARDI_ID,
  generateSecureHexToken,
} from "./constants";

export async function seedVisits(db: AppDatabase) {
  const tokenVisitSoepardi = generateSecureHexToken();

  await db.insert(volunteerVisits).values([
    // Active visit task for Mbah Soepardi (with genuine 64-hex token valid 24h)
    {
      id: VIS_SOEPARDI_ID,
      communityUnitId: COMMUNITY_RT01_ID,
      elderlyId: ELD_SOEPARDI_ID,
      volunteerId: VOL_DIMAS_ID,
      escalationLogId: ESC_SOEPARDI_ID,
      visitType: "escalation",
      formToken: tokenVisitSoepardi,
      tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      status: "pending",
      volunteerNotes:
        "Kunjungan fisik untuk mengecek kondisi tensi Mbah Soepardi yang mengeluh pusing.",
    },
  ]);

  return {
    tokenVisitSoepardi,
  };
}
