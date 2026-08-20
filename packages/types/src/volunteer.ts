import { z } from "./zod-extended";

export const VolunteerSchema = z.object({
  id: z.string(),
  communityUnitId: z.string(),
  userId: z.string().nullable().optional(),
  name: z.string(),
  phone: z.string(),
  address: z.string(),
  rt: z.string(),
  rw: z.string(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  maxCapacity: z.number(),
  isActive: z.boolean(),
  assignedElderlyCount: z.number().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateVolunteerInputSchema = z
  .object({
    communityUnitId: z.string().optional(),
    name: z.string().min(2, "Nama relawan minimal 2 karakter"),
    phone: z.string().min(8, "Nomor WhatsApp minimal 8 digit"),
    address: z.string().min(3, "Alamat minimal 3 karakter"),
    rt: z.string().min(1),
    rw: z.string().min(1),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    maxCapacity: z.number().optional().default(5),
    userId: z.string().optional(),
  })
  .openapi({
    example: {
      name: "Mas Dimas Prasetyo",
      phone: "082133445566",
      address: "Jl. Kalpataru No. 47 (Selang 1 rumah dari Mbah Soepardi)",
      rt: "01",
      rw: "10",
      latitude: -7.9481,
      longitude: 112.6243,
      maxCapacity: 3,
    },
  });

export const UpdateVolunteerInputSchema = z
  .object({
    name: z.string().min(2).optional(),
    phone: z.string().min(8).optional(),
    address: z.string().min(3).optional(),
    rt: z.string().min(1).optional(),
    rw: z.string().min(1).optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    maxCapacity: z.number().optional(),
    isActive: z.boolean().optional(),
  })
  .openapi({
    example: {
      maxCapacity: 5,
      isActive: true,
    },
  });

export const AssignVolunteerInputSchema = z
  .object({
    elderlyId: z.string().min(1, "ID lansia wajib diisi"),
    isPrimary: z.boolean().optional().default(true),
  })
  .openapi({
    example: {
      elderlyId: "eld_sample_uuid_123",
      isPrimary: true,
    },
  });

export const VolunteerAssignmentSchema = z.object({
  id: z.string(),
  elderlyId: z.string(),
  volunteerId: z.string(),
  isPrimary: z.boolean(),
  assignedAt: z.string().datetime(),
  volunteer: VolunteerSchema.optional(),
});

export type Volunteer = z.infer<typeof VolunteerSchema>;
export type CreateVolunteerInput = z.infer<typeof CreateVolunteerInputSchema>;
export type UpdateVolunteerInput = z.infer<typeof UpdateVolunteerInputSchema>;
export type AssignVolunteerInput = z.infer<typeof AssignVolunteerInputSchema>;
export type VolunteerAssignment = z.infer<typeof VolunteerAssignmentSchema>;
