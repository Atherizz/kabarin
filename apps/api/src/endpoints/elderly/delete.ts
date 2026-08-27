import { z } from "@kabarin/types";
import { eq, and, elderly } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class DeleteElderlyEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly Management"],
    summary: "Delete elderly profile",
    description: "Permanently deletes an elderly individual record. Cascades to associated medications, family contacts, and history.",
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "Elderly deleted successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.object({ id: z.string() }),
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

    const existing = await db.query.elderly.findFirst({
      where: and(eq(elderly.id, id), eq(elderly.communityUnitId, communityUnitId)),
    });

    if (!existing) {
      return c.json({ success: false, error: "Data lansia tidak ditemukan" }, 404);
    }

    await db
      .delete(elderly)
      .where(and(eq(elderly.id, id), eq(elderly.communityUnitId, communityUnitId)));

    return c.json({
      success: true,
      data: { id },
    });
  }
}
