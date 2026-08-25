import { z } from "./zod-extended";

export const StorageTypeEnum = z.enum([
  "prescription",
  "visitPhoto",
  "voiceNote",
  "chatMedia",
]);

export const PresignedUploadRequestSchema = z
  .object({
    type: StorageTypeEnum.describe(
      "Target storage category: 'prescription' (medical/KMS), 'visitPhoto' (volunteer visit proof), 'voiceNote' (WhatsApp audio), 'chatMedia' (WhatsApp images)"
    ),
    fileName: z.string().min(1).describe("Original file name with extension, e.g. 'resep-dokter.jpg'"),
    contentType: z.string().min(1).describe("MIME type of the file, e.g. 'image/jpeg', 'image/png'"),
    formToken: z
      .string()
      .optional()
      .describe("Optional 64-char hex visit form token for zero-login volunteer field visits"),
  })
  .openapi({
    example: {
      type: "prescription",
      fileName: "resep-obat-mbah-soepardi.jpg",
      contentType: "image/jpeg",
    },
  });

export const PresignedUploadResponseSchema = z
  .object({
    key: z.string().describe("Generated unique storage path key"),
    uploadUrl: z.string().url().describe("Temporary presigned PUT URL valid for 15 minutes"),
    publicUrl: z.string().url().describe("Permanent public CDN/R2 URL for the uploaded file"),
    expiresIn: z.number().describe("Presigned URL expiration in seconds (default: 900s / 15m)"),
  })
  .openapi({
    example: {
      key: "prescriptions/4a98d361-9fb7-4402-bb0b-d2c676742589.jpg",
      uploadUrl:
        "https://0123456789abcdef.r2.cloudflarestorage.com/kabarin-storage/prescriptions/4a98d361-9fb7-4402-bb0b-d2c676742589.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=900",
      publicUrl:
        "https://cdn.kabarin.atherizz.dev/prescriptions/4a98d361-9fb7-4402-bb0b-d2c676742589.jpg",
      expiresIn: 900,
    },
  });

export type StorageType = z.infer<typeof StorageTypeEnum>;
export type PresignedUploadRequest = z.infer<typeof PresignedUploadRequestSchema>;
export type PresignedUploadResponse = z.infer<typeof PresignedUploadResponseSchema>;
