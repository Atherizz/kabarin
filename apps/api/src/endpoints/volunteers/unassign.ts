import { z } from "@kabarin/types";
import { eq, and, volunteers, elderlyVolunteers } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";

export class UnassignVolunteerEndpoint extends ApiRoute {
  schema = {
    tags: ["Volunteers"],
    summary: "Unassign volunteer from elderly",
    description: "Removes caregiving assignment between a volunteer and an elderly individual.",
    request: {
      params: z.object({
        id: z.string(),
        elderlyId: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "Assignment removed",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.object({
                volunteerId: z.string(),
                elderlyId: z.string(),
              }),
            }),
          },
        },
      },
      "404": {
        description: "Volunteer or assignment not found in this RT",
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

    const { id: volunteerId, elderlyId } = c.req.param();

    // Verify volunteer belongs to RT
    const volunteerRecord = await db.query.volunteers.findFirst({
      where: and(eq(volunteers.id, volunteerId), eq(volunteers.communityUnitId, communityUnitId)),
    });

    if (!volunteerRecord) {
      return c.json({ success: false, error: "Relawan tidak ditemukan di RT ini" }, 404);
    }

    const existingAssignment = await db.query.elderlyVolunteers.findFirst({
      where: and(
        eq(elderlyVolunteers.elderlyId, elderlyId),
        eq(elderlyVolunteers.volunteerId, volunteerId)
      ),
    });

    if (!existingAssignment) {
      return c.json({ success: false, error: "Penugasan relawan tidak ditemukan" }, 404);
    }

    await db
      .delete(elderlyVolunteers)
      .where(
        and(
          eq(elderlyVolunteers.elderlyId, elderlyId),
          eq(elderlyVolunteers.volunteerId, volunteerId)
        )
      );

    return c.json({
      success: true,
      data: {
        volunteerId,
        elderlyId,
      },
    });
  }
}
