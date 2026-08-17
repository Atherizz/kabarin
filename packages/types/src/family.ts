import { z } from "zod";

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

export const CreateElderlyFamilyInputSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  relationship: z.string().min(1),
  isPrimaryContact: z.boolean().optional().default(false),
  notifyViaWhatsapp: z.boolean().optional().default(true),
});

export type ElderlyFamily = z.infer<typeof ElderlyFamilySchema>;
export type CreateElderlyFamilyInput = z.infer<
  typeof CreateElderlyFamilyInputSchema
>;
