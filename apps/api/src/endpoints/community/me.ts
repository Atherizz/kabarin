import { z, CommunityUnitSchema } from "@kabarin/types";
import { eq, communityUnits } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

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
        description: "RT unit not found",
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

