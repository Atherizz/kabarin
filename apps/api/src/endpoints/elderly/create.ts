import { z, CreateElderlyInputSchema, ElderlySchema } from "@kabarin/types";
import { elderly, elderlyMedications, elderlyFamily, elderlyVolunteers } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { generateAccessToken } from "../../lib/token";

export class CreateElderlyEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly"],
    summary: "Register new elderly",
    description: "Registers a new elderly individual in the cadre's RT. Can optionally include medication schedules, family contacts (with auto-generated status page tokens), and a primary volunteer assignment.",
    request: {
      body: {
        content: { "application/json": { schema: CreateElderlyInputSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Elderly registered successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: ElderlySchema,
            }),
          },
        },
      },
      "403": {
        description: "User is not associated with an RT",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const db = c.get("db");
    const session = c.get("session")!;
    const communityUnitId = session.user.communityUnitId;

    if (!communityUnitId) {
      return c.json({ success: false, error: "Akun Anda belum terhubung ke wilayah RT" }, 403);
    }

    const body = await c.req.json<typeof CreateElderlyInputSchema._type>();
    const elderlyId = crypto.randomUUID();

    // 1. Insert elderly record
    const [newElderly] = await db
      .insert(elderly)
      .values({
        id: elderlyId,
        communityUnitId,
        name: body.name,
        phone: body.phone ?? null,
        age: body.age,
        gender: body.gender,
        address: body.address,
        rt: body.rt,
        rw: body.rw,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        mobilityStatus: body.mobilityStatus,
        monitoringMode: body.monitoringMode,
        currentStatus: "green",
        riskScore: 0,
        medicalHistory: body.medicalHistory ?? null,
        preferredCheckinTime: body.preferredCheckinTime,
        notes: body.notes ?? null,
        createdBy: session.user.id,
      })
      .returning();

    // 2. Insert medications if provided
    let createdMedications: any[] = [];
    if (body.medications && body.medications.length > 0) {
      const medRows = body.medications.map((m) => ({
        id: crypto.randomUUID(),
        elderlyId,
        conditionName: m.conditionName,
        medicationName: m.medicationName,
        dosage: m.dosage,
        frequency: m.frequency,
        timeOfDay: m.timeOfDay,
        timingInstruction: m.timingInstruction,
        reminderTime: m.reminderTime,
        notes: m.notes ?? null,
        isActive: m.isActive ?? true,
      }));
      createdMedications = await db.insert(elderlyMedications).values(medRows).returning();
    }

    // 3. Insert family members if provided (generate unique access token for each)
    let createdFamily: any[] = [];
    if (body.family && body.family.length > 0) {
      const familyRows = body.family.map((f) => ({
        id: crypto.randomUUID(),
        elderlyId,
        name: f.name,
        phone: f.phone,
        relationship: f.relationship,
        isPrimaryContact: f.isPrimaryContact ?? false,
        accessToken: generateAccessToken(),
        notifyViaWhatsapp: f.notifyViaWhatsapp ?? true,
      }));
      createdFamily = await db.insert(elderlyFamily).values(familyRows).returning();
    }

    // 4. Assign volunteer if provided
    if (body.assignedVolunteerId) {
      await db.insert(elderlyVolunteers).values({
        id: crypto.randomUUID(),
        elderlyId,
        volunteerId: body.assignedVolunteerId,
        isPrimary: true,
      });
    }

    return c.json({
      success: true,
      data: {
        ...newElderly,
        createdAt: newElderly.createdAt.toISOString(),
        updatedAt: newElderly.updatedAt.toISOString(),
        medications: createdMedications.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })),
        familyMembers: createdFamily.map((f) => ({
          ...f,
          createdAt: f.createdAt.toISOString(),
          updatedAt: f.updatedAt.toISOString(),
        })),
      },
    });
  }
}
