import { serve } from "@hono/node-server";
import app from "@/app";
import env from "@/env";
import { closeRabbitConnection, getRabbitConnection } from "@/lib/rabbitmq/connection";
import { startListingConsumer, stopListingConsumer } from "@/lib/rabbitmq/consumer";
import { assertTopology } from "@/lib/rabbitmq/topology";
import { appLogger } from "@/middlewares/pino-logger";

const logger = appLogger.child({ module: "bootstrap" });
const rabbitBootstrapRetryCount = 5;
const rabbitBootstrapRetryDelayMs = 3000;

const server = serve({
  fetch: app.fetch,
  port: env.PORT,
}, (info) => {
  logger.info(`Server is running on http://localhost:${info.port}`);
});

async function bootstrapRabbitMQ(): Promise<void> {
  for (let attempt = 1; attempt <= rabbitBootstrapRetryCount; attempt += 1) {
    try {
      const { publishChannel } = await getRabbitConnection();

      await assertTopology(publishChannel);
      await startListingConsumer();

      logger.info({ attempt }, "RabbitMQ initialised");
      return;
    }
    catch (error) {
      if (attempt === rabbitBootstrapRetryCount) {
        logger.warn({ err: error, attempts: attempt }, "RabbitMQ unavailable, running in degraded mode(Only HTTP calls)");
        return;
      }

      logger.warn({ err: error, attempt, nextRetryInMs: rabbitBootstrapRetryDelayMs }, "RabbitMQ bootstrap failed, retrying");
      await new Promise<void>((resolve) => {
        setTimeout(resolve, rabbitBootstrapRetryDelayMs);
      });
    }
  }
}

bootstrapRabbitMQ();

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, "Shutting down");

  await stopListingConsumer();
  await closeRabbitConnection();

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  process.exit(0);
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
