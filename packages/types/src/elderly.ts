import { z } from "./zod-extended";
import { CreateMedicationInputSchema, ElderlyMedicationSchema } from "./medication";
import { CreateElderlyFamilyInputSchema, ElderlyFamilySchema } from "./family";
import { VolunteerAssignmentSchema } from "./volunteer";

export const MobilityStatusEnum = z.enum(["independent", "needs_assistance", "homebound"]);
export const MonitoringModeEnum = z.enum(["active", "passive"]);
export const CurrentStatusEnum = z.enum(["green", "yellow", "red", "grey"]);
export const VerificationStatusEnum = z.enum(["verified", "pending_verification", "rejected"]);

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
  // Verification status for bottom-up family registration
  verificationStatus: VerificationStatusEnum,
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
  volunteerAssignments: z.array(VolunteerAssignmentSchema).optional(),
});

export const CreateElderlyInputSchema = z
  .object({
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
    primaryVolunteerId: z.string().optional(),
    secondaryVolunteerId: z.string().optional(),
    assignedVolunteerId: z.string().optional(), // alias for primaryVolunteerId
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

export const CreateElderlyByFamilyInputSchema = z
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
    relationship: z.string().default("Anak Kandung"),
    familyPhone: z.string().min(8, "Nomor WhatsApp Anda wajib diisi untuk menerima kabar darurat").optional(),
    medications: z.array(CreateMedicationInputSchema).optional().default([]),
    additionalFamily: z.array(CreateElderlyFamilyInputSchema).optional().default([]),
  })
  .openapi({
    example: {
      name: "Ibu Siti Aminah",
      phone: "081288990011",
      age: 71,
      gender: "female",
      address: "Jl. Melati No. 12, RT 01 / RW 10, Jatimulyo",
      rt: "01",
      rw: "10",
      latitude: -7.9488,
      longitude: 112.6245,
      mobilityStatus: "independent",
      monitoringMode: "active",
      medicalHistory: "Diabetes Melitus Tipe 2, Kolesterol",
      preferredCheckinTime: "07:00",
      relationship: "Anak Kandung",
      notes: "Ibu tinggal sendiri, saya bekerja di Jakarta",
      medications: [
        {
          conditionName: "Diabetes",
          medicationName: "Metformin 500mg",
          dosage: "1 tablet",
          frequency: "2x sehari",
          timeOfDay: "morning",
          timingInstruction: "after_meal",
          reminderTime: "07:00",
          notes: "Diminum setelah sarapan",
          isActive: true,
        },
      ],
      additionalFamily: [
        {
          name: "Maya Aminah (Kakak)",
          phone: "081299887766",
          relationship: "Anak Kandung",
          isPrimaryContact: false,
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

export const VerifyElderlyInputSchema = z
  .object({
    status: z.enum(["verified", "rejected"]).default("verified"),
    primaryVolunteerId: z.string().optional(),
    secondaryVolunteerId: z.string().optional(),
    notes: z.string().optional(),
  })
  .openapi({
    example: {
      status: "verified",
      primaryVolunteerId: "vol_123456",
      secondaryVolunteerId: "vol_654321",
      notes: "Alamat Jl. Kalpataru RT 01 sudah diverifikasi langsung oleh Bu Kader.",
    },
  });

export const UpdateEscalationChainInputSchema = z
  .object({
    primaryVolunteerId: z.string().nullable().optional(),
    secondaryVolunteerId: z.string().nullable().optional(),
    primaryFamilyId: z.string().nullable().optional(),
    emergencyAllFamily: z.boolean().default(true),
  })
  .openapi({
    example: {
      primaryVolunteerId: "vol_123456",
      secondaryVolunteerId: "vol_654321",
      primaryFamilyId: "fam_123456",
      emergencyAllFamily: true,
    },
  });

export const EscalationChainSchema = z.object({
  elderlyId: z.string(),
  primaryVolunteer: z
    .object({
      id: z.string(),
      name: z.string(),
      phone: z.string(),
    })
    .nullable(),
  secondaryVolunteer: z
    .object({
      id: z.string(),
      name: z.string(),
      phone: z.string(),
    })
    .nullable(),
  primaryFamilyContact: z
    .object({
      id: z.string(),
      name: z.string(),
      phone: z.string(),
      relationship: z.string(),
    })
    .nullable(),
  emergencyAllFamily: z.boolean(),
});

export const ElderlyQuerySchema = z.object({
  status: CurrentStatusEnum.optional(),
  verificationStatus: VerificationStatusEnum.optional(),
  mobilityStatus: MobilityStatusEnum.optional(),
  monitoringMode: MonitoringModeEnum.optional(),
  search: z.string().optional(),
});

export type MobilityStatus = z.infer<typeof MobilityStatusEnum>;
export type MonitoringMode = z.infer<typeof MonitoringModeEnum>;
export type CurrentStatus = z.infer<typeof CurrentStatusEnum>;
export type VerificationStatus = z.infer<typeof VerificationStatusEnum>;
export type Elderly = z.infer<typeof ElderlySchema>;
export type CreateElderlyInput = z.infer<typeof CreateElderlyInputSchema>;
export type CreateElderlyByFamilyInput = z.infer<typeof CreateElderlyByFamilyInputSchema>;
export type UpdateElderlyInput = z.infer<typeof UpdateElderlyInputSchema>;
export type UpdateElderlyStatusInput = z.infer<typeof UpdateElderlyStatusInputSchema>;
export type VerifyElderlyInput = z.infer<typeof VerifyElderlyInputSchema>;
export type UpdateEscalationChainInput = z.infer<typeof UpdateEscalationChainInputSchema>;
export type EscalationChain = z.infer<typeof EscalationChainSchema>;
export type ElderlyQuery = z.infer<typeof ElderlyQuerySchema>;

