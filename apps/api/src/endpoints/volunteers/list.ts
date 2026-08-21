import { z, VolunteerSchema } from "@kabarin/types";
import { eq, desc, volunteers } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class ListVolunteersEndpoint extends ApiRoute {
  schema = {
    tags: ["Volunteers"],
    summary: "List all volunteers in cadre's RT",
    description: "Returns all volunteer profiles registered in the cadre's RT, including their current assigned elderly count for load monitoring.",
    responses: {
      "200": {
        description: "List of volunteers",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(VolunteerSchema),
            }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "cadre", "admin");
    const communityUnitId = assertCommunity(session);
    const db = c.get("db");

    const records = await db.query.volunteers.findMany({
      where: eq(volunteers.communityUnitId, communityUnitId),
      orderBy: [desc(volunteers.createdAt)],
      with: {
        assignedElderly: true,
      },
    });

    const data = records.map((v) => ({
      id: v.id,
      communityUnitId: v.communityUnitId,
      userId: v.userId ?? null,
      name: v.name,
      phone: v.phone,
      address: v.address,
      rt: v.rt,
      rw: v.rw,
      latitude: v.latitude ?? null,
      longitude: v.longitude ?? null,
      maxCapacity: v.maxCapacity,
      isActive: v.isActive,
      assignedElderlyCount: v.assignedElderly?.length ?? 0,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    }));

    return c.json({ success: true, data });
  }
}
