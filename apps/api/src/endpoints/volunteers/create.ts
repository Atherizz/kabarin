import { z, CreateVolunteerInputSchema, VolunteerSchema } from "@kabarin/types";
import { volunteers } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import crypto from "crypto";

export class CreateVolunteerEndpoint extends ApiRoute {
  schema = {
    tags: ["Volunteers"],
    summary: "Register new volunteer",
    description: "Registers a new volunteer living in the cadre's RT (within < 100m proximity).",
    request: {
      body: {
        content: { "application/json": { schema: CreateVolunteerInputSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Volunteer registered successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: VolunteerSchema,
            }),
          },
        },
      },
      "403": {
        description: "User is not associated with an RT",
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

    const body = await c.req.json<typeof CreateVolunteerInputSchema._type>();
    const volunteerId = crypto.randomUUID();

    const [newVolunteer] = await db
      .insert(volunteers)
      .values({
        id: volunteerId,
        communityUnitId,
        userId: body.userId ?? null,
        name: body.name,
        phone: body.phone,
        address: body.address,
        rt: body.rt,
        rw: body.rw,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        maxCapacity: body.maxCapacity ?? 5,
        isActive: true,
      })
      .returning();

    return c.json({
      success: true,
      data: {
        ...newVolunteer,
        assignedElderlyCount: 0,
        createdAt: newVolunteer.createdAt.toISOString(),
        updatedAt: newVolunteer.updatedAt.toISOString(),
      },
    });
  }
}
