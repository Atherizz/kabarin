import { z, EscalationLogSchema, ResolveEscalationBodySchema } from "@kabarin/types";
import { eq, and, escalationLogs, elderly } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class ResolveEscalationEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly Verification & Escalations"],
    summary: "Resolve an active escalation incident (Manual Cadre Fallback)",
    description:
      "Manual resolution endpoint for RT Cadres to close an active emergency incident once the situation is confirmed safe on the ground.\n\n" +
      "### Automated Effects:\n" +
      "- Marks the escalation status as `'resolved'` with an audit timestamp and the Cadre's identity.\n" +
      "- Resets the senior's welfare status back to **GREEN** (`'green'`).",
    request: {
      params: z.object({
        id: z.string().describe("Escalation log UUID"),
      }),
      body: {
        content: { "application/json": { schema: ResolveEscalationBodySchema } },
        required: false,
      },
    },
    responses: {
      "200": {
        description: "Escalation incident resolved successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              message: z.string(),
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
    const body: { resolutionNotes?: string } = await c.req
      .json<{ resolutionNotes?: string }>()
      .catch(() => ({}));

    // 1. Verify escalation exists in cadre's RT
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

    const now = new Date();
    const currentHistory = record.tierHistory ?? [];
    const updatedHistory = [
      ...currentHistory,
      {
        tier: record.tier,
        action: "cadre_manual_resolution",
        targetType: "cadre" as const,
        targetName: session.user.name,
        targetId: session.user.id,
        note: body.resolutionNotes ?? "Diselesaikan secara manual oleh Kader RT.",
        timestamp: now.toISOString(),
      },
    ];

    // 2. Update escalation log
    const [updated] = await db
      .update(escalationLogs)
      .set({
        status: "resolved",
        resolvedAt: now,
        resolvedBy: session.user.name,
        resolutionNotes: body.resolutionNotes ?? "Diselesaikan secara manual oleh Kader RT.",
        tierHistory: updatedHistory,
        updatedAt: now,
      })
      .where(eq(escalationLogs.id, escalationId))
      .returning();

    // 3. Reset elderly status to green
    await db
      .update(elderly)
      .set({
        currentStatus: "green",
        updatedAt: now,
      })
      .where(eq(elderly.id, record.elderlyId));

    return c.json({
      success: true,
      message: "Insiden eskalasi berhasil diselesaikan. Status lansia telah kembali Aman (Hijau).",
      data: {
        ...updated,
        familyNotifiedAt: updated.familyNotifiedAt
          ? updated.familyNotifiedAt.toISOString()
          : null,
        puskesmasDispatchedAt: updated.puskesmasDispatchedAt
          ? updated.puskesmasDispatchedAt.toISOString()
          : null,
        resolvedAt: updated.resolvedAt ? updated.resolvedAt.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  }
}
