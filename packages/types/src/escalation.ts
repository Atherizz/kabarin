import { z } from "./zod-extended";

export const EscalationStatusEnum = z.enum([
  "open",
  "in_progress",
  "resolved",
  "cancelled",
]);

export const EscalationTriggerReasonEnum = z.enum([
  "no_response",
  "ai_urgent_triage",
  "manual_trigger",
  "family_on_demand",
  "visit_emergency",
]);

export const TierHistoryItemSchema = z.object({
  tier: z.number(),
  action: z.string(),
  targetType: z.enum(["volunteer", "family", "cadre", "broadcast"]).optional(),
  targetId: z.string().nullable().optional(),
  targetName: z.string().nullable().optional(),
  targetPhone: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  timestamp: z.string(),
});

export const EscalationLogSchema = z.object({
  id: z.string(),
  communityUnitId: z.string(),
  elderlyId: z.string(),
  checkinSessionId: z.string().nullable().optional(),
  triggeredByFamilyId: z.string().nullable().optional(),
  tier: z.number().min(1).max(3),
  triggerReason: EscalationTriggerReasonEnum,
  status: EscalationStatusEnum,
  tierHistory: z.array(TierHistoryItemSchema).default([]),
  familyNotifiedAt: z.string().datetime().nullable().optional(),
  puskesmasReferralDispatched: z.boolean(),
  puskesmasDispatchedAt: z.string().datetime().nullable().optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
  resolvedBy: z.string().nullable().optional(),
  resolutionNotes: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateEscalationInputSchema = z.object({
  communityUnitId: z.string().min(1),
  elderlyId: z.string().min(1),
  checkinSessionId: z.string().optional(),
  triggeredByFamilyId: z.string().optional(),
  tier: z.number().min(1).max(3).default(1),
  triggerReason: EscalationTriggerReasonEnum,
});

export const ResolveEscalationBodySchema = z
  .object({
    resolutionNotes: z
      .string()
      .optional()
      .describe("Notes explaining the on-site resolution or medical action taken"),
  })
  .openapi({
    example: {
      resolutionNotes:
        "Lansia sudah diantar ke Puskesmas oleh keluarga, kondisi stabil dan sudah beristirahat di rumah.",
    },
  });

export const EscalationListQuerySchema = z.object({
  status: EscalationStatusEnum.optional(),
  tier: z.coerce.number().min(1).max(3).optional(),
  elderlyId: z.string().optional(),
});

export type EscalationStatus = z.infer<typeof EscalationStatusEnum>;
export type EscalationTriggerReason = z.infer<typeof EscalationTriggerReasonEnum>;
export type TierHistoryItem = z.infer<typeof TierHistoryItemSchema>;
export type EscalationLog = z.infer<typeof EscalationLogSchema>;
export type CreateEscalationInput = z.infer<typeof CreateEscalationInputSchema>;
export type ResolveEscalationBody = z.infer<typeof ResolveEscalationBodySchema>;
export type EscalationListQuery = z.infer<typeof EscalationListQuerySchema>;
