import { z, CreateElderlyInputSchema, ElderlySchema } from "@kabarin/types";
import {
  eq,
  and,
  elderly,
  elderlyMedications,
  elderlyFamily,
  elderlyVolunteers,
  volunteers,
} from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { generateAccessToken } from "../../lib/token";
import { assertRole, assertCommunity } from "../../lib/auth-guard";
import { refreshElderlyChecklist } from "../../lib/ai/checklist-service";
import { triggerBotWebhook } from "../../lib/bot-webhook";
import crypto from "crypto";

export class CreateElderlyEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly Management"],
    summary: "Register an elderly individual (Top-Down Onboarding by Cadre)",
    description:
      "Registers a new elderly individual directly by Cadre RT.\n\n" +
      "### Automated Processing:\n" +
      "- Status is immediately marked as **VERIFIED** (`'verified'`).\n" +
      "- Generates 64-character access tokens for family contacts.\n" +
      "- Pre-validates volunteer assignments and capacity limits before committing records.",
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
      "400": {
        description: "Volunteer inactive or reached max capacity limit",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "404": {
        description: "Volunteer not found in this RT",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "409": {
        description: "Elderly with this phone number already registered in this RT",
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

    // 1. Pre-Validation: Prevent duplicate elderly phone in same RT
    if (body.phone) {
      const existingPhone = await db.query.elderly.findFirst({
        where: and(
          eq(elderly.communityUnitId, communityUnitId),
          eq(elderly.phone, body.phone)
        ),
      });

      if (existingPhone) {
        return c.json(
          {
            success: false,
            error: `Lansia dengan nomor WhatsApp ${body.phone} sudah terdaftar di RT ini (${existingPhone.name})`,
          },
          409
        );
      }
    }

    // 2. Pre-Validation: Validate Primary Volunteer if provided
    const primaryVolunteerId = body.primaryVolunteerId ?? body.assignedVolunteerId;
    let primaryVolRecord: any = null;
    if (primaryVolunteerId) {
      primaryVolRecord = await db.query.volunteers.findFirst({
        where: and(
          eq(volunteers.id, primaryVolunteerId),
          eq(volunteers.communityUnitId, communityUnitId)
        ),
        with: { assignedElderly: true },
      });

      if (!primaryVolRecord) {
        return c.json(
          {
            success: false,
            error: `Relawan utama dengan ID '${primaryVolunteerId}' tidak ditemukan di RT ini`,
          },
          404
        );
      }

      if (!primaryVolRecord.isActive) {
        return c.json(
          {
            success: false,
            error: `Relawan utama '${primaryVolRecord.name}' berstatus non-aktif`,
          },
          400
        );
      }

      const currentCount = primaryVolRecord.assignedElderly?.length ?? 0;
      if (currentCount >= primaryVolRecord.maxCapacity) {
        return c.json(
          {
            success: false,
            error: `Relawan utama '${primaryVolRecord.name}' sudah mencapai batas kapasitas maksimal (${primaryVolRecord.maxCapacity} lansia)`,
          },
          400
        );
      }
    }

    // 3. Pre-Validation: Validate Secondary Volunteer if provided
    let secondaryVolRecord: any = null;
    if (body.secondaryVolunteerId && body.secondaryVolunteerId !== primaryVolunteerId) {
      secondaryVolRecord = await db.query.volunteers.findFirst({
        where: and(
          eq(volunteers.id, body.secondaryVolunteerId),
          eq(volunteers.communityUnitId, communityUnitId)
        ),
        with: { assignedElderly: true },
      });

      if (!secondaryVolRecord) {
        return c.json(
          {
            success: false,
            error: `Relawan cadangan dengan ID '${body.secondaryVolunteerId}' tidak ditemukan di RT ini`,
          },
          404
        );
      }

      if (!secondaryVolRecord.isActive) {
        return c.json(
          {
            success: false,
            error: `Relawan cadangan '${secondaryVolRecord.name}' berstatus non-aktif`,
          },
          400
        );
      }

      const currentSecCount = secondaryVolRecord.assignedElderly?.length ?? 0;
      if (currentSecCount >= secondaryVolRecord.maxCapacity) {
        return c.json(
          {
            success: false,
            error: `Relawan cadangan '${secondaryVolRecord.name}' sudah mencapai batas kapasitas maksimal (${secondaryVolRecord.maxCapacity} lansia)`,
          },
          400
        );
      }
    }

    // 4. NOW safe to commit: Insert elderly record
    const elderlyId = crypto.randomUUID();
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

    // 5. Insert medications if provided
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

    // 6. Insert family members if provided
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

    // 7. Insert volunteer assignments
    const volunteerAssignments: any[] = [];
    if (primaryVolunteerId && primaryVolRecord) {
      const [pAssign] = await db
        .insert(elderlyVolunteers)
        .values({
          id: crypto.randomUUID(),
          elderlyId,
          volunteerId: primaryVolunteerId,
          isPrimary: true,
        })
        .returning();
      volunteerAssignments.push({ ...pAssign, volunteer: primaryVolRecord });
    }

    if (body.secondaryVolunteerId && secondaryVolRecord) {
      const [sAssign] = await db
        .insert(elderlyVolunteers)
        .values({
          id: crypto.randomUUID(),
          elderlyId,
          volunteerId: body.secondaryVolunteerId,
          isPrimary: false,
        })
        .returning();
      volunteerAssignments.push({ ...sAssign, volunteer: secondaryVolRecord });
    }

    // Generate AI observational checklist in background — does not block response
    c.executionCtx.waitUntil(
      refreshElderlyChecklist(db, c.env, elderlyId).catch(() => {})
    );

    triggerBotWebhook(c, {
      event: "elderly-onboarded",
      payload: {
        elderlyId,
        elderlyName: newElderly.name,
        elderlyPhone: newElderly.phone ?? undefined,
        rt: newElderly.rt,
        rw: newElderly.rw,
        communityUnitId: newElderly.communityUnitId,
        familyContacts: createdFamily.map((f) => ({
          name: f.name,
          phone: f.phone,
          accessToken: f.accessToken,
        })),
        volunteerAssignments: volunteerAssignments.map((v) => ({
          name: v.volunteer.name,
          phone: v.volunteer.phone,
        })),
      },
    });

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
        volunteerAssignments: volunteerAssignments.map((v) => ({
          id: v.id,
          elderlyId: v.elderlyId,
          volunteerId: v.volunteerId,
          isPrimary: v.isPrimary,
          assignedAt: v.assignedAt ? v.assignedAt.toISOString() : new Date().toISOString(),
          volunteer: v.volunteer
            ? {
                id: v.volunteer.id,
                communityUnitId: v.volunteer.communityUnitId,
                userId: v.volunteer.userId ?? null,
                name: v.volunteer.name,
                phone: v.volunteer.phone,
                address: v.volunteer.address,
                rt: v.volunteer.rt,
                rw: v.volunteer.rw,
                latitude: v.volunteer.latitude ?? null,
                longitude: v.volunteer.longitude ?? null,
                maxCapacity: v.volunteer.maxCapacity,
                isActive: v.volunteer.isActive,
                createdAt: v.volunteer.createdAt.toISOString(),
                updatedAt: v.volunteer.updatedAt.toISOString(),
              }
            : undefined,
        })),
      },
    });
  }
}
