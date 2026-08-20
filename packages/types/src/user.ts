import { z } from "./zod-extended";

export const UserRoleEnum = z.enum(["admin", "cadre", "volunteer", "family"]);

export const UserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: UserRoleEnum,
  communityUnitId: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const SignUpSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    role: UserRoleEnum.optional().default("cadre"),
    phone: z.string().optional(),
    communityUnitId: z.string().optional(),
  })
  .openapi({
    example: {
      name: "Ibu Endang Astuti",
      email: "kader.jatimulyo@gmail.com",
      password: "PasswordKader123!",
      role: "cadre",
      phone: "081233445566",
    },
  });

export const SignInSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
    rememberMe: z.boolean().optional(),
  })
  .openapi({
    example: {
      email: "kader.jatimulyo@gmail.com",
      password: "PasswordKader123!",
      rememberMe: true,
    },
  });

export type UserRole = z.infer<typeof UserRoleEnum>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type SignUpInput = z.infer<typeof SignUpSchema>;
export type SignInInput = z.infer<typeof SignInSchema>;
