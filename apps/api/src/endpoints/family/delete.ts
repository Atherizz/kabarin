import { z } from "@kabarin/types";
import { eq, and, elderly, elderlyFamily } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";

export class DeleteFamilyEndpoint extends ApiRoute {
  schema = {
    tags: ["Family"],
    summary: "Delete family member contact",
    description: "Permanently deletes a family member contact and invalidates their status access token.",
    request: {
      params: z.object({
        id: z.string(),
        familyId: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "Family member deleted",
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
        description: "Elderly or family member not found in this RT",
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

    const { id: elderlyId, familyId } = c.req.param();

    // 1. Verify elderly belongs to the cadre's RT
    const elderlyRecord = await db.query.elderly.findFirst({
      where: and(eq(elderly.id, elderlyId), eq(elderly.communityUnitId, communityUnitId)),
    });

    if (!elderlyRecord) {
      return c.json({ success: false, error: "Data lansia tidak ditemukan di RT ini" }, 404);
    }

    // 2. Verify family member exists for this elderly
    const existingFamily = await db.query.elderlyFamily.findFirst({
      where: and(
        eq(elderlyFamily.id, familyId),
        eq(elderlyFamily.elderlyId, elderlyId)
      ),
    });

    if (!existingFamily) {
      return c.json({ success: false, error: "Kontak keluarga tidak ditemukan" }, 404);
    }

    // 3. Delete family record
    await db
      .delete(elderlyFamily)
      .where(and(eq(elderlyFamily.id, familyId), eq(elderlyFamily.elderlyId, elderlyId)));

    return c.json({
      success: true,
      data: { id: familyId },
    });
  }
}
