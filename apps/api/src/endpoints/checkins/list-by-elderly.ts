import { z, CheckinSessionSchema } from "@kabarin/types";
import { eq, desc, checkinSessions } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";

export class ListElderlyCheckinsEndpoint extends ApiRoute {
  schema = {
    tags: ["Check-in History & Transcripts"],
    summary: "Get check-in interaction history and voice note transcripts for an elderly",
    description:
      "Retrieves historical WhatsApp check-in responses, Whisper voice transcripts, audio URLs, and AI triage findings for a specific senior citizen.\n\n" +
      "### Multi-Role Access Control:\n" +
      "- **Cadre RT:** Accessible for all seniors residing in the RT territory.\n" +
      "- **Family:** Accessible exclusively for parents/relatives linked to the family account.\n" +
      "- **Volunteer:** Accessible exclusively for seniors assigned to the authenticated volunteer.",
    request: {
      params: z.object({
        id: z.string().describe("Elderly UUID"),
      }),
      query: z.object({
        limit: z.coerce.number().min(1).max(100).optional().default(30),
      }),
    },
    responses: {
      "200": {
        description: "List of check-in interaction sessions and transcripts",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(CheckinSessionSchema),
            }),
          },
        },
      },
      "404": {
        description: "Elderly not found or access denied",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "cadre", "family", "volunteer", "admin");
    const db = c.get("db");
    const { id: elderlyId } = c.req.param();
    const query = c.req.query() as { limit?: string };
    const limit = query.limit ? Math.min(Number(query.limit), 100) : 30;

    // 1. Verify access to elderly (admin / cadre / family / volunteer via Policy Layer)
    await assertElderlyAccess(db, session, elderlyId);

    // 2. Fetch check-in history
    const records = await db.query.checkinSessions.findMany({
      where: eq(checkinSessions.elderlyId, elderlyId),
      orderBy: [desc(checkinSessions.sessionDate), desc(checkinSessions.sentAt)],
      limit,
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
