import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { z, ZodError } from "zod";

expand(config());

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(9999),
  DATABASE_URL: z.string(),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  RABBITMQ_URL: z.string().default("amqp://localhost:5672"),
  RABBITMQ_EXCHANGE: z.string().default("dev.events"),
  RABBITMQ_QUEUE: z.string().default("dev.listings.events"),
  RABBITMQ_PREFETCH: z.coerce.number().int().positive().default(20),
  AWS_REGION: z.string().default("ap-southeast-1"),
  S3_BUCKET_NAME: z.string().default("jms-listings-dev"),
  AWS_ACCESS_KEY: z.string().optional(),
  AWS_SECRET_KEY: z.string().optional(),
  S3_OBJECT_PREFIX: z.string().default("listings"),
  S3_UPLOAD_URL_EXPIRES_SECONDS: z.coerce.number().int().positive().max(3600).default(900),
  S3_PUBLIC_BASE_URL: z.url().optional(),
});

export type env = z.infer<typeof EnvSchema>;

// eslint-disable-next-line import/no-mutable-exports, ts/no-redeclare
let env: env;

try {
  // eslint-disable-next-line node/no-process-env
  env = EnvSchema.parse(process.env);
}
catch (e) {
  if (e instanceof ZodError) {
    console.error("Invalid env:");
    console.error(z.flattenError(e).fieldErrors);
  }
  else {
    console.error("Unexpected error while parsing env:", e);
  }

  process.exit(1);
}

export default env;
