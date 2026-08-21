import { z, ElderlySchema } from "@kabarin/types";
import { eq, and, elderly } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class GetElderlyEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly"],
    summary: "Get single elderly profile",
    description: "Returns the full profile of a single elderly individual with active medications and family contacts. Scoped to the cadre's RT.",
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "Elderly full profile",
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

    const { id } = c.req.param();

    const record = await db.query.elderly.findFirst({
      where: and(eq(elderly.id, id), eq(elderly.communityUnitId, communityUnitId)),
      with: {
        familyMembers: true,
        medications: true,
        volunteerAssignments: {
          with: {
            volunteer: true,
          },
        },
      },
    });

    if (!record) {
      return c.json({ success: false, error: "Data lansia tidak ditemukan" }, 404);
    }

    return c.json({
      success: true,
      data: {
        ...record,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        familyMembers: record.familyMembers?.map((f) => ({
          ...f,
          createdAt: f.createdAt.toISOString(),
          updatedAt: f.updatedAt.toISOString(),
        })),
        medications: record.medications?.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })),
      },
    });
  }
}
