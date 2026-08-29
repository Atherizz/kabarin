import { z, CreateVolunteerVisitInputSchema, VolunteerVisitSchema } from "@kabarin/types";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";
import { createVisit, VolunteerNotFoundError, VolunteerInactiveError } from "../../lib/visits/visit-service";

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
    assertCommunity(session);
    const db = c.get("db");
    const body = await c.req.json<typeof CreateVolunteerVisitInputSchema._type>();

    // 1. Verify access to elderly in cadre's RT
    const elderlyRecord = await assertElderlyAccess(db, session, body.elderlyId);

    // 2. Dispatch visit via shared service
    try {
      const visit = await createVisit(db, {
        elderlyId: body.elderlyId,
        communityUnitId: elderlyRecord.communityUnitId,
        volunteerId: body.volunteerId,
        visitType: body.visitType,
        notes: body.notes,
      });

      return c.json({
        success: true,
        data: {
          ...visit,
          guidedChecklist: visit.guidedChecklist ?? null,
          checklistResponses: visit.checklistResponses ?? null,
          dispatchedAt: visit.dispatchedAt ? visit.dispatchedAt.toISOString() : null,
          tokenExpiresAt: visit.tokenExpiresAt.toISOString(),
          visitedAt: visit.visitedAt ? visit.visitedAt.toISOString() : null,
          createdAt: visit.createdAt.toISOString(),
          updatedAt: visit.updatedAt.toISOString(),
        },
      });
    } catch (err) {
      if (err instanceof VolunteerNotFoundError) {
        return c.json({ success: false, error: err.message }, 404);
      }
      if (err instanceof VolunteerInactiveError) {
        return c.json({ success: false, error: err.message }, 400);
      }
      throw err;
    }
  }
}
