import { z, UpdateCommunitySchema, CommunityUnitSchema } from "@kabarin/types";
import { eq, communityUnits } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class UpdateMyCommunityEndpoint extends ApiRoute {
  schema = {
    tags: ["Community"],
    summary: "Update my RT details",
    description: "Update health facility contacts and community name for the cadre's RT.",
    request: {
      body: {
        content: { "application/json": { schema: UpdateCommunitySchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Community unit updated",
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

    const body = await c.req.json<typeof UpdateCommunitySchema._type>();

    const [updated] = await db
      .update(communityUnits)
      .set({
        ...(body.name && { name: body.name }),
        ...(body.healthFacilityName !== undefined && { healthFacilityName: body.healthFacilityName }),
        ...(body.healthFacilityPhone !== undefined && { healthFacilityPhone: body.healthFacilityPhone }),
        ...(body.communityHealthWorkerPhone !== undefined && { communityHealthWorkerPhone: body.communityHealthWorkerPhone }),
        ...(body.ambulancePhone !== undefined && { ambulancePhone: body.ambulancePhone }),
        updatedAt: new Date(),
      })
      .where(eq(communityUnits.id, communityUnitId))
      .returning();

    return c.json({
      success: true,
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  }
}

