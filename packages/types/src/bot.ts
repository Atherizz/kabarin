import { z } from "./zod-extended";
import { AiTriageUrgencyEnum } from "./checkin";

export const EscalationTierEnum = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const TriageSentimentEnum = z.enum([
  "positive",
  "neutral",
  "concerned",
  "distressed",
]);

export const TriageEvaluationResultSchema = z
  .object({
    urgency: AiTriageUrgencyEnum,
    status: z.enum(["green", "yellow", "red"]),
    sentiment: TriageSentimentEnum,
    symptoms: z.array(z.string()).default([]),
    medicationCompliance: z.boolean().nullable(),
    shouldEscalate: z.boolean(),
    escalationTier: EscalationTierEnum.nullable(),
    escalationReason: z.string().nullable(),
    clinicalReasoning: z.string(),
    recommendedAction: z.string(),
    replyMessage: z.string(),
    toolsExecuted: z.array(z.string()).default([]),
  })
  .openapi({
    example: {
      urgency: "needs_attention",
      status: "yellow",
      sentiment: "concerned",
      symptoms: ["pusing berputar", "lemas"],
      medicationCompliance: false,
      shouldEscalate: true,
      escalationTier: 2,
      escalationReason:
        "Lansia mengeluh pusing berputar dan belum minum obat tensi pagi ini.",
      clinicalReasoning:
        "Gejala vertigo ringan pada lansia dengan riwayat hipertensi.",
      recommendedAction:
        "Kunjungan relawan RT untuk cek tensi dan ingatkan minum obat.",
      replyMessage:
        "Nggih Mbah Sumo, istirahat dulu berbaring nggih. Relawan RT sudah kami kabari untuk cek ke rumah Mbah sebentar lagi 🙂",
      toolsExecuted: [],
    },
  });

export const TriageContextSchema = z.object({
  elderlyId: z.string(),
  elderlyName: z.string(),
  age: z.number(),
  gender: z.string(),
  address: z.string(),
  medicalHistory: z.string().nullable(),
  activeMedications: z.array(
    z.object({
      medicationName: z.string(),
      dosage: z.string(),
      frequency: z.string(),
      timeOfDay: z.string(),
    })
  ),
  messageText: z.string(),
  messageType: z.enum(["text", "voice"]),
});

export const GreetingContextSchema = z.object({
  elderlyName: z.string(),
  gender: z.string(),
  age: z.number(),
  dayName: z.string(),
  morningMedications: z.array(
    z.object({
      medicationName: z.string(),
      dosage: z.string(),
    })
  ),
  previousDayNote: z.string().nullable().optional(),
});

export const ReminderContextSchema = z.object({
  elderlyName: z.string(),
  gender: z.string(),
  minutesElapsed: z.number(),
});

export const BotElderlyOnboardedPayloadSchema = z
  .object({
    elderlyId: z.string(),
    elderlyName: z.string(),
    elderlyPhone: z.string().optional(),
    rt: z.string(),
    rw: z.string(),
    communityUnitId: z.string(),
    familyContacts: z
      .array(
        z.object({
          name: z.string(),
          phone: z.string(),
          accessToken: z.string(),
        })
      )
      .optional(),
    volunteerAssignments: z
      .array(
        z.object({
          name: z.string(),
          phone: z.string(),
        })
      )
      .optional(),
  })
  .openapi({
    example: {
      elderlyId: "eld_sumo_123",
      elderlyName: "Mbah Sumo",
      elderlyPhone: "081234567890",
      rt: "01",
      rw: "10",
      communityUnitId: "rt_01_rw_10_lowokwaru",
      familyContacts: [
        {
          name: "Budi Santoso",
          phone: "081298765432",
          accessToken: "tok_fam_abc123",
        },
      ],
      volunteerAssignments: [
        {
          name: "Siti Rahma",
          phone: "081345678901",
        },
      ],
    },
  });

