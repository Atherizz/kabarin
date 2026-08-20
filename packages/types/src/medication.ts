import { z } from "./zod-extended";

export const TimeOfDayEnum = z.enum(["morning", "afternoon", "evening", "bedtime"]);
export const TimingInstructionEnum = z.enum([
  "before_meal",
  "after_meal",
  "with_meal",
  "any_time",
]);

export const ElderlyMedicationSchema = z.object({
  id: z.string(),
  elderlyId: z.string(),
  conditionName: z.string(),
  medicationName: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  timeOfDay: TimeOfDayEnum,
  timingInstruction: TimingInstructionEnum,
  reminderTime: z.string(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateMedicationInputSchema = z
  .object({
    conditionName: z.string().min(1),
    medicationName: z.string().min(1),
    dosage: z.string().min(1),
    frequency: z.string().min(1),
    timeOfDay: TimeOfDayEnum.default("morning"),
    timingInstruction: TimingInstructionEnum.default("after_meal"),
    reminderTime: z.string().default("07:00"),
    notes: z.string().optional(),
    isActive: z.boolean().optional().default(true),
  })
  .openapi({
    example: {
      conditionName: "Hipertensi",
      medicationName: "Amlodipine 5mg",
      dosage: "1 tablet",
      frequency: "1x sehari",
      timeOfDay: "morning",
      timingInstruction: "after_meal",
      reminderTime: "07:00",
      notes: "Diminum rutin setiap pagi setelah sarapan",
      isActive: true,
    },
  });

export const SmartOcrMedicationResultSchema = z.object({
  conditionName: z.string(),
  medications: z.array(
    z.object({
      name: z.string(),
      dosage: z.string(),
      frequency: z.string(),
      timeOfDay: TimeOfDayEnum,
      timingInstruction: TimingInstructionEnum,
      reminderTime: z.string(),
      notes: z.string().optional(),
    })
  ),
  rawExtractedText: z.string().optional(),
});

export type TimeOfDay = z.infer<typeof TimeOfDayEnum>;
export type TimingInstruction = z.infer<typeof TimingInstructionEnum>;
export type ElderlyMedication = z.infer<typeof ElderlyMedicationSchema>;
export type CreateMedicationInput = z.infer<typeof CreateMedicationInputSchema>;
export type SmartOcrMedicationResult = z.infer<typeof SmartOcrMedicationResultSchema>;
