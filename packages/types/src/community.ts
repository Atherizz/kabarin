import { z } from "zod";

export const CommunityUnitSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  province: z.string(),
  city: z.string(),
  district: z.string(),
  subdistrict: z.string(),
  subdistrictCode: z.string(),
  rw: z.string(),
  rt: z.string(),
  puskesmasName: z.string().nullable().optional(),
  puskesmasPhone: z.string().nullable().optional(),
  bidanPhone: z.string().nullable().optional(),
  ambulancePhone: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateCommunityUnitSchema = z.object({
  province: z.string().min(1),
  city: z.string().min(1),
  district: z.string().min(1),
  subdistrict: z.string().min(1),
  subdistrictCode: z.string().min(1),
  rw: z.string().min(1),
  rt: z.string().min(1),
  puskesmasName: z.string().optional(),
  puskesmasPhone: z.string().optional(),
  bidanPhone: z.string().optional(),
  ambulancePhone: z.string().optional(),
});

export type CommunityUnit = z.infer<typeof CommunityUnitSchema>;
export type CreateCommunityUnitInput = z.infer<typeof CreateCommunityUnitSchema>;
