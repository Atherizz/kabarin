import { z, VolunteerAssignmentSchema } from "@kabarin/types";
import { eq, and, elderly, elderlyVolunteers } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";

export class ListVolunteersByElderlyEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly"],
    summary: "List assigned volunteers for an elderly",
    description: "Returns primary and backup volunteers assigned to a specific elderly in the cadre's RT.",
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "List of assigned volunteers",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(VolunteerAssignmentSchema),
            }),
          },
        },
      },
      "404": {
        description: "Elderly not found in this RT",
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

    const { id: elderlyId } = c.req.param();

    const elderlyRecord = await db.query.elderly.findFirst({
      where: and(eq(elderly.id, elderlyId), eq(elderly.communityUnitId, communityUnitId)),
    });

    if (!elderlyRecord) {
      return c.json({ success: false, error: "Data lansia tidak ditemukan di RT ini" }, 404);
    }

    const assignments = await db.query.elderlyVolunteers.findMany({
      where: eq(elderlyVolunteers.elderlyId, elderlyId),
      with: {
        volunteer: true,
      },
    });

    const data = assignments.map((a) => ({
      id: a.id,
      elderlyId: a.elderlyId,
      volunteerId: a.volunteerId,
      isPrimary: a.isPrimary,
      assignedAt: a.assignedAt.toISOString(),
      volunteer: a.volunteer
        ? {
            id: a.volunteer.id,
            communityUnitId: a.volunteer.communityUnitId,
            userId: a.volunteer.userId ?? null,
            name: a.volunteer.name,
            phone: a.volunteer.phone,
            address: a.volunteer.address,
            rt: a.volunteer.rt,
            rw: a.volunteer.rw,
            latitude: a.volunteer.latitude ?? null,
            longitude: a.volunteer.longitude ?? null,
            maxCapacity: a.volunteer.maxCapacity,
            isActive: a.volunteer.isActive,
            createdAt: a.volunteer.createdAt.toISOString(),
            updatedAt: a.volunteer.updatedAt.toISOString(),
          }
        : undefined,
    }));

    return c.json({ success: true, data });
  }
}
