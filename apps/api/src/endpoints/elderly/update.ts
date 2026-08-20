import { z, UpdateElderlyInputSchema, ElderlySchema } from "@kabarin/types";
import { eq, and, elderly } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";

export class UpdateElderlyEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly"],
    summary: "Update elderly profile",
    description: "Updates profile information of an elderly individual. Scoped to the cadre's RT.",
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: { "application/json": { schema: UpdateElderlyInputSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Elderly profile updated",
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
    const db = c.get("db");
    const session = c.get("session")!;
    const communityUnitId = session.user.communityUnitId;

    if (!communityUnitId) {
      return c.json({ success: false, error: "Akun Anda belum terhubung ke wilayah RT" }, 403);
    }

    const { id } = c.req.param();
    const body = await c.req.json<typeof UpdateElderlyInputSchema._type>();

    const existing = await db.query.elderly.findFirst({
      where: and(eq(elderly.id, id), eq(elderly.communityUnitId, communityUnitId)),
    });

    if (!existing) {
      return c.json({ success: false, error: "Data lansia tidak ditemukan" }, 404);
    }

    const [updated] = await db
      .update(elderly)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.age !== undefined && { age: body.age }),
        ...(body.gender !== undefined && { gender: body.gender }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.rt !== undefined && { rt: body.rt }),
        ...(body.rw !== undefined && { rw: body.rw }),
        ...(body.latitude !== undefined && { latitude: body.latitude }),
        ...(body.longitude !== undefined && { longitude: body.longitude }),
        ...(body.mobilityStatus !== undefined && { mobilityStatus: body.mobilityStatus }),
        ...(body.monitoringMode !== undefined && { monitoringMode: body.monitoringMode }),
        ...(body.medicalHistory !== undefined && { medicalHistory: body.medicalHistory }),
        ...(body.preferredCheckinTime !== undefined && { preferredCheckinTime: body.preferredCheckinTime }),
        ...(body.notes !== undefined && { notes: body.notes }),
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
