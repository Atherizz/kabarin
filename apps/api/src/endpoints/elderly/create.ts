import { z, CreateElderlyInputSchema, ElderlySchema } from "@kabarin/types";
import { eq, and, elderly, elderlyMedications, elderlyFamily, elderlyVolunteers, volunteers } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { generateAccessToken } from "../../lib/token";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class CreateElderlyEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly Management"],
    summary: "Register new elderly (Cadre Top-Down)",
    description:
      "Registers a new elderly individual living in the cadre's RT (Surface 1: Dashboard Kader). " +
      "Auto-inherits the cadre's RT territory, immediately sets status to verified, " +
      "saves family contacts for automated WhatsApp updates, and assigns primary/secondary caregiving volunteers.",
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
    const session = assertRole(c, "cadre", "admin");
    const communityUnitId = assertCommunity(session);
    const db = c.get("db");

    const body = await c.req.json<typeof CreateElderlyInputSchema._type>();
    const elderlyId = crypto.randomUUID();

    // 1. Insert elderly record (Cadre top-down registration is immediately verified)
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
        verificationStatus: "verified",
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
        userId: null,
        name: f.name,
        phone: f.phone,
        relationship: f.relationship,
        isPrimaryContact: f.isPrimaryContact ?? false,
        accessToken: generateAccessToken(),
        notifyViaWhatsapp: f.notifyViaWhatsapp ?? true,
      }));
      createdFamily = await db.insert(elderlyFamily).values(familyRows).returning();
    }

    // 4. Assign primary volunteer if provided
    const primaryVolunteerId = body.primaryVolunteerId ?? body.assignedVolunteerId;
    if (primaryVolunteerId) {
      const vol = await db.query.volunteers.findFirst({
        where: and(
          eq(volunteers.id, primaryVolunteerId),
          eq(volunteers.communityUnitId, communityUnitId)
        ),
      });

      if (!vol) {
        return c.json(
          {
            success: false,
            error: `Relawan utama dengan ID '${primaryVolunteerId}' tidak ditemukan di RT ini`,
          },
          404
        );
      }

      await db.insert(elderlyVolunteers).values({
        id: crypto.randomUUID(),
        elderlyId,
        volunteerId: primaryVolunteerId,
        isPrimary: true,
      });
    }

    // 5. Assign secondary volunteer if provided
    if (body.secondaryVolunteerId && body.secondaryVolunteerId !== primaryVolunteerId) {
      const secVol = await db.query.volunteers.findFirst({
        where: and(
          eq(volunteers.id, body.secondaryVolunteerId),
          eq(volunteers.communityUnitId, communityUnitId)
        ),
      });

      if (!secVol) {
        return c.json(
          {
            success: false,
            error: `Relawan cadangan dengan ID '${body.secondaryVolunteerId}' tidak ditemukan di RT ini`,
          },
          404
        );
      }

      await db.insert(elderlyVolunteers).values({
        id: crypto.randomUUID(),
        elderlyId,
        volunteerId: body.secondaryVolunteerId,
        isPrimary: false,
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
