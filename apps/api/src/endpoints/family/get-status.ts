import { z, FamilyPublicStatusSchema } from "@kabarin/types";
import { eq, elderlyFamily, elderly, communityUnits, elderlyMedications, elderlyVolunteers } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";

export class GetFamilyStatusEndpoint extends ApiRoute {
  schema = {
    tags: ["Family"],
    summary: "Get elderly welfare status via family token (Zero-Login)",
    description: "Public endpoint. Allows family members to view their elderly relative's real-time traffic-light welfare status, active medications, and assigned volunteer contact without logging in.",
    request: {
      params: z.object({
        token: z.string().length(64),
      }),
    },
    responses: {
      "200": {
        description: "Elderly welfare status and care details",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: FamilyPublicStatusSchema,
            }),
          },
        },
      },
      "404": {
        description: "Invalid or expired access token",
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

    // 1. Resolve family member by access token
    const familyMember = await db.query.elderlyFamily.findFirst({
      where: eq(elderlyFamily.accessToken, token),
      with: {
        elderly: {
          with: {
            communityUnit: true,
            medications: {
              where: eq(elderlyMedications.isActive, true),
            },
            volunteerAssignments: {
              where: eq(elderlyVolunteers.isPrimary, true),
              with: {
                volunteer: true,
              },
            },
          },
        },
      },
    });

    if (!familyMember || !familyMember.elderly) {
      return c.json({ success: false, error: "Link status keluarga tidak valid atau sudah kedaluwarsa" }, 404);
    }

    const elderlyData = familyMember.elderly;
    const communityData = elderlyData.communityUnit;
    const primaryVolunteerAssignment = elderlyData.volunteerAssignments?.[0];
    const volunteerData = primaryVolunteerAssignment?.volunteer;

    return c.json({
      success: true,
      data: {
        elderly: {
          name: elderlyData.name,
          age: elderlyData.age,
          currentStatus: elderlyData.currentStatus,
          mobilityStatus: elderlyData.mobilityStatus,
          rt: elderlyData.rt,
          rw: elderlyData.rw,
          preferredCheckinTime: elderlyData.preferredCheckinTime,
          updatedAt: elderlyData.updatedAt.toISOString(),
        },
        familyMember: {
          name: familyMember.name,
          relationship: familyMember.relationship,
        },
        community: {
          name: communityData.name,
          healthFacilityName: communityData.healthFacilityName ?? null,
          healthFacilityPhone: communityData.healthFacilityPhone ?? null,
          ambulancePhone: communityData.ambulancePhone ?? null,
        },
        medications: (elderlyData.medications ?? []).map((m) => ({
          id: m.id,
          conditionName: m.conditionName,
          medicationName: m.medicationName,
          dosage: m.dosage,
          frequency: m.frequency,
          reminderTime: m.reminderTime,
          timingInstruction: m.timingInstruction,
          isActive: m.isActive,
        })),
        assignedVolunteer: volunteerData
          ? {
              name: volunteerData.name,
              phone: volunteerData.phone,
            }
          : null,
      },
    });
  }
}
