import { z, SubmitVisitReportSchema } from "@kabarin/types";
import { eq, and, inArray, volunteerVisits, elderly, escalationLogs, volunteers, elderlyFamily } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { triggerBotWebhook } from "../../lib/bot-webhook";
import crypto from "crypto";

export class SubmitVisitFormEndpoint extends ApiRoute {
  schema = {
    tags: ["Public Field Reports (Zero-Login)"],
    summary: "Submit on-site visit report (Zero-Login via WhatsApp link)",
    description:
      "Public zero-login endpoint for volunteers to submit physical observation reports.\n\n" +
      "### Automated System Cascade:\n" +
      "- **Condition `'good'`:** Instantly resets elderly welfare status to **GREEN** (`'green'`) and auto-resolves any active escalations.\n" +
      "- **Condition `'unwell'`:** Sets status to **YELLOW** (`'yellow'`) and prepares Tier 2 alerts for family.\n" +
      "- **Condition `'emergency'`:** Sets status to **RED** (`'red'`) and triggers immediate Tier 3 alerts for RT Cadre & healthcare clinics.",
    request: {
      params: z.object({
        token: z.string().describe("Unique 64-character visit form token from WhatsApp alert link"),
      }),
      body: {
        content: { "application/json": { schema: SubmitVisitReportSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Visit report submitted and processed successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              message: z.string(),
              data: z.object({
                visitId: z.string(),
                elderlyId: z.string(),
                reportedCondition: z.string(),
                elderlyStatus: z.string(),
                visitedAt: z.string().datetime(),
              }),
            }),
          },
        },
      },
      "404": {
        description: "Invalid or non-existent visit form token",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "409": {
        description: "Visit report has already been submitted",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "410": {
        description: "Visit form link has expired",
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
    const body = await c.req.json<typeof SubmitVisitReportSchema._type>();

    // 1. Find visit record by token
    const visit = await db.query.volunteerVisits.findFirst({
      where: eq(volunteerVisits.formToken, token),
      with: {
        elderly: true,
      },
    });

    if (!visit || !visit.elderly) {
      return c.json(
        { success: false, error: "Link form kunjungan tidak valid atau tidak ditemukan." },
        404
      );
    }

    if (visit.status === "completed") {
      return c.json(
        { success: false, error: "Laporan kunjungan ini sudah pernah dikirimkan sebelumnya." },
        409
      );
    }

    if (new Date() > visit.tokenExpiresAt || visit.status === "expired") {
      return c.json(
        { success: false, error: "Link form kunjungan ini sudah kedaluwarsa (hanya berlaku 24 jam)." },
        410
      );
    }

    const now = new Date();

    // 2. Update visit record
    const [updatedVisit] = await db
      .update(volunteerVisits)
      .set({
        status: "completed",
        visitedAt: now,
        reportedCondition: body.reportedCondition,
        reportedCause: body.reportedCause ?? null,
        medicationTaken: body.medicationTaken ?? null,
        checklistResponses: body.checklistResponses ?? null,
        volunteerNotes: body.volunteerNotes ?? null,
        photoUrl: body.photoUrl ?? null,
        updatedAt: now,
      })
      .where(eq(volunteerVisits.id, visit.id))
      .returning();

    // 3. Auto-resolve or escalate linked active escalation logs (covers both 'open' and 'in_progress')
    if (body.reportedCondition === "good") {
      const activeEscalations = await db.query.escalationLogs.findMany({
        where: and(
          eq(escalationLogs.elderlyId, visit.elderly.id),
          inArray(escalationLogs.status, ["open", "in_progress"])
        ),
      });

      for (const esc of activeEscalations) {
        const updatedHistory = [
          ...(esc.tierHistory ?? []),
          {
            tier: esc.tier,
            action: "volunteer_visit_resolved",
            targetType: "volunteer" as const,
            targetId: visit.volunteerId ?? null,
            note: `Kunjungan selesai: ${body.volunteerNotes ?? "Kondisi lansia aman dan sehat"}`,
            timestamp: now.toISOString(),
          },
        ];

        await db
          .update(escalationLogs)
          .set({
            status: "resolved",
            resolvedAt: now,
            resolvedBy: "volunteer_visit",
            resolutionNotes: `Kunjungan lapangan selesai oleh relawan. Kondisi lansia aman & sehat (${body.reportedCause ?? "sudah dicek"}).`,
            tierHistory: updatedHistory,
            updatedAt: now,
          })
          .where(eq(escalationLogs.id, esc.id));
      }
    } else if (body.reportedCondition === "emergency") {
      const activeEscalation = await db.query.escalationLogs.findFirst({
        where: and(
          eq(escalationLogs.elderlyId, visit.elderly.id),
          inArray(escalationLogs.status, ["open", "in_progress"])
        ),
      });

      if (!activeEscalation) {
        await db.insert(escalationLogs).values({
          id: crypto.randomUUID(),
          communityUnitId: visit.elderly.communityUnitId,
          elderlyId: visit.elderly.id,
          tier: 3,
          triggerReason: "visit_emergency",
          status: "open",
          tierHistory: [
            {
              tier: 3,
              action: "volunteer_reported_emergency",
              targetType: "volunteer",
              targetId: visit.volunteerId ?? null,
              note: body.volunteerNotes || "Relawan melaporkan kondisi darurat saat kunjungan fisik.",
              timestamp: now.toISOString(),
            },
          ],
        });
      } else {
        const updatedHistory = [
          ...(activeEscalation.tierHistory ?? []),
          {
            tier: 3,
            action: "volunteer_reported_emergency",
            targetType: "volunteer" as const,
            targetId: visit.volunteerId ?? null,
            note: body.volunteerNotes || "Relawan melaporkan eskalasi darurat saat kunjungan fisik.",
            timestamp: now.toISOString(),
          },
        ];

        await db
          .update(escalationLogs)
          .set({
            tier: 3,
            tierHistory: updatedHistory,
            updatedAt: now,
          })
          .where(eq(escalationLogs.id, activeEscalation.id));
      }
    }

    // 4. Update elderly welfare status
    const newStatus =
      body.reportedCondition === "good"
        ? "green"
        : body.reportedCondition === "unwell"
          ? "yellow"
          : "red";

    const [updatedElderly] = await db
      .update(elderly)
      .set({
        currentStatus: newStatus,
        notes: body.volunteerNotes
          ? `${visit.elderly.notes ? visit.elderly.notes + " | " : ""}[Kunjungan]: ${body.volunteerNotes}`
          : visit.elderly.notes,
        updatedAt: now,
      })
      .where(eq(elderly.id, visit.elderly.id))
      .returning();

    // 5. Notify family members via WhatsApp if condition is good (resolved)
    if (body.reportedCondition === "good") {
      const famMembers = await db.query.elderlyFamily.findMany({
        where: eq(elderlyFamily.elderlyId, visit.elderly.id),
      });

      let volName = "Relawan RT";
      if (visit.volunteerId) {
        const vol = await db.query.volunteers.findFirst({
          where: eq(volunteers.id, visit.volunteerId),
        });
        if (vol) volName = vol.name;
      }

      triggerBotWebhook(c, {
        event: "escalation-resolved",
        payload: {
          elderlyId: visit.elderly.id,
          elderlyName: visit.elderly.name,
          rt: visit.elderly.rt,
          communityUnitId: visit.elderly.communityUnitId,
          volunteerName: volName,
          resolutionNotes: body.volunteerNotes || "Kunjungan fisik telah selesai, kondisi lansia aman dan stabil.",
          familyContacts: famMembers.map((f) => ({
            name: f.name,
            phone: f.phone,
            accessToken: f.accessToken,
          })),
        },
      });
    }

    return c.json({
      success: true,
      message: `Laporan kunjungan berhasil disimpan. Status lansia diperbarui menjadi ${newStatus.toUpperCase()}.`,
      data: {
        visitId: updatedVisit.id,
        elderlyId: updatedElderly.id,
        reportedCondition: body.reportedCondition,
        elderlyStatus: updatedElderly.currentStatus,
        visitedAt: updatedVisit.visitedAt ? updatedVisit.visitedAt.toISOString() : now.toISOString(),
      },
    });
  }
}