export const BotElderlySubmittedPayloadSchema = z
  .object({
    elderlyId: z.string(),
    elderlyName: z.string(),
    elderlyPhone: z.string().optional(),
    rt: z.string(),
    rw: z.string(),
    communityUnitId: z.string(),
    submittedByFamilyName: z.string(),
    familyContacts: z
      .array(
        z.object({
          name: z.string(),
          phone: z.string(),
          accessToken: z.string(),
        })
      )
      .optional(),
    cadrePhone: z.string().optional(),
    cadreName: z.string().optional(),
  })
  .openapi({
    example: {
      elderlyId: "eld_sumo_123",
      elderlyName: "Mbah Sumo",
      elderlyPhone: "081234567890",
      rt: "01",
      rw: "10",
      communityUnitId: "rt_01_rw_10_lowokwaru",
      submittedByFamilyName: "Mas Nobbel",
      familyContacts: [
        {
          name: "Mas Nobbel",
          phone: "081298765432",
          accessToken: "tok_fam_abc123",
        },
      ],
      cadrePhone: "081233445566",
      cadreName: "Ibu Endang",
    },
  });

export const BotVolunteerCreatedPayloadSchema = z
  .object({
    name: z.string(),
    phone: z.string(),
    email: z.string(),
    temporaryPassword: z.string().optional(),
  })
  .openapi({
    example: {
      name: "Siti Rahma",
      phone: "081345678901",
      email: "siti.relawan@gmail.com",
      temporaryPassword: "Kabarin2026!",
    },
  });

export const BotVolunteerAssignedPayloadSchema = z
  .object({
    elderlyId: z.string(),
    elderlyName: z.string(),
    rt: z.string(),
    communityUnitId: z.string(),
    volunteerName: z.string(),
    volunteerPhone: z.string(),
    isPrimary: z.boolean().default(true),
    familyContacts: z
      .array(
        z.object({
          name: z.string(),
          phone: z.string(),
          accessToken: z.string(),
        })
      )
      .optional(),
  })
  .openapi({
    example: {
      elderlyId: "eld_sumo_123",
      elderlyName: "Mbah Sumo",
      rt: "01",
      communityUnitId: "rt_01_rw_10_lowokwaru",
      volunteerName: "Siti Rahma",
      volunteerPhone: "081345678901",
      isPrimary: true,
      familyContacts: [
        {
          name: "Budi Santoso",
          phone: "081298765432",
          accessToken: "tok_fam_abc123",
        },
      ],
    },
  });

export const BotEscalationResolvedPayloadSchema = z
  .object({
    elderlyId: z.string(),
    elderlyName: z.string(),
    rt: z.string(),
    communityUnitId: z.string(),
    volunteerName: z.string().optional(),
    resolutionNotes: z.string().optional(),
    familyContacts: z.array(
      z.object({
        name: z.string(),
        phone: z.string(),
        accessToken: z.string(),
      })
    ),
  })
  .openapi({
    example: {
      elderlyId: "eld_sumo_123",
      elderlyName: "Mbah Sumo",
      rt: "01",
      communityUnitId: "rt_01_rw_10_lowokwaru",
      volunteerName: "Mas Budi",
      resolutionNotes: "Lansia sudah dicek, tensi stabil 125/80, sudah minum obat dan sarapan.",
      familyContacts: [
        {
          name: "Mas Nobbel",
          phone: "081298765432",
          accessToken: "tok_fam_abc123",
        },
      ],
    },
  });

export const BotFamilySosPayloadSchema = z
  .object({
    elderlyId: z.string(),
    reason: z.string().optional(),
  })
  .openapi({
    example: {
      elderlyId: "eld_sumo_123",
      reason: "Keluarga menekan tombol darurat dari portal pemantauan.",
    },
  });

export type EscalationTier = 1 | 2 | 3;
export type TriageSentiment = z.infer<typeof TriageSentimentEnum>;
export type TriageEvaluationResult = z.infer<typeof TriageEvaluationResultSchema>;
export type TriageContext = z.infer<typeof TriageContextSchema>;
export type GreetingContext = z.infer<typeof GreetingContextSchema>;
export type ReminderContext = z.infer<typeof ReminderContextSchema>;
export type BotElderlyOnboardedPayload = z.infer<typeof BotElderlyOnboardedPayloadSchema>;
export type BotElderlySubmittedPayload = z.infer<typeof BotElderlySubmittedPayloadSchema>;
export type BotVolunteerCreatedPayload = z.infer<typeof BotVolunteerCreatedPayloadSchema>;
export type BotVolunteerAssignedPayload = z.infer<typeof BotVolunteerAssignedPayloadSchema>;
export type BotEscalationResolvedPayload = z.infer<typeof BotEscalationResolvedPayloadSchema>;
export type BotFamilySosPayload = z.infer<typeof BotFamilySosPayloadSchema>;
