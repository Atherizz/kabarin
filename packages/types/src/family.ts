import { z } from "./zod-extended";

export const ElderlyFamilySchema = z.object({
  id: z.string(),
  elderlyId: z.string(),
  userId: z.string().nullable().optional(),
  name: z.string(),
  phone: z.string(),
  relationship: z.string(),
  isPrimaryContact: z.boolean(),
  accessToken: z.string(),
  notifyViaWhatsapp: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateElderlyFamilyInputSchema = z
  .object({
    name: z.string().min(1),
    phone: z.string().min(8),
    relationship: z.string().min(1),
    isPrimaryContact: z.boolean().optional().default(false),
    notifyViaWhatsapp: z.boolean().optional().default(true),
  })
  .openapi({
    example: {
      name: "Bambang Soepardi (Anak Pertama)",
      phone: "081234567899",
      relationship: "Anak Kandung",
      isPrimaryContact: true,
      notifyViaWhatsapp: true,
    },
  });

export const UpdateElderlyFamilyInputSchema = z
  .object({
    name: z.string().min(1).optional(),
    phone: z.string().min(8).optional(),
    relationship: z.string().min(1).optional(),
    isPrimaryContact: z.boolean().optional(),
    notifyViaWhatsapp: z.boolean().optional(),
  })
  .openapi({
    example: {
      name: "Bambang Soepardi (Anak Pertama)",
      phone: "081234567899",
      relationship: "Anak Kandung",
      isPrimaryContact: true,
      notifyViaWhatsapp: true,
    },
  });

export const FamilyPublicStatusSchema = z.object({
  elderly: z.object({
    name: z.string(),
    age: z.number(),
    currentStatus: z.enum(["green", "yellow", "red", "grey"]),
    mobilityStatus: z.string(),
    rt: z.string(),
    rw: z.string(),
    preferredCheckinTime: z.string(),
    updatedAt: z.string().datetime(),
  }),
  familyMember: z.object({
    name: z.string(),
    relationship: z.string(),
  }),
  community: z.object({
    name: z.string(),
    healthFacilityName: z.string().nullable().optional(),
    healthFacilityPhone: z.string().nullable().optional(),
    ambulancePhone: z.string().nullable().optional(),
  }),
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
  assignedVolunteer: z
    .object({
      name: z.string(),
      phone: z.string(),
    })
    .nullable()
    .optional(),
});

export type ElderlyFamily = z.infer<typeof ElderlyFamilySchema>;
export type CreateElderlyFamilyInput = z.infer<typeof CreateElderlyFamilyInputSchema>;
export type UpdateElderlyFamilyInput = z.infer<typeof UpdateElderlyFamilyInputSchema>;
export type FamilyPublicStatus = z.infer<typeof FamilyPublicStatusSchema>;

// GET /api/family/me/elderly — response item shape
export const FamilyMonitoredElderlySchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  gender: z.enum(["male", "female"]),
  currentStatus: z.enum(["green", "yellow", "red", "grey"]),
  verificationStatus: z.enum(["verified", "pending_verification", "rejected"]),
  address: z.string(),
  rt: z.string(),
  rw: z.string(),
  communityUnitId: z.string(),
  communityName: z.string(),
  relationship: z.string(),
  isPrimaryContact: z.boolean(),
  accessToken: z.string(),
  activeMedicationsCount: z.number(),
  preferredCheckinTime: z.string(),
  updatedAt: z.string().datetime(),
});

// POST /api/family/status/:token/trigger — request body (optional reason)
export const TriggerFamilySosInputSchema = z
  .object({
    reason: z.string().optional(),
  })
  .openapi({
    example: {
      reason: "Sudah dari tadi siang tidak bisa dihubungi, sangat mengkhawatirkan",
    },
  });

export type FamilyMonitoredElderly = z.infer<typeof FamilyMonitoredElderlySchema>;
export type TriggerFamilySosInput = z.infer<typeof TriggerFamilySosInputSchema>;
