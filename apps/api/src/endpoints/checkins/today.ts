import { z, TodayCheckinSummarySchema } from "@kabarin/types";
import { eq, and, desc, checkinSessions } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class TodayCheckinsEndpoint extends ApiRoute {
  schema = {
    tags: ["Check-in Monitoring"],
    summary: "Get live real-time check-in monitoring summary for today",
    description:
      "Provides a real-time live monitoring dashboard summary of today's WhatsApp greeting batches across the RT territory (Surface 1).\n\n" +
      "### Metrics Returned:\n" +
      "- `totalScheduled`: Number of senior citizens scheduled for check-in today.\n" +
      "- `sent`: Greetings dispatched to WhatsApp.\n" +
      "- `replied`: Seniors who have safely responded (**Green**).\n" +
      "- `pending`: Seniors currently in the grace period awaiting reply.\n" +
      "- `escalated`: Seniors flagged for field responder intervention (**Yellow / Red**).\n" +
      "- `responseRate`: Real-time percentage completion rate.",
    responses: {
      "200": {
        description: "Today's live check-in summary metrics",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: TodayCheckinSummarySchema,
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

    const todayStr = new Date().toISOString().split("T")[0];

    const records = await db.query.checkinSessions.findMany({
      where: and(
        eq(checkinSessions.communityUnitId, communityUnitId),
        eq(checkinSessions.sessionDate, todayStr)
      ),
      orderBy: [desc(checkinSessions.sentAt)],
    });

    const totalScheduled = records.length;
    const sent = records.filter((r) => r.status !== "pending").length;
    const replied = records.filter((r) => r.status === "replied").length;
    const pending = records.filter(
      (r) => r.status === "pending" || r.status === "sent" || r.status === "reminded"
    ).length;
    const escalated = records.filter((r) => r.status === "escalated").length;
    const responseRate =
      totalScheduled > 0 ? Number(((replied / totalScheduled) * 100).toFixed(1)) : 0;

    const formattedSessions = records.map((r) => ({
      ...r,
      sentAt: r.sentAt ? r.sentAt.toISOString() : null,
      reminderSentAt: r.reminderSentAt ? r.reminderSentAt.toISOString() : null,
      repliedAt: r.repliedAt ? r.repliedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return c.json({
      success: true,
      data: {
        date: todayStr,
        totalScheduled,
        sent,
        replied,
        pending,
        escalated,
        responseRate,
        sessions: formattedSessions,
      },
    });
  }
}
