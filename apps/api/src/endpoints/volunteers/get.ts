import { z, VolunteerSchema } from "@kabarin/types";
import { eq, and, volunteers } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class GetVolunteerEndpoint extends ApiRoute {
  schema = {
    tags: ["Volunteers"],
    summary: "Get single volunteer details",
    description: "Returns full details of a volunteer in the cadre's RT, including their assigned elderly care list.",
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "Volunteer profile",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: VolunteerSchema,
            }),
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
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "cadre", "admin");
    const communityUnitId = assertCommunity(session);
    const db = c.get("db");

    const { id } = c.req.param();

    const record = await db.query.volunteers.findFirst({
      where: and(eq(volunteers.id, id), eq(volunteers.communityUnitId, communityUnitId)),
      with: {
        assignedElderly: {
          with: {
            elderly: true,
          },
        },
      },
    });

    if (!record) {
      return c.json({ success: false, error: "Relawan tidak ditemukan di RT ini" }, 404);
    }

    return c.json({
      success: true,
      data: {
        ...record,
        assignedElderlyCount: record.assignedElderly?.length ?? 0,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      },
    });
  }
}
