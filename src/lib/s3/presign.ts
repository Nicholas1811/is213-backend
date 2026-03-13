import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import env from "@/env";
import { s3Client } from "./client";

interface CreateUploadUrlInput {
  filename: string;
  contentType: string;
}

export interface UploadUrlResult {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  expiresIn: number;
}

function sanitizeFilename(filename: string): string {
  const cleaned = filename.trim().replace(/[^\w.-]/g, "_");
  return cleaned || "upload.bin";
}

function normalizeObjectPrefix(prefix: string): string {
  return prefix
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function encodePath(path: string): string {
  return path.split("/").map(segment => encodeURIComponent(segment)).join("/");
}

function buildPublicUrl(objectKey: string): string {
  const encodedKey = encodePath(objectKey);

  if (env.S3_PUBLIC_BASE_URL) {
    return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${encodedKey}`;
  }

  return `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${encodedKey}`;
}

export async function createListingUploadUrl(input: CreateUploadUrlInput): Promise<UploadUrlResult> {
  const safeFilename = sanitizeFilename(input.filename);
  const normalizedPrefix = normalizeObjectPrefix(env.S3_OBJECT_PREFIX);
  const objectName = `${crypto.randomUUID()}-${safeFilename}`;
  const objectKey = normalizedPrefix ? `${normalizedPrefix}/${objectName}` : objectName;
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: objectKey,
    ContentType: input.contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: env.S3_UPLOAD_URL_EXPIRES_SECONDS,
  });

  return {
    uploadUrl,
    publicUrl: buildPublicUrl(objectKey),
    objectKey,
    expiresIn: env.S3_UPLOAD_URL_EXPIRES_SECONDS,
  };
}
