import { z, CreateElderlyByFamilyInputSchema, ElderlySchema } from "@kabarin/types";
import { eq, or, and, elderly, elderlyMedications, elderlyFamily, communityUnits, user } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { generateAccessToken } from "../../lib/token";
import { assertRole } from "../../lib/auth-guard";
import { refreshElderlyChecklist } from "../../lib/ai/checklist-service";
import { triggerBotWebhook } from "../../lib/bot-webhook";

export class CreateElderlyByFamilyEndpoint extends ApiRoute {
  schema = {
    tags: ["Family Portal"],
    summary: "Register elderly parent (Family Bottom-Up)",
    description:
      "Allows an authenticated family member (Surface 3: Family Portal) to register their elderly parent.\n\n" +
      "### 📍 RT Territory Determination (`communityUnitId`):\n" +
      "- **Optional:** By default, the system automatically inherits the RT community unit chosen by the family member during account registration (`session.user.communityUnitId`).\n" +
      "- **Territory Override:** If registering a relative or in-law living in a different RT, supply `communityUnitId` (supports both UUID or composite code like `'3573051007-RW10-RT01'`).\n\n" +
      "### 🛡️ Automated Features:\n" +
      "- The authenticated family user is automatically linked as the primary emergency contact (`isPrimaryContact: true`) with a dedicated WhatsApp status page access token.\n" +
      "- Daily WhatsApp greetings and medication reminders activate immediately on Day 1 (status: `pending_verification` awaiting RT cadre verification for physical volunteer dispatch).",
    request: {
      body: {
        content: { "application/json": { schema: CreateElderlyByFamilyInputSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Elderly registered successfully (pending RT cadre verification)",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: ElderlySchema,
            }),
          },
        },
      },
      "404": {
        description: "Target RT community unit not found",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "family", "admin");
    const db = c.get("db");
    const body = await c.req.json<typeof CreateElderlyByFamilyInputSchema._type>();

    // 1. Resolve target communityUnitId (body override or fallback to user's registered RT)
    const rawCommunityId = body.communityUnitId || session.user.communityUnitId;

    if (!rawCommunityId) {
      return c.json(
        {
          success: false,
          error: "Wilayah RT domisili orang tua belum terikat di akun Anda. Silakan sertakan field 'communityUnitId' pada request.",
        },
        400
      );
    }

    // Verify target community RT unit exists (supports both UUID id and composite code)
    const community = await db.query.communityUnits.findFirst({
      where: or(
        eq(communityUnits.id, rawCommunityId),
        eq(communityUnits.code, rawCommunityId)
      ),
    });

    if (!community) {
      return c.json(
        {
          success: false,
          error: `Wilayah RT '${rawCommunityId}' tidak ditemukan di sistem Kabarin`,
        },
        404
      );
    }

    // 1.5 Prevent duplicate elderly phone in same RT
    if (body.phone) {
      const existingPhone = await db.query.elderly.findFirst({
        where: and(
          eq(elderly.communityUnitId, community.id),
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

    const elderlyId = crypto.randomUUID();

    // 2. Insert elderly record with pending_verification status using the canonical RT UUID
    const [newElderly] = await db
      .insert(elderly)
      .values({
        id: elderlyId,
        communityUnitId: community.id,
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
        verificationStatus: "pending_verification",
        riskScore: 0,
        medicalHistory: body.medicalHistory ?? null,
        preferredCheckinTime: body.preferredCheckinTime,
        notes: body.notes ?? null,
        createdBy: session.user.id,
      })
      .returning();

    // 3. Insert medications if provided (Smart OCR / manual entry)
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

    // 4. Automatically link the authenticated family member as the Primary Contact
    const userPhone = session.user.phone || body.familyPhone;

    if (!userPhone) {
      return c.json(
        {
          success: false,
          error: "Nomor WhatsApp Anda belum terdaftar di akun. Silakan isi field 'familyPhone' agar dapat menerima kabar darurat orang tua.",
        },
        400
      );
    }

    const familyRowsToInsert: Array<{
      id: string;
      elderlyId: string;
      userId?: string | null;
      name: string;
      phone: string;
      relationship: string;
      isPrimaryContact: boolean;
      accessToken: string;
      notifyViaWhatsapp: boolean;
    }> = [
      {
        id: crypto.randomUUID(),
        elderlyId,
        userId: session.user.id,
        name: session.user.name,
        phone: userPhone,
        relationship: body.relationship || "Anak Kandung",
        isPrimaryContact: true,
        accessToken: generateAccessToken(),
        notifyViaWhatsapp: true,
      },
    ];

    // Append additional sibling / family contacts if provided
    if (body.additionalFamily && body.additionalFamily.length > 0) {
      for (const f of body.additionalFamily) {
        if (f.phone !== userPhone) {
          familyRowsToInsert.push({
            id: crypto.randomUUID(),
            elderlyId,
            userId: null,
            name: f.name,
            phone: f.phone,
            relationship: f.relationship,
            isPrimaryContact: false,
            accessToken: generateAccessToken(),
            notifyViaWhatsapp: f.notifyViaWhatsapp ?? true,
          });
        }
      }
    }

    const createdFamily = await db.insert(elderlyFamily).values(familyRowsToInsert as any).returning();

    // Generate AI observational checklist in background
    c.executionCtx.waitUntil(
      refreshElderlyChecklist(db, c.env, elderlyId).catch(() => {})
    );

    // Find Cadre of this RT for WhatsApp Alert
    const cadre = await db.query.user.findFirst({
      where: and(
        eq(user.communityUnitId, community.id),
        eq(user.role, "cadre")
      ),
    });

    triggerBotWebhook(c, {
      event: "elderly-submitted",
      payload: {
        elderlyId,
        elderlyName: newElderly.name,
        elderlyPhone: newElderly.phone ?? undefined,
        rt: newElderly.rt,
        rw: newElderly.rw,
        communityUnitId: newElderly.communityUnitId,
        submittedByFamilyName: session.user.name,
        familyContacts: createdFamily.map((f) => ({
          name: f.name,
          phone: f.phone,
          accessToken: f.accessToken,
        })),
        cadrePhone: cadre?.phone ?? undefined,
        cadreName: cadre?.name ?? undefined,
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
      },
    });
  }
}
