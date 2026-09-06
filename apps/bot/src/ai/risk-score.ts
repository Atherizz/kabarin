import type { AppDatabase } from "@kabarin/db";
import {
  eq,
  and,
  gte,
  not,
  inArray,
  elderly,
  elderlyMedications,
  checkinSessions,
  escalationLogs,
} from "@kabarin/db";
import type { RiskScoreBreakdown, RiskCategory } from "@kabarin/types";

const THRESHOLDS = {
  RENDAH_MAX: 30,
  SEDANG_MAX: 60,
} as const;

export function classifyRisk(score: number): RiskCategory {
  if (score <= THRESHOLDS.RENDAH_MAX) return "rendah";
  if (score <= THRESHOLDS.SEDANG_MAX) return "sedang";
  return "tinggi";
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function computeMA(db: AppDatabase, elderlyId: string): Promise<{ score: number; note: string }> {
  const activeMeds = await db.query.elderlyMedications.findMany({
    where: and(eq(elderlyMedications.elderlyId, elderlyId), eq(elderlyMedications.isActive, true)),
  });

  if (activeMeds.length === 0) {
    return { score: 0, note: "Tidak ada obat aktif tercatat" };
  }

  const sessions = await db.query.checkinSessions.findMany({
    where: and(
      eq(checkinSessions.elderlyId, elderlyId),
      gte(checkinSessions.createdAt, daysAgo(7)),
      not(inArray(checkinSessions.status, ["pending", "skipped"]))
    ),
  });

  const determined = sessions.filter(
    (s) => s.aiTriageResult?.medicationCompliance === true || s.aiTriageResult?.medicationCompliance === false
  );

  if (determined.length < 3) {
    return { score: 0, note: `Data kepatuhan kurang (${determined.length} sesi terdeteksi, min. 3)` };
  }

  const nonCompliant = determined.filter((s) => s.aiTriageResult?.medicationCompliance === false).length;
  const score = Math.round((nonCompliant / determined.length) * 100);

  return {
    score,
    note: `Tidak patuh ${nonCompliant} dari ${determined.length} sesi terdeteksi dalam 7 hari`,
  };
}

async function computeRP(db: AppDatabase, elderlyId: string, isPassive: boolean): Promise<{ score: number; note: string }> {
  if (isPassive) {
    return { score: 0, note: "Lansia mode pasif — tidak ada ekspektasi balas WhatsApp" };
  }

  const sessions = await db.query.checkinSessions.findMany({
    where: and(eq(checkinSessions.elderlyId, elderlyId), gte(checkinSessions.createdAt, daysAgo(7))),
  });

  const sent = sessions.filter((s) => s.sentAt !== null);
  if (sent.length === 0) {
    return { score: 0, note: "Tidak ada sesi sapaan dikirim dalam 7 hari" };
  }

  const noReply = sent.filter((s) => s.repliedAt === null).length;

  let score = 0;
  if (noReply === 1) score = 30;
  else if (noReply === 2) score = 60;
  else if (noReply >= 3) score = 100;

  return {
    score,
    note: noReply === 0
      ? "Responsif sempurna — membalas semua sapaan"
      : `Tidak merespons ${noReply} dari ${sent.length} sapaan dalam 7 hari`,
  };
}

async function computeSB(db: AppDatabase, elderlyId: string): Promise<{ score: number; note: string }> {
  const sessions = await db.query.checkinSessions.findMany({
    where: and(eq(checkinSessions.elderlyId, elderlyId), gte(checkinSessions.createdAt, daysAgo(7))),
  });

  const withTriage = sessions.filter((s) => s.aiTriageResult !== null);
  if (withTriage.length === 0) {
    return { score: 0, note: "Tidak ada data keluhan dalam 7 hari" };
  }

  let totalPoints = 0;
  let kuning = 0;
  let merah = 0;

  for (const s of withTriage) {
    const urgency = s.aiTriageResult?.urgency;
    if (urgency === "needs_attention") { totalPoints += 10; kuning++; }
    else if (urgency === "emergency") { totalPoints += 50; merah++; }
  }

  const score = Math.min(100, totalPoints);
  const parts: string[] = [];
  if (kuning > 0) parts.push(`${kuning}× keluhan ringan`);
  if (merah > 0) parts.push(`${merah}× kondisi darurat`);

  return {
    score,
    note: parts.length > 0 ? `${parts.join(", ")} dalam 7 hari` : "Tidak ada keluhan berarti",
  };
}

async function computePHE(db: AppDatabase, elderlyId: string): Promise<{ score: number; note: string }> {
  const events = await db.query.escalationLogs.findMany({
    where: and(
      eq(escalationLogs.elderlyId, elderlyId),
      gte(escalationLogs.createdAt, daysAgo(30)),
      not(eq(escalationLogs.status, "cancelled"))
    ),
  });

  if (events.length === 0) {
    return { score: 0, note: "Tidak ada riwayat eskalasi dalam 30 hari" };
  }

  let totalPoints = 0;
  for (const e of events) {
    if (e.tier === 1) totalPoints += 10;
    else if (e.tier === 2) totalPoints += 25;
    else if (e.tier === 3) totalPoints += 50;
  }

  const score = Math.min(100, totalPoints);
  const tierCounts = events.reduce<Record<number, number>>((acc, e) => {
    acc[e.tier] = (acc[e.tier] ?? 0) + 1;
    return acc;
  }, {});

  const parts = Object.entries(tierCounts).map(([tier, count]) => `${count}× Tier ${tier}`);

  return {
    score,
    note: `${parts.join(", ")} dalam 30 hari terakhir`,
  };
}

async function computeM(db: AppDatabase, elderlyId: string): Promise<{ score: number; note: string }> {
  const record = await db.query.elderly.findFirst({ where: eq(elderly.id, elderlyId) });
  const meds = await db.query.elderlyMedications.findMany({
    where: and(eq(elderlyMedications.elderlyId, elderlyId), eq(elderlyMedications.isActive, true)),
  });

  const rawHistory = record?.medicalHistory ?? "";
  const diagnoses = rawHistory
    .split(/[,\n]/)
    .map((d) => d.trim())
    .filter((d) => d.length > 3);

  let diagnosisScore = 0;
  if (diagnoses.length === 1) diagnosisScore = 20;
  else if (diagnoses.length >= 2 && diagnoses.length <= 3) diagnosisScore = 50;
  else if (diagnoses.length >= 4) diagnosisScore = 80;

  const polypharmacyBonus = meds.length >= 4 ? 20 : 0;
  const score = Math.min(100, diagnosisScore + polypharmacyBonus);

  const parts: string[] = [];
  if (diagnoses.length > 0) parts.push(`${diagnoses.length} diagnosis kronis`);
  if (polypharmacyBonus > 0) parts.push(`polifarmasi (${meds.length} obat aktif)`);

  return {
    score,
    note: parts.length > 0 ? parts.join(", ") : "Tidak ada riwayat penyakit kronis tercatat",
  };
}

export async function computeWeightedRiskScore(
  db: AppDatabase,
  elderlyId: string,
  isPassive = false
): Promise<{ totalScore: number; category: RiskCategory; breakdown: RiskScoreBreakdown }> {
  const [MA, RP, SB, PHE, M] = await Promise.all([
    computeMA(db, elderlyId),
    computeRP(db, elderlyId, isPassive),
    computeSB(db, elderlyId),
    computePHE(db, elderlyId),
    computeM(db, elderlyId),
  ]);

  const totalScore = parseFloat(
    (0.25 * MA.score + 0.20 * RP.score + 0.20 * SB.score + 0.15 * PHE.score + 0.20 * M.score).toFixed(2)
  );

  return {
    totalScore,
    category: classifyRisk(totalScore),
    breakdown: { MA, RP, SB, PHE, M },
  };
}
