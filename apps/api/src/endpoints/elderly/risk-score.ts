import { z, RiskScoreResultSchema } from "@kabarin/types";
import { computeWeightedRiskScore } from "../../lib/risk-score";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";
import { generateXaiNarrative } from "../../lib/ai/risk-score-xai";

export class GetElderlyRiskScoreEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly Management"],
    summary: "Get elderly risk score with dimension breakdown",
    description:
      "Returns the weighted risk score (0–100), risk category, and 5-dimension breakdown for a single elderly.\n\n" +
      "### Multi-Role Access Control:\n" +
      "- **Cadre RT:** Accessible for all seniors in the RT territory.\n" +
      "- **Family:** Accessible exclusively for linked family members.\n" +
      "- **Volunteer:** Accessible exclusively for assigned seniors.\n\n" +
      "Score is computed on-demand from the latest DB data. The cached `riskScore` on the elderly profile is updated daily at 06:00 WIB via cron.",
    request: {
      params: z.object({ id: z.string().describe("Elderly UUID") }),
    },
    responses: {
      "200": {
        description: "Risk score with XAI breakdown",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(true), data: RiskScoreResultSchema }),
          },
        },
      },
      "403": {
        description: "Access denied",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "404": {
        description: "Elderly not found",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "cadre", "family", "volunteer", "admin");
    const db = c.get("db");
    const { id: elderlyId } = c.req.param();

    const record = await assertElderlyAccess(db, session, elderlyId);

    const isPassive = record.monitoringMode === "passive";
    const { totalScore, category, breakdown } = await computeWeightedRiskScore(db, elderlyId, isPassive);
    const xaiNarrative = await generateXaiNarrative(c.env, { elderlyName: record.name, totalScore, category, breakdown });

    return c.json({
      success: true,
      data: {
        elderlyId: record.id,
        elderlyName: record.name,
        totalScore,
        category,
        breakdown,
        xaiNarrative,
        computedAt: new Date().toISOString(),
      } satisfies import("@kabarin/types").RiskScoreResult,
    });
  }
}
