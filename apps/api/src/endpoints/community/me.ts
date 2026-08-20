import { z, CommunityUnitSchema } from "@kabarin/types";
import { eq, communityUnits } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";

export class GetMyCommunityEndpoint extends ApiRoute {
  schema = {
    tags: ["Community"],
    summary: "Get my RT details",
    description: "Returns the community unit (RT) that the authenticated cadre belongs to.",
    responses: {
      "200": {
        description: "Community unit data",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(true), data: CommunityUnitSchema }),
          },
        },
      },
      "404": {
        description: "Cadre not linked to any community unit",
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
      return c.json({ success: false, error: "Akun ini tidak terhubung ke wilayah RT manapun" }, 404);
    }

    const community = await db.query.communityUnits.findFirst({
      where: eq(communityUnits.id, communityUnitId),
    });

    if (!community) {
      return c.json({ success: false, error: "Wilayah RT tidak ditemukan" }, 404);
    }

    return c.json({
      success: true,
      data: {
        ...community,
        createdAt: community.createdAt.toISOString(),
        updatedAt: community.updatedAt.toISOString(),
      },
    });
  }
}
