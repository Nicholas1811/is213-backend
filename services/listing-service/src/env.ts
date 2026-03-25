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
