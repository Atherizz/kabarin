import { z, UpdateMedicationInputSchema, ElderlyMedicationSchema } from "@kabarin/types";
import { eq, and, elderlyMedications } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";
import { refreshElderlyChecklist } from "../../lib/ai/checklist-service";

export class UpdateMedicationEndpoint extends ApiRoute {
  schema = {
    tags: ["Medication Schedules"],
    summary: "Update medication schedule",
    description:
      "Updates dosage, timing, or active status of a medication schedule (accessible by RT Cadre, registered Family, or Admin).",
    request: {
      params: z.object({
        id: z.string(),
        medId: z.string(),
      }),
      body: {
        content: { "application/json": { schema: UpdateMedicationInputSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Medication schedule updated",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: ElderlyMedicationSchema,
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
    const body = await c.req.json<typeof UpdateMedicationInputSchema._type>();

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

    // 3. Update medication record
    const [updated] = await db
      .update(elderlyMedications)
      .set({
        ...(body.conditionName !== undefined && { conditionName: body.conditionName }),
        ...(body.medicationName !== undefined && { medicationName: body.medicationName }),
        ...(body.dosage !== undefined && { dosage: body.dosage }),
        ...(body.frequency !== undefined && { frequency: body.frequency }),
        ...(body.timeOfDay !== undefined && { timeOfDay: body.timeOfDay }),
        ...(body.timingInstruction !== undefined && { timingInstruction: body.timingInstruction }),
        ...(body.reminderTime !== undefined && { reminderTime: body.reminderTime }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        updatedAt: new Date(),
      })
      .where(and(eq(elderlyMedications.id, medId), eq(elderlyMedications.elderlyId, elderlyId)))
      .returning();

    // Regenerate elderly checklist in background — medication change affects AI questions
    c.executionCtx.waitUntil(
      refreshElderlyChecklist(db, c.env, elderlyId).catch(() => {})
    );

    return c.json({
      success: true,
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  }
}
