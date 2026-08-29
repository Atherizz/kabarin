import { z, BriefingResponseSchema } from "@kabarin/types";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";
import { generateDailyBriefing } from "../../lib/ai/briefing-service";

export class GetDashboardBriefingEndpoint extends ApiRoute {
  schema = {
    tags: ["Community & Dashboard"],
    summary: "Get AI-generated Daily Operational Briefing for Cadre RT",
    description:
      "### Daily Operational Briefing\n\n" +
      "Generates a natural language morning briefing synthesizing all urgent operational data for the RT territory. " +
      "Powered by Azure OpenAI with a **15-minute in-memory cache** per RT to avoid redundant AI calls.\n\n" +
      "### Includes:\n" +
      "- AI-written briefing paragraph (named seniors, not just numbers)\n" +
      "- Sorted action items: open escalations → missed check-ins → pending verifications → pending visits\n" +
      "- Raw stat snapshot for programmatic use",
    responses: {
      "200": {
        description: "Daily briefing generated successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: BriefingResponseSchema,
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

    const briefing = await generateDailyBriefing(db, c.env, communityUnitId);

    return c.json({ success: true, data: briefing });
  }
}
