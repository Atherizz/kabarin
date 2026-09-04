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
    {
      id: VIS_SOEPARDI_ID,
      communityUnitId: COMMUNITY_RT01_ID,
      elderlyId: ELD_SOEPARDI_ID,
      volunteerId: VOL_DIMAS_ID,
      escalationLogId: ESC_SOEPARDI_ID,
      visitType: "escalation",
      formToken: tokenVisitSoepardi,
      tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "pending",
      volunteerNotes:
        "Kunjungan fisik untuk mengecek kondisi tensi Mbah Soepardi yang mengeluh pusing.",
      guidedChecklist: [
        { question: "Apakah Mbah Soepardi bisa bicara dengan jelas, tidak pelo atau pelo tiba-tiba?", type: "yes_no" },
        { question: "Apakah wajahnya simetris, tidak ada yang terlihat miring atau turun sebelah?", type: "yes_no" },
        { question: "Apakah kedua tangannya bisa diangkat dan digerakkan dengan normal?", type: "yes_no" },
        { question: "Apakah mengeluh sakit kepala hebat, pusing berputar, atau pandangan kabur?", type: "yes_no" },
        { question: "Apakah sudah minum obat hipertensinya hari ini?", type: "yes_no" },
      ],
    },
  ]);

  return {
    tokenVisitSoepardi,
  };
}
