import { z, VolunteerAssignmentSchema } from "@kabarin/types";
import { eq, elderlyVolunteers } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";

export class ListVolunteersByElderlyEndpoint extends ApiRoute {
  schema = {
    tags: ["Family Contacts"],
    summary: "List assigned volunteers for an elderly",
    description:
      "Returns primary and backup volunteers assigned to a specific elderly (accessible by RT Cadre and registered Family members).\n\n" +
      "### Multi-Role Access Control:\n" +
      "- **Cadre RT:** Accessible for all seniors residing in the RT territory.\n" +
      "- **Family:** Accessible for parents/relatives linked to the family account so children know who their parent's designated neighborhood caregiver is.",
    request: {
      params: z.object({
        id: z.string().describe("Elderly UUID"),
      }),
    },
    responses: {
      "200": {
        description: "List of assigned volunteers",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(VolunteerAssignmentSchema),
            }),
          },
        },
      },
      "403": {
        description: "Forbidden: Not permitted to view volunteers for this elderly",
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

    // 2. Fetch assigned volunteers
    const assignments = await db.query.elderlyVolunteers.findMany({
      where: eq(elderlyVolunteers.elderlyId, elderlyId),
      with: {
        volunteer: true,
      },
    });

    const data = assignments.map((a) => ({
      id: a.id,
      elderlyId: a.elderlyId,
      volunteerId: a.volunteerId,
      isPrimary: a.isPrimary,
      assignedAt: a.assignedAt.toISOString(),
      volunteer: a.volunteer
        ? {
            id: a.volunteer.id,
            communityUnitId: a.volunteer.communityUnitId,
            userId: a.volunteer.userId ?? null,
            name: a.volunteer.name,
            phone: a.volunteer.phone,
            address: a.volunteer.address,
            rt: a.volunteer.rt,
            rw: a.volunteer.rw,
            latitude: a.volunteer.latitude ?? null,
            longitude: a.volunteer.longitude ?? null,
            maxCapacity: a.volunteer.maxCapacity,
            isActive: a.volunteer.isActive,
            createdAt: a.volunteer.createdAt.toISOString(),
            updatedAt: a.volunteer.updatedAt.toISOString(),
          }
        : undefined,
    }));

    return c.json({ success: true, data });
  }
}
