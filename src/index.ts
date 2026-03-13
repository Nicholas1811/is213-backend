import { serve } from "@hono/node-server";
import app from "@/app";
import env from "@/env";
import { closeRabbitConnection, getRabbitConnection } from "@/lib/rabbitmq/connection";
import { startListingConsumer, stopListingConsumer } from "@/lib/rabbitmq/consumer";
import { assertTopology } from "@/lib/rabbitmq/topology";
import { appLogger } from "@/middlewares/pino-logger";

const logger = appLogger.child({ module: "bootstrap" });

const server = serve({
  fetch: app.fetch,
  port: env.PORT,
}, (info) => {
  logger.info(`Server is running on http://localhost:${info.port}`);
});

async function bootstrapRabbitMQ(): Promise<void> {
  try {
    const { publishChannel } = await getRabbitConnection();

    await assertTopology(publishChannel);
    await startListingConsumer();

    logger.info("RabbitMQ initialised");
  }
  catch (error) {
    logger.warn({ err: error }, "RabbitMQ unavailable, running in degraded mode(Only HTTP calls)");
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
