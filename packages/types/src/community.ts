import { z } from "./zod-extended";

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
  healthFacilityName: z.string().nullable().optional(),
  healthFacilityPhone: z.string().nullable().optional(),
  communityHealthWorkerPhone: z.string().nullable().optional(),
  ambulancePhone: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Self-register: kader signs up + creates their RT in one request
export const RegisterCommunitySchema = z
  .object({
    // Kader account
    name: z.string().min(2, "Nama minimal 2 karakter"),
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    phone: z.string().optional(),
    // Community unit (RT)
    province: z.string().min(1),
    city: z.string().min(1),
    district: z.string().min(1),
    subdistrict: z.string().min(1),
    subdistrictCode: z.string().min(1, "Kode kelurahan wajib diisi"),
    rw: z.string().min(1).max(10),
    rt: z.string().min(1).max(10),
    // Optional health facility contacts (for Tier 3 referral card)
    healthFacilityName: z.string().optional(),
    healthFacilityPhone: z.string().optional(),
    communityHealthWorkerPhone: z.string().optional(),
    ambulancePhone: z.string().optional(),
  })
  .openapi({
    example: {
      name: "Ibu Endang Astuti",
      email: "kader.jatimulyo@gmail.com",
      password: "PasswordKader123!",
      phone: "081233445566",
      province: "Jawa Timur",
      city: "Kota Malang",
      district: "Lowokwaru",
      subdistrict: "Jatimulyo",
      subdistrictCode: "3573051007",
      rw: "10",
      rt: "01",
      healthFacilityName: "Puskesmas Kendalsari Lowokwaru",
      healthFacilityPhone: "0341-491234",
      communityHealthWorkerPhone: "081234567890",
      ambulancePhone: "119",
    },
  });

// Update: only allow editing faskes contacts and community name
export const UpdateCommunitySchema = z
  .object({
    name: z.string().min(1).optional(),
    healthFacilityName: z.string().optional(),
    healthFacilityPhone: z.string().optional(),
    communityHealthWorkerPhone: z.string().optional(),
    ambulancePhone: z.string().optional(),
  })
  .openapi({
    example: {
      name: "RT 01 / RW 10, Kel. Jatimulyo",
      healthFacilityName: "Puskesmas Kendalsari Lowokwaru",
      healthFacilityPhone: "0341-491234",
      communityHealthWorkerPhone: "081234567890",
      ambulancePhone: "119",
    },
  });

export type CommunityUnit = z.infer<typeof CommunityUnitSchema>;
export type RegisterCommunityInput = z.infer<typeof RegisterCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof UpdateCommunitySchema>;

