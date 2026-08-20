import { z, CreateElderlyFamilyInputSchema, ElderlyFamilySchema } from "@kabarin/types";
import { eq, and, elderly, elderlyFamily } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import crypto from "crypto";

export class CreateFamilyEndpoint extends ApiRoute {
  schema = {
    tags: ["Family"],
    summary: "Add family member contact",
    description: "Adds a family member contact for an elderly. Generates a unique 64-character token for the public /status/:token view.",
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: { "application/json": { schema: CreateElderlyFamilyInputSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Family member added successfully",
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

    const { id: elderlyId } = c.req.param();
    const body = await c.req.json<typeof CreateElderlyFamilyInputSchema._type>();

    // 1. Verify elderly belongs to the cadre's RT
    const elderlyRecord = await db.query.elderly.findFirst({
      where: and(eq(elderly.id, elderlyId), eq(elderly.communityUnitId, communityUnitId)),
    });

    if (!elderlyRecord) {
      return c.json({ success: false, error: "Data lansia tidak ditemukan di RT ini" }, 404);
    }

    // 2. If new contact is primary, unmark existing primary contacts for this elderly
    if (body.isPrimaryContact) {
      await db
        .update(elderlyFamily)
        .set({ isPrimaryContact: false })
        .where(eq(elderlyFamily.elderlyId, elderlyId));
    }

    // 3. Generate unique 64-hex access token and insert
    const familyId = crypto.randomUUID();
    const accessToken = crypto.randomBytes(32).toString("hex");

    const [newFamily] = await db
      .insert(elderlyFamily)
      .values({
        id: familyId,
        elderlyId,
        name: body.name,
        phone: body.phone,
        relationship: body.relationship,
        isPrimaryContact: body.isPrimaryContact ?? false,
        accessToken,
        notifyViaWhatsapp: body.notifyViaWhatsapp ?? true,
      })
      .returning();

    return c.json({
      success: true,
      data: {
        ...newFamily,
        createdAt: newFamily.createdAt.toISOString(),
        updatedAt: newFamily.updatedAt.toISOString(),
      },
    });
  }
}
