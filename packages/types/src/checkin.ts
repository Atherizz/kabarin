import { z } from "./zod-extended";

export const CheckinStatusEnum = z.enum([
  "pending",
  "sent",
  "reminded",
  "replied",
  "escalated",
  "resolved",
  "skipped",
]);

export const ReplyTypeEnum = z.enum(["text", "voice", "none"]);

export const AiTriageUrgencyEnum = z.enum(["normal", "needs_attention", "emergency"]);

export const AiTriageResultSchema = z
  .object({
    urgency: AiTriageUrgencyEnum,
    symptoms: z.array(z.string()).default([]),
    medicationCompliance: z.boolean().nullable(),
    clinicalReasoning: z.string(),
    recommendedAction: z.string(),
    toolsExecuted: z.array(z.string()).default([]),
  })
  .openapi({
    example: {
      urgency: "normal",
      symptoms: [],
      medicationCompliance: true,
      clinicalReasoning:
        "Lansia merespons sapaan pagi dalam bahasa Jawa santai, mengonfirmasi sudah sarapan dan sudah minum obat Amlodipine.",
      recommendedAction: "Pertahankan status hijau. Sapa kembali pada sesi siang.",
      toolsExecuted: ["search_health_info(\"pantangan makanan hipertensi\")"],
    },
  });

export const CheckinSessionSchema = z
  .object({
    id: z.string(),
    communityUnitId: z.string(),
    elderlyId: z.string(),
    sessionDate: z.string().describe("Session date in YYYY-MM-DD format"),
    status: CheckinStatusEnum,
    sentAt: z.string().datetime().nullable().optional(),
    reminderSentAt: z.string().datetime().nullable().optional(),
    repliedAt: z.string().datetime().nullable().optional(),
    replyType: ReplyTypeEnum,
    rawText: z.string().nullable().optional(),
    voiceAudioUrl: z.string().nullable().optional(),
    aiTriageResult: AiTriageResultSchema.nullable().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({
    example: {
      id: "chk_7f8a9b1c-2d3e-4f5a-6b7c-8d9e0f1a2b3c",
      communityUnitId: "rt_01_rw_10_lowokwaru",
      elderlyId: "eld_sumo_123",
      sessionDate: "2026-08-22",
      status: "replied",
      sentAt: "2026-08-22T07:00:00.000Z",
      reminderSentAt: null,
      repliedAt: "2026-08-22T07:14:32.000Z",
      replyType: "voice",
      rawText: "Alhamdulillah sehat le, nembe rampung sarapan bubur lan ngombe obat tensi.",
      voiceAudioUrl: "https://storage.kabarin.id/voice-notes/chk_7f8a9b1c.ogg",
      aiTriageResult: {
        urgency: "normal",
        symptoms: [],
        medicationCompliance: true,
        clinicalReasoning:
          "Lansia merespons sapaan pagi dengan lancar, sarapan sudah selesai dan obat tensi sudah diminum.",
        recommendedAction: "Status Hijau tetap dipertahankan.",
        toolsExecuted: ["log_medication_compliance"],
      },
      createdAt: "2026-08-22T07:00:00.000Z",
      updatedAt: "2026-08-22T07:14:32.000Z",
    },
  });

export const CheckinListQuerySchema = z.object({
  date: z.string().optional().describe("Date filter in YYYY-MM-DD format (defaults to all)"),
  status: CheckinStatusEnum.optional().describe("Filter by checkin status"),
  elderlyId: z.string().optional().describe("Filter by elderly UUID"),
});

export const TodayCheckinSummarySchema = z
  .object({
    date: z.string(),
    totalScheduled: z.number().describe("Total active monitored seniors scheduled for today"),
    sent: z.number().describe("Number of check-in greetings already sent to WhatsApp"),
    replied: z.number().describe("Number of seniors who have replied safely (Green)"),
    pending: z.number().describe("Number of seniors currently in the 90-minute grace period"),
    escalated: z.number().describe("Number of sessions that timed out or reported unwell"),
    responseRate: z.number().describe("Response rate percentage (0 - 100%)"),
    sessions: z.array(CheckinSessionSchema),
  })
  .openapi({
    example: {
      date: "2026-08-22",
      totalScheduled: 12,
      sent: 12,
      replied: 10,
      pending: 1,
      escalated: 1,
      responseRate: 83.3,
      sessions: [],
    },
  });

export type CheckinStatus = z.infer<typeof CheckinStatusEnum>;
export type ReplyType = z.infer<typeof ReplyTypeEnum>;
export type AiTriageUrgency = z.infer<typeof AiTriageUrgencyEnum>;
export type AiTriageResult = z.infer<typeof AiTriageResultSchema>;
export type CheckinSession = z.infer<typeof CheckinSessionSchema>;
export type CheckinListQuery = z.infer<typeof CheckinListQuerySchema>;
export type TodayCheckinSummary = z.infer<typeof TodayCheckinSummarySchema>;
