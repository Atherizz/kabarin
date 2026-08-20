import { z, AssignVolunteerInputSchema, VolunteerAssignmentSchema } from "@kabarin/types";
import { eq, and, volunteers, elderly, elderlyVolunteers } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import crypto from "crypto";

export class AssignVolunteerEndpoint extends ApiRoute {
  schema = {
    tags: ["Volunteers"],
    summary: "Assign volunteer to elderly",
    description: "Assigns a volunteer to an elderly individual as either primary or backup caregiver. Checks max capacity limit.",
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: { "application/json": { schema: AssignVolunteerInputSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Volunteer assigned successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: VolunteerAssignmentSchema,
            }),
          },
        },
      },
      "400": {
        description: "Volunteer at maximum capacity or already assigned",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "404": {
        description: "Volunteer or elderly not found in this RT",
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

    const { id: volunteerId } = c.req.param();
    const body = await c.req.json<typeof AssignVolunteerInputSchema._type>();

    // 1. Verify volunteer belongs to RT
    const volunteerRecord = await db.query.volunteers.findFirst({
      where: and(eq(volunteers.id, volunteerId), eq(volunteers.communityUnitId, communityUnitId)),
      with: { assignedElderly: true },
    });

    if (!volunteerRecord) {
      return c.json({ success: false, error: "Relawan tidak ditemukan di RT ini" }, 404);
    }

    // 2. Check capacity
    const currentCount = volunteerRecord.assignedElderly?.length ?? 0;
    if (currentCount >= volunteerRecord.maxCapacity) {
      return c.json(
        { success: false, error: `Relawan ini sudah mencapai batas kapasitas maksimal (${volunteerRecord.maxCapacity} lansia)` },
        400
      );
    }

    // 3. Verify elderly belongs to RT
    const elderlyRecord = await db.query.elderly.findFirst({
      where: and(eq(elderly.id, body.elderlyId), eq(elderly.communityUnitId, communityUnitId)),
    });

    if (!elderlyRecord) {
      return c.json({ success: false, error: "Data lansia tidak ditemukan di RT ini" }, 404);
    }

    // 4. Check if already assigned
    const existingAssignment = await db.query.elderlyVolunteers.findFirst({
      where: and(
        eq(elderlyVolunteers.elderlyId, body.elderlyId),
        eq(elderlyVolunteers.volunteerId, volunteerId)
      ),
    });

    if (existingAssignment) {
      return c.json({ success: false, error: "Relawan ini sudah ditugaskan ke lansia ini" }, 400);
    }

    // 5. Insert assignment
    const assignmentId = crypto.randomUUID();
    const [newAssignment] = await db
      .insert(elderlyVolunteers)
      .values({
        id: assignmentId,
        elderlyId: body.elderlyId,
        volunteerId,
        isPrimary: body.isPrimary ?? true,
      })
      .returning();

    return c.json({
      success: true,
      data: {
        ...newAssignment,
        assignedAt: newAssignment.assignedAt.toISOString(),
      },
    });
  }
}
