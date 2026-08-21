import { z } from "@kabarin/types";
import { eq, and, elderly, elderlyMedications } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class DeleteMedicationEndpoint extends ApiRoute {
  schema = {
    tags: ["Medications"],
    summary: "Delete medication schedule",
    description: "Permanently deletes a medication schedule from an elderly profile.",
    request: {
      params: z.object({
        id: z.string(),
        medId: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "Medication schedule deleted",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.object({ id: z.string() }),
            }),
          },
        },
      },
      "404": {
        description: "Elderly or medication not found in this RT",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "cadre", "admin");
    const communityUnitId = assertCommunity(session);
    const db = c.get("db");

    const { id: elderlyId, medId } = c.req.param();

    // 1. Verify elderly belongs to the cadre's RT
    const elderlyRecord = await db.query.elderly.findFirst({
      where: and(eq(elderly.id, elderlyId), eq(elderly.communityUnitId, communityUnitId)),
    });

    if (!elderlyRecord) {
      return c.json({ success: false, error: "Data lansia tidak ditemukan di RT ini" }, 404);
    }

    // 2. Verify medication exists for this elderly
    const existingMed = await db.query.elderlyMedications.findFirst({
      where: and(
        eq(elderlyMedications.id, medId),
        eq(elderlyMedications.elderlyId, elderlyId)
      ),
    });

    if (!existingMed) {
      return c.json({ success: false, error: "Jadwal obat tidak ditemukan" }, 404);
    }

    // 3. Delete medication record
    await db
      .delete(elderlyMedications)
      .where(and(eq(elderlyMedications.id, medId), eq(elderlyMedications.elderlyId, elderlyId)));

    return c.json({
      success: true,
      data: { id: medId },
    });
  }
}
