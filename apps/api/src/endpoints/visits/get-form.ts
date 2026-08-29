import { z, VisitPublicFormSchema } from "@kabarin/types";
import { eq, volunteerVisits, elderlyMedications } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";

export class GetVisitFormEndpoint extends ApiRoute {
  schema = {
    tags: ["Public Field Reports (Zero-Login)"],
    summary: "Get field visit form for volunteer (Zero-Login via WhatsApp link)",
    description:
      "Public zero-login endpoint accessible via the volunteer's unique WhatsApp visit link (`/lapor/:token`). " +
      "Provides field caregivers with vital senior profile details, GPS coordinates, visit instructions, and daily medication checklist.",
    request: {
      params: z.object({
        token: z.string().describe("Unique 64-character visit form token from WhatsApp alert link"),
      }),
    },
    responses: {
      "200": {
        description: "Visit form and senior profile details",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: VisitPublicFormSchema,
            }),
          },
        },
      },
      "404": {
        description: "Invalid or non-existent visit form token",
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
    const { token } = c.req.param();

    const visit = await db.query.volunteerVisits.findFirst({
      where: eq(volunteerVisits.formToken, token),
      with: {
        elderly: true,
        volunteer: true,
        communityUnit: true,
      },
    });

    if (!visit || !visit.elderly) {
      return c.json(
        { success: false, error: "Link form kunjungan tidak valid atau sudah tidak tersedia." },
        404
      );
    }

    if (new Date() > visit.tokenExpiresAt || visit.status === "expired") {
      return c.json(
        { success: false, error: "Link form kunjungan ini sudah kedaluwarsa (hanya berlaku 24 jam)." },
        410
      );
    }

    // Fetch active medications for checklist
    const meds = await db.query.elderlyMedications.findMany({
      where: eq(elderlyMedications.elderlyId, visit.elderly.id),
    });

    const e = visit.elderly;
    const v = visit.volunteer;
    const comm = visit.communityUnit;

    return c.json({
      success: true,
      data: {
        visit: {
          id: visit.id,
          visitType: visit.visitType,
          status: visit.status,
          tokenExpiresAt: visit.tokenExpiresAt.toISOString(),
          notes: visit.volunteerNotes,
          guidedChecklist: visit.guidedChecklist ?? null,
        },
        elderly: {
          id: e.id,
          name: e.name,
          age: e.age,
          gender: e.gender,
          address: e.address,
          rt: e.rt,
          rw: e.rw,
          latitude: e.latitude,
          longitude: e.longitude,
          mobilityStatus: e.mobilityStatus,
          medicalHistory: e.medicalHistory,
          preferredCheckinTime: e.preferredCheckinTime,
        },
        volunteer: v
          ? {
              id: v.id,
              name: v.name,
              phone: v.phone,
            }
          : null,
        medications: meds.map((m) => ({
          id: m.id,
          conditionName: m.conditionName,
          medicationName: m.medicationName,
          dosage: m.dosage,
          frequency: m.frequency,
          reminderTime: m.reminderTime,
          timingInstruction: m.timingInstruction,
          isActive: m.isActive,
        })),
        community: {
          id: comm?.id ?? e.communityUnitId,
          name: comm?.name ?? `RT ${e.rt} / RW ${e.rw}`,
          healthFacilityPhone: comm?.healthFacilityPhone ?? null,
          ambulancePhone: comm?.ambulancePhone ?? null,
        },
      },
    });
  }
}
