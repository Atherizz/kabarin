import { S3Client } from "@aws-sdk/client-s3";
import type { AppEnv } from "../../types/app-env";

export function getR2S3Client(env?: AppEnv["Bindings"]): {
  client: S3Client;
  bucketName: string;
  publicUrlBase: string;
} {
  const accountId = env?.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
  const accessKeyId = env?.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env?.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = env?.R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || "kabarin-storage";
  const publicUrlBase = (env?.R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Cloudflare R2 credentials are not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY."
    );
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucketName, publicUrlBase };
}
