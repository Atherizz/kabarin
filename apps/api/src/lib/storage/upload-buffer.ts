import { PutObjectCommand } from "@aws-sdk/client-s3";
import type { AppEnv } from "../../types/app-env";
import { getR2S3Client } from "./s3-client";
import { storageRegistry, type StorageType } from "./registry";

export interface DirectUploadParams {
  type: StorageType;
  buffer: Buffer | Uint8Array;
  contentType: string;
  extension?: string;
}

export interface DirectUploadResult {
  key: string;
  publicUrl: string;
}

/**
 * Upload a binary buffer directly to Cloudflare R2 (used by Bot for Voice Notes / Chat Media)
 */
export async function uploadBufferToR2(
  env: AppEnv["Bindings"] | undefined,
  params: DirectUploadParams
): Promise<DirectUploadResult> {
  const { type, buffer, contentType, extension = "ogg" } = params;

  const registryEntry = storageRegistry[type];
  if (!registryEntry) {
    throw new Error(`Invalid storage type: ${type}`);
  }

  const key = registryEntry.getPath(extension);
  const { client, bucketName, publicUrlBase } = getR2S3Client(env);

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const publicUrl = publicUrlBase ? `${publicUrlBase}/${key}` : key;

  return {
    key,
    publicUrl,
  };
}
