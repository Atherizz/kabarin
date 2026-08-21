import { z } from "@kabarin/types";
import { eq, and, elderlyMedications } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";

export class DeleteMedicationEndpoint extends ApiRoute {
  schema = {
    tags: ["Medication Schedules"],
    summary: "Delete medication schedule",
    description:
      "Permanently deletes a medication schedule from an elderly profile (accessible by RT Cadre, registered Family, or Admin).",
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
        description: "Elderly or medication not found, or access denied",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "cadre", "family", "admin");
    const db = c.get("db");

    const { id: elderlyId, medId } = c.req.param();

    // 1. Verify access to elderly (admin / cadre of same RT / registered family)
    await assertElderlyAccess(db, session, elderlyId);

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
