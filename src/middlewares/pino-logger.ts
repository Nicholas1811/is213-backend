import { pinoLogger } from "hono-pino";
import pino from "pino";
import pretty from "pino-pretty";
import env from "@/env";

export const appLogger = pino(
  { level: env.LOG_LEVEL },
  env.NODE_ENV === "production" ? undefined : pretty(),
);

export function pinoLoggerWrapper() {
  return pinoLogger({
    pino: appLogger,
    http: {
      reqId: () => crypto.randomUUID(),
    },
  });
}
