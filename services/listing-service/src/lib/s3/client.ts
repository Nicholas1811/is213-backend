import { S3Client } from "@aws-sdk/client-s3";
import env from "@/env";

const credentials = env.AWS_ACCESS_KEY && env.AWS_SECRET_KEY
  ? {
      accessKeyId: env.AWS_ACCESS_KEY,
      secretAccessKey: env.AWS_SECRET_KEY,
    }
  : undefined;

export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials,
});
