import { z, VolunteerMeAssignmentsResponseSchema } from "@kabarin/types";
import { eq, and, volunteers, elderlyVolunteers, volunteerVisits } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";

export class GetVolunteerMeAssignmentsEndpoint extends ApiRoute {
  schema = {
    tags: ["Volunteer Portal"],
    summary: "Get assigned elderly for authenticated volunteer",
    description:
      "Returns the list of elderly individuals assigned to the currently authenticated volunteer, " +
      "along with the volunteer profile and pending visits count.",
    responses: {
      "200": {
        description: "Volunteer assignments retrieved successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: VolunteerMeAssignmentsResponseSchema,
            }),
          },
        },
      },
      "404": {
        description: "Volunteer profile not found for this account",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "volunteer", "admin");
    const db = c.get("db");
    const userId = session.user.id;

    // 1. Find volunteer profile linked to this user account
    const volunteerRecord = await db.query.volunteers.findFirst({
      where: eq(volunteers.userId, userId),
    });

    if (!volunteerRecord) {
      return c.json(
        { success: false, error: "Profil relawan tidak ditemukan untuk akun ini" },
        404
      );
    }

    // 2. Fetch assigned elderly
    const assignmentRecords = await db.query.elderlyVolunteers.findMany({
      where: eq(elderlyVolunteers.volunteerId, volunteerRecord.id),
      with: {
        elderly: true,
      },
    });

    // 3. Fetch count of pending visits
    const pendingVisits = await db.query.volunteerVisits.findMany({
      where: and(
        eq(volunteerVisits.volunteerId, volunteerRecord.id),
        eq(volunteerVisits.status, "pending")
      ),
    });

    const assignments = assignmentRecords.map((a) => ({
      id: a.id,
      elderlyId: a.elderlyId,
      volunteerId: a.volunteerId,
      isPrimary: a.isPrimary,
      assignedAt: a.assignedAt.toISOString(),
      elderly: {
        id: a.elderly.id,
        name: a.elderly.name,
        phone: a.elderly.phone ?? null,
        age: a.elderly.age,
        gender: a.elderly.gender,
        address: a.elderly.address,
        rt: a.elderly.rt,
        rw: a.elderly.rw,
        latitude: a.elderly.latitude ?? null,
        longitude: a.elderly.longitude ?? null,
        mobilityStatus: a.elderly.mobilityStatus,
        monitoringMode: a.elderly.monitoringMode,
        currentStatus: a.elderly.currentStatus,
        preferredCheckinTime: a.elderly.preferredCheckinTime,
        medicalHistory: a.elderly.medicalHistory ?? null,
        notes: a.elderly.notes ?? null,
      },
    }));

    return c.json({
      success: true,
      data: {
        volunteer: {
          id: volunteerRecord.id,
          communityUnitId: volunteerRecord.communityUnitId,
          userId: volunteerRecord.userId ?? null,
          name: volunteerRecord.name,
          phone: volunteerRecord.phone,
          address: volunteerRecord.address,
          rt: volunteerRecord.rt,
          rw: volunteerRecord.rw,
          latitude: volunteerRecord.latitude ?? null,
          longitude: volunteerRecord.longitude ?? null,
          maxCapacity: volunteerRecord.maxCapacity,
          isActive: volunteerRecord.isActive,
          assignedElderlyCount: assignments.length,
          createdAt: volunteerRecord.createdAt.toISOString(),
          updatedAt: volunteerRecord.updatedAt.toISOString(),
        },
        assignments,
        pendingVisitsCount: pendingVisits.length,
      },
    });
  }
}
