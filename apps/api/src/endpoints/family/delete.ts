import { z } from "@kabarin/types";
import { eq, and, elderlyFamily } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";

export class DeleteFamilyEndpoint extends ApiRoute {
  schema = {
    tags: ["Family Contacts"],
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
      "403": {
        description: "Forbidden: Not permitted to manage this elderly",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "404": {
        description: "Elderly or family member not found",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "cadre", "family", "admin");
    const db = c.get("db");

    const { id: elderlyId, familyId } = c.req.param();

    // 1. Verify access to elderly (admin / cadre of same RT / registered family)
    await assertElderlyAccess(db, session, elderlyId);

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
