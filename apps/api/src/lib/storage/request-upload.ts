import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AppEnv } from "../../types/app-env";
import { getR2S3Client } from "./s3-client";
import { storageRegistry, type StorageType, getFileExtension } from "./registry";

export interface PresignedUploadParams {
  type: StorageType;
  fileName: string;
  contentType: string;
}

export interface PresignedUploadResult {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  expiresIn: number;
}

export async function requestPresignedUpload(
  env: AppEnv["Bindings"] | undefined,
  params: PresignedUploadParams
): Promise<PresignedUploadResult> {
  const { type, fileName, contentType } = params;

  const registryEntry = storageRegistry[type];
  if (!registryEntry) {
    throw new Error(`Invalid storage type: ${type}`);
  }

  // Validate MIME type
  const mimeValidation = registryEntry.mime.safeParse(contentType);
  if (!mimeValidation.success) {
    const allowed = (registryEntry.mime as any).options?.join(", ") ?? "valid formats";
    throw new Error(
      `Invalid content type '${contentType}' for storage type '${type}'. Allowed: ${allowed}`
    );
  }

  const ext = getFileExtension(fileName);
  const key = registryEntry.getPath(ext);

  const { client, bucketName, publicUrlBase } = getR2S3Client(env);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  // Presigned URL valid for 15 minutes (900 seconds)
  const expiresIn = 900;
  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  const publicUrl = publicUrlBase ? `${publicUrlBase}/${key}` : key;

  return {
    key,
    uploadUrl,
    publicUrl,
    expiresIn,
  };
}
