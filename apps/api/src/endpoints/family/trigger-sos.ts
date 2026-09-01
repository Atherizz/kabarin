import { z, TriggerFamilySosInputSchema } from "@kabarin/types";
import { eq, and, inArray, elderly, elderlyFamily, escalationLogs } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { triggerBotWebhook } from "../../lib/bot-webhook";
import crypto from "crypto";

export class TriggerFamilySosEndpoint extends ApiRoute {
  schema = {
    tags: ["Public Status (Zero-Login)"],
    summary: "Trigger on-demand SOS alert (Kirim Kabar Sekarang - Family Fallback)",
    description:
      "### Dual-Flow Architecture & Integration Context:\n" +
      "- **🤖 Automated Bot Engine (Primary):** Regular welfare checks occur autonomously each morning according to the senior's `preferredCheckinTime`.\n" +
      "- **👤 On-Demand Family Fallback (This Endpoint):** Family members can manually press the 'Kirim Kabar Sekarang' SOS button from the zero-login status page (`/status/:token`) if they lose contact with their parent or suspect an emergency outside regular check-in hours.\n\n" +
      "### Automated System Cascade:\n" +
      "- Immediately escalates to **Tier 3 Emergency** (`tier: 3`, `triggerReason: 'family_on_demand'`).\n" +
      "- Sets the elderly's welfare status to **RED** (`'red'`).\n" +
      "- Deduplicates and appends repeated clicks to the active escalation's `tierHistory` audit log.",
    request: {
      params: z.object({
        token: z.string().describe("Unique 64-character family access token from URL"),
      }),
      body: {
        content: { "application/json": { schema: TriggerFamilySosInputSchema } },
        required: false,
      },
    },
    responses: {
      "200": {
        description: "Emergency alert triggered successfully",
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
        description: "Invalid access token",
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
    const body: { reason?: string } = await c.req
      .json<{ reason?: string }>()
      .catch(() => ({}));

    // 1. Verify family member by access token
    const familyLink = await db.query.elderlyFamily.findFirst({
      where: eq(elderlyFamily.accessToken, token),
      with: {
        elderly: true,
      },
    });

    if (!familyLink || !familyLink.elderly) {
      return c.json(
        {
          success: false,
          error: "Tautan akses tidak valid atau sudah tidak aktif.",
        },
        404
      );
    }

    const targetElderly = familyLink.elderly;
    const now = new Date();
    const nowIso = now.toISOString();

    // 2. Check for an existing open/in_progress escalation to prevent duplicates
    const existingEscalation = await db.query.escalationLogs.findFirst({
      where: and(
        eq(escalationLogs.elderlyId, targetElderly.id),
        inArray(escalationLogs.status, ["open", "in_progress"])
      ),
    });

    let resolvedEscalationId: string;
    let resolvedStatus: string;

    if (existingEscalation) {
      // Append to existing active escalation timeline
      const updatedHistory = [
        ...(existingEscalation.tierHistory ?? []),
        {
          tier: 3,
          action: "family_sos_button_retriggered",
          targetType: "family" as const,
          targetId: familyLink.id,
          targetName: familyLink.name,
          targetPhone: familyLink.phone,
          note:
            body.reason ||
            "Keluarga menekan ulang tombol darurat 'Kirim Kabar Sekarang'.",
          timestamp: nowIso,
        },
      ];

      await db
        .update(escalationLogs)
        .set({
          tier: 3,
          tierHistory: updatedHistory,
          updatedAt: now,
        })
        .where(eq(escalationLogs.id, existingEscalation.id));

      resolvedEscalationId = existingEscalation.id;
      resolvedStatus = existingEscalation.status;
    } else {
      // Insert new Tier 3 escalation
      const escalationId = crypto.randomUUID();
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

      resolvedEscalationId = escalation.id;
      resolvedStatus = escalation.status;
    }

    // 3. Set elderly status to red (critical)
    await db
      .update(elderly)
      .set({ currentStatus: "red", updatedAt: now })
      .where(eq(elderly.id, targetElderly.id));

    triggerBotWebhook(c, {
      event: "family-sos",
      payload: {
        elderlyId: targetElderly.id,
        reason: body.reason || "Keluarga menekan tombol darurat 'Kirim Kabar Sekarang'.",
      },
    });

    return c.json({
      success: true,
      message: `Sinyal darurat berhasil dikirim! Relawan dan Kader RT ${targetElderly.rt} segera menerima notifikasi siaga.`,
      data: {
        escalationId: resolvedEscalationId,
        elderlyId: targetElderly.id,
        elderlyName: targetElderly.name,
        tier: 3,
        status: resolvedStatus,
      },
    });
  }
}
