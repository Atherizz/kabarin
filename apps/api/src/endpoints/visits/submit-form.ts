import { z, SubmitVisitReportSchema } from "@kabarin/types";
import { eq, volunteerVisits, elderly } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";

export class SubmitVisitFormEndpoint extends ApiRoute {
  schema = {
    tags: ["Public Field Reports (Zero-Login)"],
    summary: "Submit on-site visit report (Zero-Login via WhatsApp link)",
    description:
      "Public zero-login endpoint for volunteers to submit physical observation reports.\n\n" +
      "### Automated System Cascade:\n" +
      "- **Condition `'good'`:** Instantly resets elderly welfare status to **GREEN** (`'green'`).\n" +
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
        description: "Visit report submitted successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              message: z.string(),
              data: z.object({
                visitId: z.string(),
                elderlyId: z.string(),
                elderlyStatus: z.string(),
                visitedAt: z.string(),
                reportedCondition: z.string(),
              }),
            }),
          },
        },
      },
      "404": {
        description: "Invalid visit form token",
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
        volunteerNotes: body.volunteerNotes ?? null,
        photoUrl: body.photoUrl ?? null,
        updatedAt: now,
      })
      .where(eq(volunteerVisits.id, visit.id))
      .returning();

    // 3. Determine new traffic-light status for elderly
    let newStatus: "green" | "yellow" | "red" = "green";
    if (body.reportedCondition === "unwell") {
      newStatus = "yellow";
    } else if (body.reportedCondition === "emergency") {
      newStatus = "red";
    }

    await db
      .update(elderly)
      .set({
        currentStatus: newStatus,
        updatedAt: now,
      })
      .where(eq(elderly.id, visit.elderly.id));

    const statusMessage =
      newStatus === "green"
        ? "Laporan berhasil terkirim! Status lansia telah diperbarui menjadi Aman (Hijau)."
        : newStatus === "yellow"
        ? "Laporan tercatat! Sistem meneruskan notifikasi pemantauan lanjutan ke keluarga lansia."
        : "Laporan Darurat tercatat! Notifikasi siaga kritis segera dikirim ke Kader RT dan Puskesmas.";

    return c.json({
      success: true,
      message: statusMessage,
      data: {
        visitId: updatedVisit.id,
        elderlyId: visit.elderly.id,
        elderlyStatus: newStatus,
        visitedAt: now.toISOString(),
        reportedCondition: body.reportedCondition,
      },
    });
  }
}
