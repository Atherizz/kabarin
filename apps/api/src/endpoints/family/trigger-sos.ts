import { z, TriggerFamilySosInputSchema } from "@kabarin/types";
import { eq, elderly, elderlyFamily, escalationLogs } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";

export class TriggerFamilySosEndpoint extends ApiRoute {
  schema = {
    tags: ["Public Status (Zero-Login)"],
    summary: "Trigger on-demand SOS alert (Kirim Kabar Sekarang)",
    description:
      "Zero-login endpoint accessible via the family's personal status page token. " +
      "Allows a family member to manually trigger a **Tier 3 emergency alert** when they cannot reach their elderly parent.\n\n" +
      "### What happens on trigger:\n" +
      "1. Creates a new `escalation_logs` record (`tier: 3`, `trigger_reason: 'family_on_demand'`)\n" +
      "2. Sets the elderly's `currentStatus` to `red` (Critical)\n" +
      "3. The escalation system will dispatch WhatsApp alerts to assigned volunteers and RT Cadre\n\n" +
      "### Body:\n" +
      "- `reason` *(optional)*: A brief note from the family member. Appended to the escalation audit trail.",
    request: {
      params: z.object({
        token: z.string().describe("Unique 64-character family access token from WhatsApp link"),
      }),
      body: {
        content: { "application/json": { schema: TriggerFamilySosInputSchema } },
        required: false,
      },
    },
    responses: {
      "200": {
        description: "SOS alert triggered successfully — volunteers and RT Cadre notified",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              message: z.string(),
              data: z.object({
                escalationId: z.string(),
                elderlyId: z.string(),
                elderlyName: z.string(),
                tier: z.number(),
                status: z.string(),
              }),
            }),
          },
        },
      },
      "404": {
        description: "Invalid or unrecognized family access token",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const db = c.get("db");
    const { token } = c.req.param();
    const body: { reason?: string } = await c.req.json<{ reason?: string }>().catch(() => ({}));

    // Lookup family member by token, join with elderly + communityUnit
    const familyLink = await db.query.elderlyFamily.findFirst({
      where: eq(elderlyFamily.accessToken, token),
      with: {
        elderly: {
          with: {
            communityUnit: true,
          },
        },
      },
    });

    if (!familyLink || !familyLink.elderly) {
      return c.json(
        { success: false, error: "Token akses keluarga tidak valid atau tidak ditemukan." },
        404
      );
    }

    const targetElderly = familyLink.elderly;
    const escalationId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // Insert Tier 3 escalation — family_on_demand trigger
    const [escalation] = await db
      .insert(escalationLogs)
      .values({
        id: escalationId,
        communityUnitId: targetElderly.communityUnitId,
        elderlyId: targetElderly.id,
        triggeredByFamilyId: familyLink.id,
        tier: 3,
        triggerReason: "family_on_demand",
        status: "open",
        tierHistory: [
          {
            tier: 3,
            action: "family_sos_button_pressed",
            targetType: "family",
            targetId: familyLink.id,
            targetName: familyLink.name,
            targetPhone: familyLink.phone,
            note:
              body.reason ||
              "Keluarga menekan tombol 'Kirim Kabar Sekarang' pada halaman pemantauan.",
            timestamp: nowIso,
          },
        ],
      })
      .returning();

    // Set elderly status to red (critical)
    await db
      .update(elderly)
      .set({ currentStatus: "red", updatedAt: new Date() })
      .where(eq(elderly.id, targetElderly.id));

    return c.json({
      success: true,
      message: `Sinyal darurat berhasil dikirim! Relawan dan Kader RT ${targetElderly.rt} segera menerima notifikasi siaga.`,
      data: {
        escalationId: escalation.id,
        elderlyId: targetElderly.id,
        elderlyName: targetElderly.name,
        tier: escalation.tier,
        status: escalation.status,
      },
    });
  }
}
