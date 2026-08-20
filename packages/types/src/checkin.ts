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

export const AiTriageResultSchema = z.object({
  urgency: AiTriageUrgencyEnum,
  symptoms: z.array(z.string()),
  medicationCompliance: z.boolean().nullable(),
  clinicalReasoning: z.string(),
  recommendedAction: z.string(),
  toolsExecuted: z.array(z.string()),
});

export const CheckinSessionSchema = z.object({
  id: z.string(),
  communityUnitId: z.string(),
  elderlyId: z.string(),
  sessionDate: z.string(),
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
});

export type CheckinStatus = z.infer<typeof CheckinStatusEnum>;
export type ReplyType = z.infer<typeof ReplyTypeEnum>;
export type AiTriageUrgency = z.infer<typeof AiTriageUrgencyEnum>;
export type AiTriageResult = z.infer<typeof AiTriageResultSchema>;
export type CheckinSession = z.infer<typeof CheckinSessionSchema>;
