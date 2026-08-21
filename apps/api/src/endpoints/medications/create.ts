import { z, CreateMedicationInputSchema, ElderlyMedicationSchema } from "@kabarin/types";
import { eq, and, elderly, elderlyMedications } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";
import crypto from "crypto";

export class CreateMedicationEndpoint extends ApiRoute {
  schema = {
    tags: ["Medications"],
    summary: "Add medication schedule for an elderly",
    description: "Adds a new medication schedule to an elderly profile (manual entry or from Smart OCR extraction).",
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: { "application/json": { schema: CreateMedicationInputSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Medication schedule created",
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
        description: "Elderly not found in this RT",
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

    const { id: elderlyId } = c.req.param();
    const body = await c.req.json<typeof CreateMedicationInputSchema._type>();

    // 1. Verify elderly belongs to the cadre's RT
    const elderlyRecord = await db.query.elderly.findFirst({
      where: and(eq(elderly.id, elderlyId), eq(elderly.communityUnitId, communityUnitId)),
    });

    if (!elderlyRecord) {
      return c.json({ success: false, error: "Data lansia tidak ditemukan di RT ini" }, 404);
    }

    // 2. Insert medication record
    const medicationId = crypto.randomUUID();
    const [newMedication] = await db
      .insert(elderlyMedications)
      .values({
        id: medicationId,
        elderlyId,
        conditionName: body.conditionName,
        medicationName: body.medicationName,
        dosage: body.dosage,
        frequency: body.frequency,
        timeOfDay: body.timeOfDay,
        timingInstruction: body.timingInstruction,
        reminderTime: body.reminderTime,
        notes: body.notes ?? null,
        isActive: body.isActive ?? true,
      })
      .returning();

    return c.json({
      success: true,
      data: {
        ...newMedication,
        createdAt: newMedication.createdAt.toISOString(),
        updatedAt: newMedication.updatedAt.toISOString(),
      },
    });
  }
}
