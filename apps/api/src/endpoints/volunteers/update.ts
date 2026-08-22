import { z, UpdateVolunteerInputSchema, VolunteerSchema } from "@kabarin/types";
import { eq, and, volunteers } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class UpdateVolunteerEndpoint extends ApiRoute {
  schema = {
    tags: ["Volunteer Management"],
    summary: "Update volunteer profile",
    description: "Updates details, max capacity, or active status of a volunteer. Scoped to cadre's RT.",
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: { "application/json": { schema: UpdateVolunteerInputSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Volunteer updated successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: VolunteerSchema,
            }),
          },
        },
      },
      "404": {
        description: "Volunteer not found in this RT",
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
    const body = await c.req.json<typeof UpdateVolunteerInputSchema._type>();

    const existing = await db.query.volunteers.findFirst({
      where: and(eq(volunteers.id, id), eq(volunteers.communityUnitId, communityUnitId)),
      with: { assignedElderly: true },
    });

    if (!existing) {
      return c.json({ success: false, error: "Relawan tidak ditemukan di RT ini" }, 404);
    }

    // Prevent reducing maxCapacity below currently assigned elderly count
    if (body.maxCapacity !== undefined) {
      const currentCount = existing.assignedElderly?.length ?? 0;
      if (body.maxCapacity < currentCount) {
        return c.json(
          {
            success: false,
            error: `Kapasitas maksimal (${body.maxCapacity}) tidak boleh lebih kecil dari jumlah lansia yang sedang diasuh saat ini (${currentCount} lansia)`,
          },
          400
        );
      }
    }

    const [updated] = await db
      .update(volunteers)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.rt !== undefined && { rt: body.rt }),
        ...(body.rw !== undefined && { rw: body.rw }),
        ...(body.latitude !== undefined && { latitude: body.latitude }),
        ...(body.longitude !== undefined && { longitude: body.longitude }),
        ...(body.maxCapacity !== undefined && { maxCapacity: body.maxCapacity }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        updatedAt: new Date(),
      })
      .where(and(eq(volunteers.id, id), eq(volunteers.communityUnitId, communityUnitId)))
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
