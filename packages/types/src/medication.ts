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

export const UpdateMedicationInputSchema = z
  .object({
    conditionName: z.string().min(1).optional(),
    medicationName: z.string().min(1).optional(),
    dosage: z.string().min(1).optional(),
    frequency: z.string().min(1).optional(),
    timeOfDay: TimeOfDayEnum.optional(),
    timingInstruction: TimingInstructionEnum.optional(),
    reminderTime: z.string().optional(),
    notes: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .openapi({
    example: {
      reminderTime: "06:30",
      notes: "Diganti jam 06.30 sesuai anjuran dokter puskesmas",
      isActive: true,
    },
  });

export const ExtractMedicationOcrInputSchema = z
  .object({
    imageUrl: z.string().url().describe("Public URL of the prescription or medicine label image stored in Cloudflare R2"),
  })
  .openapi({
    example: {
      imageUrl:
        "https://cdn.kabarin.atherizz.dev/prescriptions/1cf8ce8c-6a3a-449d-af5c-5378b101d99b.jpg",
    },
  });

export const SmartOcrMedicationResultSchema = z
  .object({
    conditionName: z.string().describe("Extracted or inferred primary chronic condition/diagnosis"),
    medications: z.array(
      z.object({
        name: z.string().describe("Full medication name and strength"),
        dosage: z.string().describe("Dosage per intake"),
        frequency: z.string().describe("Frequency of intake"),
        timeOfDay: TimeOfDayEnum.describe("Time of day bucket: 'morning', 'afternoon', 'evening', 'bedtime'"),
        timingInstruction: TimingInstructionEnum.describe("Meal instruction: 'before_meal', 'after_meal', 'with_meal', 'any_time'"),
        reminderTime: z.string().describe("Default 24h reminder time (HH:MM)"),
        notes: z.string().optional().describe("Special doctor instructions or warnings"),
      })
    ),
    rawExtractedText: z.string().optional().describe("Raw text transcribed from the document"),
  })
  .openapi({
    example: {
      conditionName: "Hipertensi",
      medications: [
        {
          name: "Amlodipine 5mg",
          dosage: "1 tablet",
          frequency: "1x sehari",
          timeOfDay: "morning",
          timingInstruction: "after_meal",
          reminderTime: "07:00",
          notes: "Diminum rutin setiap pagi sesudah makan",
        },
        {
          name: "Candesartan 8mg",
          dosage: "1 tablet",
          frequency: "1x sehari",
          timeOfDay: "evening",
          timingInstruction: "after_meal",
          reminderTime: "18:00",
          notes: "Diminum malam hari sesudah makan",
        },
      ],
      rawExtractedText: "R/ Amlodipine 5mg tab No. XXX S 1 dd tab 1 pagi pc\nR/ Candesartan 8mg tab No. XXX S 1 dd tab 1 malam pc",
    },
  });

export type TimeOfDay = z.infer<typeof TimeOfDayEnum>;
export type TimingInstruction = z.infer<typeof TimingInstructionEnum>;
export type ElderlyMedication = z.infer<typeof ElderlyMedicationSchema>;
export type CreateMedicationInput = z.infer<typeof CreateMedicationInputSchema>;
export type UpdateMedicationInput = z.infer<typeof UpdateMedicationInputSchema>;
export type ExtractMedicationOcrInput = z.infer<typeof ExtractMedicationOcrInputSchema>;
export type SmartOcrMedicationResult = z.infer<typeof SmartOcrMedicationResultSchema>;
