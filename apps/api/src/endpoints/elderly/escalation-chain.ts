import { z, UpdateEscalationChainInputSchema, EscalationChainSchema } from "@kabarin/types";
import { eq, and, elderly, elderlyVolunteers, elderlyFamily, volunteers } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";
import crypto from "crypto";

export class GetEscalationChainEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly Verification & Escalations"],
    summary: "Get escalation chain configuration for an elderly",
    description:
      "Returns the hierarchical responder configuration for Tier 1 (Primary Volunteer), " +
      "Tier 2 (Secondary Volunteer & Primary Family Contact), and Tier 3 emergency dispatch.\n\n" +
      "### Multi-Role Access Control:\n" +
      "- **Cadre RT:** Accessible for all seniors residing in the RT territory.\n" +
      "- **Family:** Accessible exclusively for parents/relatives linked to the family account.",
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "Escalation chain details",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: EscalationChainSchema,
            }),
          },
        },
      },
      "403": {
        description: "Forbidden: Not permitted to view escalation chain for this elderly",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "404": {
        description: "Elderly not found",
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
    const { id: elderlyId } = c.req.param();

    // 1. Verify access to elderly via Strategy Pattern Policy Layer (closes cross-RT leak)
    await assertElderlyAccess(db, session, elderlyId);

    // 2. Query volunteer assignments
    const volunteerAssignments = await db.query.elderlyVolunteers.findMany({
      where: eq(elderlyVolunteers.elderlyId, elderlyId),
      with: { volunteer: true },
    });

    const primaryAssign = volunteerAssignments.find((a) => a.isPrimary);
    const secondaryAssign = volunteerAssignments.find((a) => !a.isPrimary);

    // 3. Query primary family contact
    const primaryFamily = await db.query.elderlyFamily.findFirst({
      where: and(eq(elderlyFamily.elderlyId, elderlyId), eq(elderlyFamily.isPrimaryContact, true)),
    });

    return c.json({
      success: true,
      data: {
        elderlyId,
        primaryVolunteer: primaryAssign?.volunteer
          ? {
              id: primaryAssign.volunteer.id,
              name: primaryAssign.volunteer.name,
              phone: primaryAssign.volunteer.phone,
            }
          : null,
        secondaryVolunteer: secondaryAssign?.volunteer
          ? {
              id: secondaryAssign.volunteer.id,
              name: secondaryAssign.volunteer.name,
              phone: secondaryAssign.volunteer.phone,
            }
          : null,
        primaryFamilyContact: primaryFamily
          ? {
              id: primaryFamily.id,
              name: primaryFamily.name,
              phone: primaryFamily.phone,
              relationship: primaryFamily.relationship,
            }
          : null,
        emergencyAllFamily: true,
      },
    });
  }
}

