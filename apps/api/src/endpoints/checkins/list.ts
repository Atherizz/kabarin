import { z, CheckinSessionSchema, CheckinListQuerySchema } from "@kabarin/types";
import { eq, and, desc, checkinSessions } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class ListCheckinsEndpoint extends ApiRoute {
  schema = {
    tags: ["Check-in Monitoring"],
    summary: "List daily WhatsApp check-in sessions for RT territory",
    description:
      "Retrieves daily WhatsApp check-in interaction logs across the neighborhood territory (Surface 1: Cadre RT Dashboard).\n\n" +
      "### Scoping & Filters:\n" +
      "- Scoped strictly to the Cadre's RT territory (`communityUnitId`).\n" +
      "- **Filter by Date:** `date=YYYY-MM-DD` to inspect historical daily greeting batches.\n" +
      "- **Filter by Status:** `'pending'`, `'sent'`, `'replied'`, or `'escalated'`.",
    request: {
      query: CheckinListQuerySchema,
    },
    responses: {
      "200": {
        description: "List of check-in sessions",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(CheckinSessionSchema),
            }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "cadre", "admin");
    const communityUnitId = assertCommunity(session);
    const db = c.get("db");
    const query = CheckinListQuerySchema.parse(c.req.query());

    const conditions = [eq(checkinSessions.communityUnitId, communityUnitId)];

    if (query.date) {
      conditions.push(eq(checkinSessions.sessionDate, query.date));
    }
    if (query.status) {
      conditions.push(eq(checkinSessions.status, query.status));
    }
    if (query.elderlyId) {
      conditions.push(eq(checkinSessions.elderlyId, query.elderlyId));
    }

    const records = await db.query.checkinSessions.findMany({
      where: and(...conditions),
      orderBy: [desc(checkinSessions.sessionDate), desc(checkinSessions.sentAt)],
    });

    const data = records.map((r) => ({
      ...r,
      sentAt: r.sentAt ? r.sentAt.toISOString() : null,
      reminderSentAt: r.reminderSentAt ? r.reminderSentAt.toISOString() : null,
      repliedAt: r.repliedAt ? r.repliedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return c.json({ success: true, data });
  }
}
