import { z, UpdateElderlyStatusInputSchema, ElderlySchema } from "@kabarin/types";
import { eq, elderly } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";

export class UpdateElderlyStatusEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly Management"],
    summary: "Update elderly welfare status (Manual Override & Bot Integration)",
    description:
      "### Dual-Flow Architecture & Integration Context:\n" +
      "- **🤖 Automated Bot Engine (Primary):** The senior's traffic-light welfare status (`green`, `yellow`, `red`, `grey`) is automatically calculated and updated by the AI Care Agent / WhatsApp Baileys Bot after processing daily greeting responses (Whisper voice notes or text sentiment) or upon check-in timeout.\n" +
      "- **👤 Manual Override (This Endpoint):** Used by RT Cadres or designated Volunteers when a health change or emergency occurs outside the morning check-in window (e.g. sudden hospitalization, in-person discovery of an accident).\n\n" +
      "### Multi-Role Access Control:\n" +
      "- **Cadre RT:** Full override access for all seniors residing in the RT territory.\n" +
      "- **Volunteer:** Strictly limited to assigned seniors under their designated caregiving responsibility.",
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: { "application/json": { schema: UpdateElderlyStatusInputSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Status updated successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: ElderlySchema,
            }),
          },
        },
      },
      "403": {
        description: "Forbidden: Not permitted to update status for this elderly",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "404": {
        description: "Elderly not found",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "cadre", "volunteer", "admin");
    const db = c.get("db");

    const { id } = c.req.param();
    const body = await c.req.json<typeof UpdateElderlyStatusInputSchema._type>();

    // 1. Verify access via Policy Layer (ensures volunteer can only update assigned elderly)
    await assertElderlyAccess(db, session, id);

    // 2. Perform status update
    const [updated] = await db
      .update(elderly)
      .set({
        currentStatus: body.status,
        ...(body.notes && { notes: body.notes }),
        updatedAt: new Date(),
      })
      .where(eq(elderly.id, id))
      .returning();

    return c.json({
      success: true,
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  }
}