export class UpdateEscalationChainEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly Verification & Escalations"],
    summary: "Update escalation chain for an elderly",
    description:
      "Updates the primary responder (Tier 1 volunteer), secondary responder (Tier 2 volunteer), " +
      "and primary family contact for emergency escalation. Restricted strictly to Cadre RT and Admin.",
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: { "application/json": { schema: UpdateEscalationChainInputSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Escalation chain updated successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: EscalationChainSchema,
            }),
          },
        },
      },
      "400": {
        description: "Volunteer inactive or reached max capacity",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "404": {
        description: "Elderly or volunteer not found in this RT",
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
    const body = await c.req.json<typeof UpdateEscalationChainInputSchema._type>();

    // 1. Verify elderly exists in cadre's RT
    const elderlyRecord = await db.query.elderly.findFirst({
      where: and(eq(elderly.id, elderlyId), eq(elderly.communityUnitId, communityUnitId)),
    });

    if (!elderlyRecord) {
      return c.json({ success: false, error: "Data lansia tidak ditemukan di RT ini" }, 404);
    }

    // 2. Synchronize Primary Volunteer Assignment
    if (body.primaryVolunteerId !== undefined) {
      if (body.primaryVolunteerId) {
        const vol = await db.query.volunteers.findFirst({
          where: and(
            eq(volunteers.id, body.primaryVolunteerId),
            eq(volunteers.communityUnitId, communityUnitId)
          ),
          with: { assignedElderly: true },
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

        if (!vol.isActive) {
          return c.json(
            {
              success: false,
              error: `Relawan utama '${vol.name}' berstatus non-aktif`,
            },
            400
          );
        }

        const existingAssignment = await db.query.elderlyVolunteers.findFirst({
          where: and(
            eq(elderlyVolunteers.elderlyId, elderlyId),
            eq(elderlyVolunteers.volunteerId, body.primaryVolunteerId)
          ),
        });

        if (!existingAssignment) {
          const currentCount = vol.assignedElderly?.length ?? 0;
          if (currentCount >= vol.maxCapacity) {
            return c.json(
              {
                success: false,
                error: `Relawan utama '${vol.name}' sudah mencapai batas kapasitas maksimal (${vol.maxCapacity} lansia)`,
              },
              400
            );
          }
        }

        // Remove any other existing primary volunteer assignment
        await db
          .delete(elderlyVolunteers)
          .where(
            and(
              eq(elderlyVolunteers.elderlyId, elderlyId),
              eq(elderlyVolunteers.isPrimary, true)
            )
          );

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
      } else {
        // Unassign primary responder
        await db
          .delete(elderlyVolunteers)
          .where(
            and(
              eq(elderlyVolunteers.elderlyId, elderlyId),
              eq(elderlyVolunteers.isPrimary, true)
            )
          );
      }
    }

    // 3. Synchronize Secondary Volunteer Assignment
    if (body.secondaryVolunteerId !== undefined) {
      if (body.secondaryVolunteerId && body.secondaryVolunteerId !== body.primaryVolunteerId) {
        const secVol = await db.query.volunteers.findFirst({
          where: and(
            eq(volunteers.id, body.secondaryVolunteerId),
            eq(volunteers.communityUnitId, communityUnitId)
          ),
          with: { assignedElderly: true },
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

        if (!secVol.isActive) {
          return c.json(
            {
              success: false,
              error: `Relawan cadangan '${secVol.name}' berstatus non-aktif`,
            },
            400
          );
        }

        const existingSecondary = await db.query.elderlyVolunteers.findFirst({
          where: and(
            eq(elderlyVolunteers.elderlyId, elderlyId),
            eq(elderlyVolunteers.volunteerId, body.secondaryVolunteerId)
          ),
        });

        if (!existingSecondary) {
          const currentSecCount = secVol.assignedElderly?.length ?? 0;
          if (currentSecCount >= secVol.maxCapacity) {
            return c.json(
              {
                success: false,
                error: `Relawan cadangan '${secVol.name}' sudah mencapai batas kapasitas maksimal (${secVol.maxCapacity} lansia)`,
              },
              400
            );
          }
        }

        // Remove any other existing secondary volunteer assignment
        await db
          .delete(elderlyVolunteers)
          .where(
            and(
              eq(elderlyVolunteers.elderlyId, elderlyId),
              eq(elderlyVolunteers.isPrimary, false)
            )
          );

        if (existingSecondary) {
          await db
            .update(elderlyVolunteers)
            .set({ isPrimary: false })
            .where(eq(elderlyVolunteers.id, existingSecondary.id));
        } else {
          await db.insert(elderlyVolunteers).values({
            id: crypto.randomUUID(),
            elderlyId,
            volunteerId: body.secondaryVolunteerId,
            isPrimary: false,
          });
        }
      } else {
        // Unassign secondary responder
        await db
          .delete(elderlyVolunteers)
          .where(
            and(
              eq(elderlyVolunteers.elderlyId, elderlyId),
              eq(elderlyVolunteers.isPrimary, false)
            )
          );
      }
    }

    // 4. Update Primary Family Contact
    if (body.primaryFamilyId !== undefined) {
      if (body.primaryFamilyId) {
        const fam = await db.query.elderlyFamily.findFirst({
          where: and(
            eq(elderlyFamily.id, body.primaryFamilyId),
            eq(elderlyFamily.elderlyId, elderlyId)
          ),
        });

        if (!fam) {
          return c.json(
            {
              success: false,
              error: `Kontak keluarga dengan ID '${body.primaryFamilyId}' tidak ditemukan untuk lansia ini`,
            },
            404
          );
        }
      }

      // Unset all primary family contacts
      await db
        .update(elderlyFamily)
        .set({ isPrimaryContact: false })
        .where(eq(elderlyFamily.elderlyId, elderlyId));

      if (body.primaryFamilyId) {
        await db
          .update(elderlyFamily)
          .set({ isPrimaryContact: true })
          .where(
            and(
              eq(elderlyFamily.id, body.primaryFamilyId),
              eq(elderlyFamily.elderlyId, elderlyId)
            )
          );
      }
    }

    // 5. Fetch updated chain to return
    const volunteerAssignments = await db.query.elderlyVolunteers.findMany({
      where: eq(elderlyVolunteers.elderlyId, elderlyId),
      with: { volunteer: true },
    });

    const primaryAssign = volunteerAssignments.find((a) => a.isPrimary);
    const secondaryAssign = volunteerAssignments.find((a) => !a.isPrimary);

    const primaryFamily = await db.query.elderlyFamily.findFirst({
      where: and(eq(elderlyFamily.elderlyId, elderlyId), eq(elderlyFamily.isPrimaryContact, true)),
    });

    return c.json({
      success: true,
      data: {
        elderlyId,
        primaryVolunteer: primaryAssign?.volunteer
          ? {
              id: primaryAssign.volunteer.id,
              name: primaryAssign.volunteer.name,
              phone: primaryAssign.volunteer.phone,
            }
          : null,
        secondaryVolunteer: secondaryAssign?.volunteer
          ? {
              id: secondaryAssign.volunteer.id,
              name: secondaryAssign.volunteer.name,
              phone: secondaryAssign.volunteer.phone,
            }
          : null,
        primaryFamilyContact: primaryFamily
          ? {
              id: primaryFamily.id,
              name: primaryFamily.name,
              phone: primaryFamily.phone,
              relationship: primaryFamily.relationship,
            }
          : null,
        emergencyAllFamily: body.emergencyAllFamily ?? true,
      },
    });
  }
}
