import { z } from "./zod-extended";

export const VisitTypeEnum = z.enum(["routine", "escalation"]);
export const VisitStatusEnum = z.enum(["pending", "completed", "expired"]);
export const ReportedConditionEnum = z.enum(["good", "unwell", "emergency"]);

export const VolunteerVisitSchema = z.object({
  id: z.string(),
  communityUnitId: z.string(),
  elderlyId: z.string(),
  volunteerId: z.string().nullable().optional(),
  escalationLogId: z.string().nullable().optional(),
  visitType: VisitTypeEnum,
  formToken: z.string(),
  tokenExpiresAt: z.string().datetime(),
  status: VisitStatusEnum,
  visitedAt: z.string().datetime().nullable().optional(),
  reportedCondition: ReportedConditionEnum.nullable().optional(),
  reportedCause: z.string().nullable().optional(),
  medicationTaken: z.boolean().nullable().optional(),
  volunteerNotes: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateVolunteerVisitInputSchema = z.object({
  communityUnitId: z.string().min(1),
  elderlyId: z.string().min(1),
  volunteerId: z.string().optional(),
  escalationLogId: z.string().optional(),
  visitType: VisitTypeEnum.default("routine"),
});

export const SubmitVisitReportSchema = z.object({
  formToken: z.string().min(1),
  reportedCondition: ReportedConditionEnum,
  reportedCause: z.string().optional(),
  medicationTaken: z.boolean().optional(),
  volunteerNotes: z.string().optional(),
  photoUrl: z.string().optional(),
});

export type VisitType = z.infer<typeof VisitTypeEnum>;
export type VisitStatus = z.infer<typeof VisitStatusEnum>;
export type ReportedCondition = z.infer<typeof ReportedConditionEnum>;
export type VolunteerVisit = z.infer<typeof VolunteerVisitSchema>;
export type CreateVolunteerVisitInput = z.infer<typeof CreateVolunteerVisitInputSchema>;
export type SubmitVisitReportInput = z.infer<typeof SubmitVisitReportSchema>;
