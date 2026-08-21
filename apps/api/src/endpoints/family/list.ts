import { z, ElderlyFamilySchema } from "@kabarin/types";
import { eq, and, desc, elderly, elderlyFamily } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class ListFamilyEndpoint extends ApiRoute {
  schema = {
    tags: ["Family"],
    summary: "List all family contacts for an elderly",
    description: "Returns all registered family members linked to an elderly individual in the cadre's RT, including access tokens for the status page.",
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "List of family contacts",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(ElderlyFamilySchema),
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
    const session = assertRole(c, "cadre", "admin");
    const communityUnitId = assertCommunity(session);
    const db = c.get("db");

    const { id: elderlyId } = c.req.param();

    // 1. Verify elderly belongs to the cadre's RT
    const elderlyRecord = await db.query.elderly.findFirst({
      where: and(eq(elderly.id, elderlyId), eq(elderly.communityUnitId, communityUnitId)),
    });

    if (!elderlyRecord) {
      return c.json({ success: false, error: "Data lansia tidak ditemukan di RT ini" }, 404);
    }

    // 2. Fetch family members
    const records = await db.query.elderlyFamily.findMany({
      where: eq(elderlyFamily.elderlyId, elderlyId),
      orderBy: [desc(elderlyFamily.isPrimaryContact), desc(elderlyFamily.createdAt)],
    });

    const data = records.map((f) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));

    return c.json({ success: true, data });
  }
}
