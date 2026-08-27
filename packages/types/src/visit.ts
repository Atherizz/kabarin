import { z } from "./zod-extended";

export const VisitTypeEnum = z.enum(["routine", "escalation"]);
export const VisitStatusEnum = z.enum(["pending", "completed", "expired"]);
export const ReportedConditionEnum = z.enum(["good", "unwell", "emergency"]);
export const ReportedCauseEnum = z.enum([
  "sleeping",
  "not_home",
  "phone_off",
  "sick_or_fallen",
  "other",
]);

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

export const CreateVolunteerVisitInputSchema = z
  .object({
    elderlyId: z.string().min(1).describe("Target elderly UUID"),
    volunteerId: z
      .string()
      .optional()
      .describe("Assigned volunteer UUID. If omitted, automatically assigned to the elderly's primary volunteer"),
    visitType: VisitTypeEnum.optional().default("routine"),
    notes: z.string().optional().describe("Special instructions or context for the volunteer"),
  })
  .openapi({
    example: {
      elderlyId: "6df33936-f734-464f-ba5b-72af6c4975cc",
      visitType: "routine",
      notes: "Tolong cek kondisi fisik dan ingatkan minum obat amlodipine pagi.",
    },
  });

export const SubmitVisitReportSchema = z
  .object({
    reportedCondition: ReportedConditionEnum.describe(
      "Physical and mental condition observed: 'good' (healthy/safe), 'unwell' (needs monitoring/mild symptoms), 'emergency' (critical/fall/injury)"
    ),
    reportedCause: ReportedCauseEnum.optional().describe(
      "Reason why senior missed WA checkin: 'sleeping', 'not_home', 'phone_off', 'sick_or_fallen', 'other'"
    ),
    medicationTaken: z
      .boolean()
      .optional()
      .describe("Whether the senior has taken their prescribed medications for today"),
    volunteerNotes: z
      .string()
      .optional()
      .describe("Field observations and notes from the visiting volunteer"),
    photoUrl: z
      .string()
      .optional()
      .describe("Optional photo proof URL or document uploaded from the field"),
  })
  .openapi({
    example: {
      reportedCondition: "good",
      reportedCause: "sleeping",
      medicationTaken: true,
      volunteerNotes: "Mbah Sumo sedang istirahat di teras. Kondisi stabil dan sudah sarapan serta minum obat.",
    },
  });

export const VisitPublicFormSchema = z.object({
  visit: z.object({
    id: z.string(),
    visitType: VisitTypeEnum,
    status: VisitStatusEnum,
    tokenExpiresAt: z.string().datetime(),
    notes: z.string().nullable().optional(),
  }),
  elderly: z.object({
    id: z.string(),
    name: z.string(),
    age: z.number(),
    gender: z.enum(["male", "female"]),
    address: z.string(),
    rt: z.string(),
    rw: z.string(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    mobilityStatus: z.string(),
    medicalHistory: z.string().nullable().optional(),
    preferredCheckinTime: z.string(),
  }),
  volunteer: z
    .object({
      id: z.string(),
      name: z.string(),
      phone: z.string(),
    })
    .nullable()
    .optional(),
  medications: z.array(
    z.object({
      id: z.string(),
      conditionName: z.string(),
      medicationName: z.string(),
      dosage: z.string(),
      frequency: z.string(),
      reminderTime: z.string(),
      timingInstruction: z.string(),
      isActive: z.boolean(),
    })
  ),
  community: z.object({
    id: z.string(),
    name: z.string(),
    healthFacilityPhone: z.string().nullable().optional(),
    ambulancePhone: z.string().nullable().optional(),
  }),
});

export const VisitListQuerySchema = z.object({
  status: VisitStatusEnum.optional(),
  visitType: VisitTypeEnum.optional(),
  elderlyId: z.string().optional(),
});

export type VisitType = z.infer<typeof VisitTypeEnum>;
export type VisitStatus = z.infer<typeof VisitStatusEnum>;
export type ReportedCondition = z.infer<typeof ReportedConditionEnum>;
export type ReportedCause = z.infer<typeof ReportedCauseEnum>;
export type VolunteerVisit = z.infer<typeof VolunteerVisitSchema>;
export type CreateVolunteerVisitInput = z.infer<typeof CreateVolunteerVisitInputSchema>;
export type SubmitVisitReportInput = z.infer<typeof SubmitVisitReportSchema>;
export type VisitPublicForm = z.infer<typeof VisitPublicFormSchema>;
export type VisitListQuery = z.infer<typeof VisitListQuerySchema>;
