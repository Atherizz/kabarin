import { z, VerifyElderlyInputSchema, ElderlySchema } from "@kabarin/types";
import { eq, and, elderly, elderlyVolunteers, volunteers } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class VerifyElderlyEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly"],
    summary: "Verify bottom-up elderly registration",
    description:
      "Approves (verified) or rejects a bottom-up elderly registration submitted by family members. " +
      "Allows the cadre to assign the primary and secondary caregiving volunteers during verification.",
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: { "application/json": { schema: VerifyElderlyInputSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Elderly verification updated",
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
    const session = assertRole(c, "cadre", "admin");
    const communityUnitId = assertCommunity(session);
    const db = c.get("db");

    const { id: elderlyId } = c.req.param();
    const body = await c.req.json<typeof VerifyElderlyInputSchema._type>();

    // 1. Verify elderly exists in cadre's RT
    const existing = await db.query.elderly.findFirst({
      where: and(eq(elderly.id, elderlyId), eq(elderly.communityUnitId, communityUnitId)),
    });

    if (!existing) {
      return c.json({ success: false, error: "Data lansia tidak ditemukan di RT ini" }, 404);
    }

    // 2. Update verification status
    const [updatedElderly] = await db
      .update(elderly)
      .set({
        verificationStatus: body.status,
        ...(body.notes && { notes: `${existing.notes ? existing.notes + " | " : ""}${body.notes}` }),
        updatedAt: new Date(),
      })
      .where(eq(elderly.id, elderlyId))
      .returning();

    // 3. Assign primary volunteer if provided
    if (body.primaryVolunteerId) {
      const vol = await db.query.volunteers.findFirst({
        where: and(
          eq(volunteers.id, body.primaryVolunteerId),
          eq(volunteers.communityUnitId, communityUnitId)
        ),
      });

      if (!vol) {
        return c.json(
          {
            success: false,
            error: `Relawan utama dengan ID '${body.primaryVolunteerId}' tidak ditemukan di RT ini`,
          },
          404
        );
      }

      // Unset previous primary
      await db
        .update(elderlyVolunteers)
        .set({ isPrimary: false })
        .where(eq(elderlyVolunteers.elderlyId, elderlyId));

      // Check if assignment exists
      const existingAssignment = await db.query.elderlyVolunteers.findFirst({
        where: and(
          eq(elderlyVolunteers.elderlyId, elderlyId),
          eq(elderlyVolunteers.volunteerId, body.primaryVolunteerId)
        ),
      });

      if (existingAssignment) {
        await db
          .update(elderlyVolunteers)
          .set({ isPrimary: true })
          .where(eq(elderlyVolunteers.id, existingAssignment.id));
      } else {
        await db.insert(elderlyVolunteers).values({
          id: crypto.randomUUID(),
          elderlyId,
          volunteerId: body.primaryVolunteerId,
          isPrimary: true,
        });
      }
    }

    // 4. Assign secondary volunteer if provided
    if (body.secondaryVolunteerId && body.secondaryVolunteerId !== body.primaryVolunteerId) {
      const secVol = await db.query.volunteers.findFirst({
        where: and(
          eq(volunteers.id, body.secondaryVolunteerId),
          eq(volunteers.communityUnitId, communityUnitId)
        ),
      });

      if (!secVol) {
        return c.json(
          {
            success: false,
            error: `Relawan cadangan dengan ID '${body.secondaryVolunteerId}' tidak ditemukan di RT ini`,
          },
          404
        );
      }

      const existingSecondary = await db.query.elderlyVolunteers.findFirst({
        where: and(
          eq(elderlyVolunteers.elderlyId, elderlyId),
          eq(elderlyVolunteers.volunteerId, body.secondaryVolunteerId)
        ),
      });

      if (!existingSecondary) {
        await db.insert(elderlyVolunteers).values({
          id: crypto.randomUUID(),
          elderlyId,
          volunteerId: body.secondaryVolunteerId,
          isPrimary: false,
        });
      }
    }

    return c.json({
      success: true,
      data: {
        ...updatedElderly,
        createdAt: updatedElderly.createdAt.toISOString(),
        updatedAt: updatedElderly.updatedAt.toISOString(),
      },
    });
  }
}
