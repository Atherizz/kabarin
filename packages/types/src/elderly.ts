import { z } from "./zod-extended";
import { CreateMedicationInputSchema, ElderlyMedicationSchema } from "./medication";
import { CreateElderlyFamilyInputSchema, ElderlyFamilySchema } from "./family";

export const MobilityStatusEnum = z.enum(["independent", "needs_assistance", "homebound"]);
export const MonitoringModeEnum = z.enum(["active", "passive"]);
export const CurrentStatusEnum = z.enum(["green", "yellow", "red", "grey"]);

export const ElderlySchema = z.object({
  id: z.string(),
  communityUnitId: z.string(),
  name: z.string(),
  // WhatsApp contact — nullable if homebound/no smartphone (family WA used instead)
  phone: z.string().nullable().optional(),
  age: z.number(),
  gender: z.enum(["male", "female"]),
  address: z.string(),
  rt: z.string(),
  rw: z.string(),
  // GPS coords for Leaflet.js map
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  mobilityStatus: MobilityStatusEnum,
  monitoringMode: MonitoringModeEnum,
  // Cached traffic-light status — updated after each care cycle
  currentStatus: CurrentStatusEnum,
  // 0–100 risk score computed from health profile + checkin history
  riskScore: z.number(),
  // Medical diagnoses / chronic conditions (e.g. "Hipertensi, Riwayat Stroke 2024")
  medicalHistory: z.string().nullable().optional(),
  preferredCheckinTime: z.string(),
  notes: z.string().nullable().optional(),
  createdBy: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // Optional relational inclusions
  familyMembers: z.array(ElderlyFamilySchema).optional(),
  medications: z.array(ElderlyMedicationSchema).optional(),
});

export const CreateElderlyInputSchema = z
  .object({
    communityUnitId: z.string().optional(),
    name: z.string().min(2, "Nama lansia minimal 2 karakter"),
    phone: z.string().optional(),
    age: z.number().min(50).max(120),
    gender: z.enum(["male", "female"]),
    address: z.string().min(3),
    rt: z.string().min(1),
    rw: z.string().min(1),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    mobilityStatus: MobilityStatusEnum.default("independent"),
    monitoringMode: MonitoringModeEnum.default("active"),
    medicalHistory: z.string().optional(),
    preferredCheckinTime: z.string().default("07:00"),
    notes: z.string().optional(),
    // Optional relations registered in the same onboarding flow
    medications: z.array(CreateMedicationInputSchema).optional().default([]),
    family: z.array(CreateElderlyFamilyInputSchema).optional().default([]),
    assignedVolunteerId: z.string().optional(),
  })
  .openapi({
    example: {
      name: "Mbah Soepardi",
      phone: "081298765432",
      age: 72,
      gender: "male",
      address: "Jl. Kalpataru No. 45, RT 01 / RW 10, Jatimulyo",
      rt: "01",
      rw: "10",
      latitude: -7.9482,
      longitude: 112.6241,
      mobilityStatus: "independent",
      monitoringMode: "active",
      medicalHistory: "Hipertensi Derajat 2, Riwayat Stroke Ringan 2024",
      preferredCheckinTime: "07:00",
      notes: "Tinggal sendiri, rumah pagar hijau depan musholla Al-Ikhlas",
      medications: [
        {
          conditionName: "Hipertensi",
          medicationName: "Amlodipine 5mg",
          dosage: "1 tablet",
          frequency: "1x sehari",
          timeOfDay: "morning",
          timingInstruction: "after_meal",
          reminderTime: "07:00",
          notes: "Diminum rutin setelah sarapan pagi",
          isActive: true,
        },
      ],
      family: [
        {
          name: "Bambang Soepardi (Anak Pertama)",
          phone: "081234567899",
          relationship: "Anak Kandung",
          isPrimaryContact: true,
          notifyViaWhatsapp: true,
        },
      ],
    },
  });

export const UpdateElderlyInputSchema = z
  .object({
    name: z.string().min(2).optional(),
    phone: z.string().nullable().optional(),
    age: z.number().min(50).max(120).optional(),
    gender: z.enum(["male", "female"]).optional(),
    address: z.string().min(3).optional(),
    rt: z.string().min(1).optional(),
    rw: z.string().min(1).optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    mobilityStatus: MobilityStatusEnum.optional(),
    monitoringMode: MonitoringModeEnum.optional(),
    medicalHistory: z.string().nullable().optional(),
    preferredCheckinTime: z.string().optional(),
    notes: z.string().nullable().optional(),
  })
  .openapi({
    example: {
      preferredCheckinTime: "06:30",
      notes: "Lebih sering bangun jam 06.00 untuk jalan santai di depan rumah",
    },
  });

export const UpdateElderlyStatusInputSchema = z
  .object({
    status: CurrentStatusEnum,
    notes: z.string().optional(),
  })
  .openapi({
    example: {
      status: "green",
      notes: "Sudah minum obat Amlodipine 5mg dan sarapan bubur ayam.",
    },
  });

export const ElderlyQuerySchema = z.object({
  status: CurrentStatusEnum.optional(),
  mobilityStatus: MobilityStatusEnum.optional(),
  monitoringMode: MonitoringModeEnum.optional(),
  search: z.string().optional(),
});

export type MobilityStatus = z.infer<typeof MobilityStatusEnum>;
export type MonitoringMode = z.infer<typeof MonitoringModeEnum>;
export type CurrentStatus = z.infer<typeof CurrentStatusEnum>;
export type Elderly = z.infer<typeof ElderlySchema>;
export type CreateElderlyInput = z.infer<typeof CreateElderlyInputSchema>;
export type UpdateElderlyInput = z.infer<typeof UpdateElderlyInputSchema>;
export type UpdateElderlyStatusInput = z.infer<typeof UpdateElderlyStatusInputSchema>;
export type ElderlyQuery = z.infer<typeof ElderlyQuerySchema>;
