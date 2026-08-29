import { z, CreateVolunteerVisitInputSchema, VolunteerVisitSchema } from "@kabarin/types";
import { eq, and, volunteerVisits, elderlyVolunteers, volunteers } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { generateAccessToken } from "../../lib/token";
import { assertRole, assertCommunity } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";
import { generateGuidedChecklist } from "../../lib/ai/checklist-service";

export class CreateVisitEndpoint extends ApiRoute {
  schema = {
    tags: ["Volunteer Management"],
    summary: "Dispatch a physical visit task to volunteer (Manual Cadre & Bot Trigger)",
    description:
      "### Dual-Flow Architecture & Integration Context:\n" +
      "- **🤖 Automated Bot Engine (Primary):** Physical visit tasks are automatically created and dispatched via WhatsApp to the primary volunteer by the Tier 1 Escalation Engine when a senior misses 2 consecutive morning check-in reminders.\n" +
      "- **👤 Manual Cadre Dispatch (This Endpoint):** Allows Cadre RT to manually trigger an on-demand physical visit (e.g. posyandu follow-up, meal distribution, blood pressure check) at any time.\n\n" +
      "### Automated Routing & Token Generation:\n" +
      "- If `volunteerId` is omitted, the system automatically routes to the elderly's **Primary Responder** from `elderly_volunteers`.\n" +
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
      "400": {
        description: "Volunteer is inactive or cannot be assigned",
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
    const db = c.get("db");
    const body = await c.req.json<typeof CreateVolunteerVisitInputSchema._type>();

    // 1. Verify access to elderly in cadre's RT
    const elderlyRecord = await assertElderlyAccess(db, session, body.elderlyId);

    // 2. Resolve and validate assigned volunteer
    let assignedVolunteerId: string | null = null;

    if (body.volunteerId) {
      const vol = await db.query.volunteers.findFirst({
        where: and(
          eq(volunteers.id, body.volunteerId),
          eq(volunteers.communityUnitId, elderlyRecord.communityUnitId)
        ),
      });

      if (!vol) {
        return c.json(
          { success: false, error: "Relawan tidak ditemukan di RT ini" },
          404
        );
      }

      if (!vol.isActive) {
        return c.json(
          {
            success: false,
            error: "Relawan ini berstatus non-aktif dan tidak dapat menerima tugas kunjungan",
          },
          400
        );
      }

      assignedVolunteerId = vol.id;
    } else {
      // Auto-assign primary responder if available
      const primaryAssignment = await db.query.elderlyVolunteers.findFirst({
        where: and(
          eq(elderlyVolunteers.elderlyId, body.elderlyId),
          eq(elderlyVolunteers.isPrimary, true)
        ),
        with: { volunteer: true },
      });

      if (primaryAssignment) {
        if (primaryAssignment.volunteer?.isActive) {
          assignedVolunteerId = primaryAssignment.volunteerId;
        }
      }
    }

    // 3. Generate guided observational checklist 
    const guidedChecklist = await generateGuidedChecklist(db, c.env, body.elderlyId);

    // 4. Generate unique 64-hex token valid for 24 hours
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
        guidedChecklist,
      })
      .returning();

    return c.json({
      success: true,
      data: {
        ...createdVisit,
        guidedChecklist: createdVisit.guidedChecklist ?? null,
        checklistResponses: createdVisit.checklistResponses ?? null,
        dispatchedAt: createdVisit.dispatchedAt ? createdVisit.dispatchedAt.toISOString() : null,
        tokenExpiresAt: createdVisit.tokenExpiresAt.toISOString(),
        visitedAt: createdVisit.visitedAt ? createdVisit.visitedAt.toISOString() : null,
        createdAt: createdVisit.createdAt.toISOString(),
        updatedAt: createdVisit.updatedAt.toISOString(),
      },
    });
  }
}

