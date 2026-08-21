import { z, UpdateElderlyFamilyInputSchema, ElderlyFamilySchema } from "@kabarin/types";
import { eq, and, elderlyFamily } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";

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
    const body = await c.req.json<typeof UpdateElderlyFamilyInputSchema._type>();

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
