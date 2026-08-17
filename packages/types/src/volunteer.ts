import { z } from "zod";

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

export const CreateVolunteerInputSchema = z.object({
  communityUnitId: z.string().min(1),
  name: z.string().min(2),
  phone: z.string().min(8),
  address: z.string().min(3),
  rt: z.string().min(1),
  rw: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  maxCapacity: z.number().optional().default(5),
  userId: z.string().optional(),
});

export const AssignVolunteerInputSchema = z.object({
  elderlyId: z.string().min(1),
  volunteerId: z.string().min(1),
  isPrimary: z.boolean().optional().default(true),
});

export type Volunteer = z.infer<typeof VolunteerSchema>;
export type CreateVolunteerInput = z.infer<typeof CreateVolunteerInputSchema>;
export type AssignVolunteerInput = z.infer<typeof AssignVolunteerInputSchema>;
