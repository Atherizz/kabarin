import type { AppDatabase } from "@kabarin/db";
import { eq, elderly } from "@kabarin/db";
import { computeWeightedRiskScore } from "../ai/risk-score";
import { generateXaiNarrative } from "../ai/risk-score-xai";

export async function processRiskScoreUpdate(db: AppDatabase): Promise<void> {
  const allElderly = await db.query.elderly.findMany({
    where: eq(elderly.verificationStatus, "verified"),
  });

  if (allElderly.length === 0) return;

  console.log(`[risk-score] Computing risk scores for ${allElderly.length} elderly...`);

  for (const person of allElderly) {
    try {
      const isPassive = person.monitoringMode === "passive";
      const { totalScore, category, breakdown } = await computeWeightedRiskScore(db, person.id, isPassive);
      const xaiNarrative = await generateXaiNarrative({
        elderlyName: person.name,
        totalScore,
        category,
        breakdown,
      });

      await db
        .update(elderly)
        .set({ riskScore: totalScore, updatedAt: new Date() })
        .where(eq(elderly.id, person.id));

      console.log(`[risk-score] ${person.name}: ${totalScore} (${category}) — updated`);

      // Prevent Azure OpenAI rate limiting between requests
      await new Promise((r) => setTimeout(r, 200));

      // XAI narrative is logged for now; dashboard endpoint serves it on-demand
      void xaiNarrative;
    } catch (err) {
      console.error(`[risk-score] Failed for ${person.name} (${person.id}):`, err);
    }
  }

  console.log("[risk-score] Daily risk score update complete.");
}
