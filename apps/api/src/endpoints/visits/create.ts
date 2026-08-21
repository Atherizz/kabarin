import { z, CreateVolunteerVisitInputSchema, VolunteerVisitSchema } from "@kabarin/types";
import { eq, and, volunteerVisits, elderlyVolunteers } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { generateAccessToken } from "../../lib/token";
import { assertRole, assertCommunity } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";

export class CreateVisitEndpoint extends ApiRoute {
  schema = {
    tags: ["Volunteer Management"],
    summary: "Dispatch a physical visit task to volunteer",
    description:
      "Dispatches an on-site physical visit task to an assigned neighborhood volunteer (Surface 1 & Surface 4).\n\n" +
      "### Automated Routing:\n" +
      "- If `volunteerId` is omitted, the system automatically assigns the elderly's **Primary Responder** from `elderly_volunteers`.\n" +
      "- Generates a unique 64-character token (`formToken`) valid for 24 hours for the 1-tap WhatsApp form (`https://kabarin.id/lapor/:token`).",
    request: {
      body: {
        content: { "application/json": { schema: CreateVolunteerVisitInputSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Visit task dispatched successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: VolunteerVisitSchema,
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
    const db = c.get("db");
    const body = await c.req.json<typeof CreateVolunteerVisitInputSchema._type>();

    // 1. Verify access to elderly in cadre's RT
    const elderlyRecord = await assertElderlyAccess(db, session, body.elderlyId);

    // 2. Resolve assigned volunteer (use provided volunteerId or auto-assign primary responder)
    let assignedVolunteerId: string | null = body.volunteerId ?? null;

    if (!assignedVolunteerId) {
      const primaryAssignment = await db.query.elderlyVolunteers.findFirst({
        where: and(
          eq(elderlyVolunteers.elderlyId, body.elderlyId),
          eq(elderlyVolunteers.isPrimary, true)
        ),
      });

      if (primaryAssignment) {
        assignedVolunteerId = primaryAssignment.volunteerId;
      }
    }

    // 3. Generate unique 64-hex token valid for 24 hours
    const visitId = crypto.randomUUID();
    const formToken = generateAccessToken();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const [createdVisit] = await db
      .insert(volunteerVisits)
      .values({
        id: visitId,
        communityUnitId: elderlyRecord.communityUnitId,
        elderlyId: body.elderlyId,
        volunteerId: assignedVolunteerId,
        visitType: body.visitType ?? "routine",
        formToken,
        tokenExpiresAt,
        status: "pending",
        volunteerNotes: body.notes ?? null,
      })
      .returning();

    return c.json({
      success: true,
      data: {
        ...createdVisit,
        tokenExpiresAt: createdVisit.tokenExpiresAt.toISOString(),
        visitedAt: createdVisit.visitedAt ? createdVisit.visitedAt.toISOString() : null,
        createdAt: createdVisit.createdAt.toISOString(),
        updatedAt: createdVisit.updatedAt.toISOString(),
      },
    });
  }
}
