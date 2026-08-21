import { z, UpdateElderlyStatusInputSchema, ElderlySchema } from "@kabarin/types";
import { eq, and, elderly } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class UpdateElderlyStatusEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly"],
    summary: "Update elderly welfare status",
    description: "Updates the real-time traffic-light status of an elderly individual (green/yellow/red/grey). Used by Care Agent, bot handlers, and manual overrides.",
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: { "application/json": { schema: UpdateElderlyStatusInputSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Status updated successfully",
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
    const session = assertRole(c, "cadre", "volunteer", "admin");
    const communityUnitId = assertCommunity(session);
    const db = c.get("db");

    const { id } = c.req.param();
    const body = await c.req.json<typeof UpdateElderlyStatusInputSchema._type>();

    const existing = await db.query.elderly.findFirst({
      where: and(eq(elderly.id, id), eq(elderly.communityUnitId, communityUnitId)),
    });

    if (!existing) {
      return c.json({ success: false, error: "Data lansia tidak ditemukan" }, 404);
    }

    const [updated] = await db
      .update(elderly)
      .set({
        currentStatus: body.status,
        ...(body.notes && { notes: body.notes }),
        updatedAt: new Date(),
      })
      .where(and(eq(elderly.id, id), eq(elderly.communityUnitId, communityUnitId)))
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
