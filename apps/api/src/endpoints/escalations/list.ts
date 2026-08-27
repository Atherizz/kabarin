import { z, EscalationLogSchema, EscalationListQuerySchema } from "@kabarin/types";
import { eq, and, desc, escalationLogs } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class ListEscalationsEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly Verification & Escalations"],
    summary: "List emergency escalation incident logs for RT territory",
    description:
      "Returns emergency escalation incidents across the RT territory (Surface 1: Cadre RT Dashboard).\n\n" +
      "### Lifecycle & Scoping:\n" +
      "- Scoped strictly to the authenticated Cadre's RT (`communityUnitId`).\n" +
      "- **Filter by Status:** `'open'` (active incidents requiring attention) or `'resolved'` (historical archive).\n" +
      "- **Filter by Tier:** Tier 1 (Volunteer check), Tier 2 (Family alert), Tier 3 (Clinic/Ambulance referral).",
    request: {
      query: EscalationListQuerySchema,
    },
    responses: {
      "200": {
        description: "List of escalation incidents",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(EscalationLogSchema),
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
    const query = EscalationListQuerySchema.parse(c.req.query());

    const conditions = [eq(escalationLogs.communityUnitId, communityUnitId)];

    if (query.status) {
      conditions.push(eq(escalationLogs.status, query.status));
    }
    if (query.tier) {
      conditions.push(eq(escalationLogs.tier, Number(query.tier)));
    }
    if (query.elderlyId) {
      conditions.push(eq(escalationLogs.elderlyId, query.elderlyId));
    }

    const records = await db.query.escalationLogs.findMany({
      where: and(...conditions),
      orderBy: [desc(escalationLogs.createdAt)],
    });

    const data = records.map((r) => ({
      ...r,
      familyNotifiedAt: r.familyNotifiedAt ? r.familyNotifiedAt.toISOString() : null,
      puskesmasDispatchedAt: r.puskesmasDispatchedAt
        ? r.puskesmasDispatchedAt.toISOString()
        : null,
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return c.json({ success: true, data });
  }
}
