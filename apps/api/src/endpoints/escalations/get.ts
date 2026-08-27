import { z, EscalationLogSchema } from "@kabarin/types";
import { eq, and, escalationLogs } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class GetEscalationEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly Verification & Escalations"],
    summary: "Get escalation incident details and audit trail timeline",
    description:
      "Returns full details of a specific escalation incident, including its complete audit trail timeline (`tierHistory`) and responders involved.",
    request: {
      params: z.object({
        id: z.string().describe("Escalation log UUID"),
      }),
    },
    responses: {
      "200": {
        description: "Escalation incident details and audit trail",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: EscalationLogSchema,
            }),
          },
        },
      },
      "404": {
        description: "Escalation incident not found in this RT",
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
    const { id: escalationId } = c.req.param();

    const record = await db.query.escalationLogs.findFirst({
      where: and(
        eq(escalationLogs.id, escalationId),
        eq(escalationLogs.communityUnitId, communityUnitId)
      ),
    });

    if (!record) {
      return c.json(
        { success: false, error: "Data insiden eskalasi tidak ditemukan di RT ini" },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        ...record,
        familyNotifiedAt: record.familyNotifiedAt
          ? record.familyNotifiedAt.toISOString()
          : null,
        puskesmasDispatchedAt: record.puskesmasDispatchedAt
          ? record.puskesmasDispatchedAt.toISOString()
          : null,
        resolvedAt: record.resolvedAt ? record.resolvedAt.toISOString() : null,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      },
    });
  }
}
