import { z, UpdateElderlyFamilyInputSchema, ElderlyFamilySchema } from "@kabarin/types";
import { eq, and, elderly, elderlyFamily } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class UpdateFamilyEndpoint extends ApiRoute {
  schema = {
    tags: ["Family Contacts"],
    summary: "Update family member contact",
    description: "Updates contact details, relationship, or notification preferences of a family member.",
    request: {
      params: z.object({
        id: z.string(),
        familyId: z.string(),
      }),
      body: {
        content: { "application/json": { schema: UpdateElderlyFamilyInputSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Family member updated successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: ElderlyFamilySchema,
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
    const session = assertRole(c, "cadre", "family", "admin");
    const db = c.get("db");

    const { id: elderlyId, familyId } = c.req.param();
    const body = await c.req.json<typeof UpdateElderlyFamilyInputSchema._type>();
    const communityUnitId = session.user.communityUnitId;

    // 1. Verify elderly belongs to the cadre's RT (if cadre)
    const elderlyRecord = await db.query.elderly.findFirst({
      where: and(
        eq(elderly.id, elderlyId),
        communityUnitId ? eq(elderly.communityUnitId, communityUnitId) : undefined
      ),
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

    // 3. If marking as primary, unmark others for this elderly
    if (body.isPrimaryContact) {
      await db
        .update(elderlyFamily)
        .set({ isPrimaryContact: false })
        .where(eq(elderlyFamily.elderlyId, elderlyId));
    }

    // 4. Update family record
    const [updated] = await db
      .update(elderlyFamily)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.relationship !== undefined && { relationship: body.relationship }),
        ...(body.isPrimaryContact !== undefined && { isPrimaryContact: body.isPrimaryContact }),
        ...(body.notifyViaWhatsapp !== undefined && { notifyViaWhatsapp: body.notifyViaWhatsapp }),
        updatedAt: new Date(),
      })
      .where(and(eq(elderlyFamily.id, familyId), eq(elderlyFamily.elderlyId, elderlyId)))
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
