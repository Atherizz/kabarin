import { z, CreateMedicationInputSchema, ElderlyMedicationSchema } from "@kabarin/types";
import { eq, and, elderlyMedications } from "@kabarin/db";
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
        description: "Medication schedule added successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: ElderlyMedicationSchema,
            }),
          },
        },
      },
      "409": {
        description: "Duplicate active medication schedule already exists",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "403": {
        description: "Forbidden: Not permitted to manage this elderly",
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
    const session = assertRole(c, "cadre", "family", "admin");
    const db = c.get("db");

    const { id: elderlyId } = c.req.param();
    const body = await c.req.json<typeof CreateMedicationInputSchema._type>();

    // 1. Verify access to elderly (admin / cadre of same RT / registered family)
    await assertElderlyAccess(db, session, elderlyId);

    // 2. Prevent duplicate active medication schedule with same name & timing
    const existingMed = await db.query.elderlyMedications.findFirst({
      where: and(
        eq(elderlyMedications.elderlyId, elderlyId),
        eq(elderlyMedications.medicationName, body.medicationName),
        eq(elderlyMedications.timeOfDay, body.timeOfDay),
        eq(elderlyMedications.isActive, true)
      ),
    });

    if (existingMed) {
      return c.json(
        {
          success: false,
          error: `Jadwal obat '${body.medicationName}' untuk waktu minum ${body.timeOfDay} sudah terdaftar dan masih aktif`,
        },
        409
      );
    }

    // 3. Insert medication record
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
