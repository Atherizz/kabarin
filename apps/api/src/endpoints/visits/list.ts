import { z, VolunteerVisitSchema, VisitListQuerySchema } from "@kabarin/types";
import { eq, and, desc, volunteerVisits, volunteers } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class ListVisitsEndpoint extends ApiRoute {
  schema = {
    tags: ["Field Visits"],
    summary: "List volunteer visits",
    description:
      "Retrieves volunteer visit tasks and logs (Surface 4 & Surface 1).\n\n" +
      "### Scoping Rules:\n" +
      "- **Cadre RT:** Returns all visits across the RT territory (`communityUnitId`).\n" +
      "- **Volunteer:** Returns visits assigned directly to the authenticated volunteer (`volunteerId`).\n\n" +
      "### Filters (`query`):\n" +
      "- `status`: Filter by `'pending'` (active to-do tasks) or `'completed'` (history logs).\n" +
      "- `visitType`: Filter by `'routine'` or `'escalation'`.\n" +
      "- `elderlyId`: Filter visits for a specific senior citizen.",
    request: {
      query: VisitListQuerySchema,
    },
    responses: {
      "200": {
        description: "List of volunteer visits",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(VolunteerVisitSchema),
            }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "cadre", "volunteer", "admin");
    const db = c.get("db");
    const query = c.req.query() as typeof VisitListQuerySchema._type;

    const conditions = [];

    // Role-based tenant / assignment scoping
    if (session.user.role === "cadre") {
      const communityUnitId = assertCommunity(session);
      conditions.push(eq(volunteerVisits.communityUnitId, communityUnitId));
    } else if (session.user.role === "volunteer") {
      // Find volunteer record by authenticated userId
      const vol = await db.query.volunteers.findFirst({
        where: eq(volunteers.userId, session.user.id),
      });
      if (vol) {
        conditions.push(eq(volunteerVisits.volunteerId, vol.id));
      } else {
        // Fallback: if volunteer record not linked yet, return empty list
        return c.json({ success: true, data: [] });
      }
    }

    // Optional query filters
    if (query.status) {
      conditions.push(eq(volunteerVisits.status, query.status));
    }
    if (query.visitType) {
      conditions.push(eq(volunteerVisits.visitType, query.visitType));
    }
    if (query.elderlyId) {
      conditions.push(eq(volunteerVisits.elderlyId, query.elderlyId));
    }

    const records = await db.query.volunteerVisits.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(volunteerVisits.createdAt)],
    });

    const data = records.map((v) => ({
      ...v,
      tokenExpiresAt: v.tokenExpiresAt.toISOString(),
      visitedAt: v.visitedAt ? v.visitedAt.toISOString() : null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    }));

    return c.json({ success: true, data });
  }
}
