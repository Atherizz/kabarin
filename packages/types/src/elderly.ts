import { z } from "zod";
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

export const CreateElderlyInputSchema = z.object({
  communityUnitId: z.string().min(1),
  name: z.string().min(2),
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
});

export const UpdateElderlyInputSchema = z.object({
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
});

export const UpdateElderlyStatusInputSchema = z.object({
  status: CurrentStatusEnum,
  notes: z.string().optional(),
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
