import { z, CreateMedicationInputSchema, ElderlyMedicationSchema } from "@kabarin/types";
import { eq, elderlyMedications } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";
import crypto from "crypto";

export class CreateMedicationEndpoint extends ApiRoute {
  schema = {
    tags: ["Medication Schedules"],
    summary: "Add medication schedule for an elderly",
    description:
      "Adds a new medication schedule to an elderly profile (accessible by RT Cadre, registered Family, or Admin).",
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
        description: "Elderly not found or access denied",
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

    const { id: elderlyId } = c.req.param();
    const body = await c.req.json<typeof CreateMedicationInputSchema._type>();

    // 1. Verify access to elderly (admin / cadre of same RT / registered family)
    await assertElderlyAccess(db, session, elderlyId);

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
