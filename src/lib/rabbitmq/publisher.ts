import type { ConfirmChannel } from "amqplib";
import type { ListingEvent } from "./messages";
import { Buffer } from "node:buffer";
import { appLogger } from "@/middlewares/pino-logger";
import { rabbitConfig } from "./config";
import { getRabbitConnection } from "./connection";
import { assertTopology } from "./topology";

const logger = appLogger.child({ module: "rabbitmq-publisher" });
const retryDelaysMs = [250, 1000, 3000] as const;

let topologyReadyFor: ConfirmChannel | null = null;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function ensureTopology(channel: ConfirmChannel): Promise<void> {
  if (topologyReadyFor === channel) {
    return;
  }

  await assertTopology(channel);
  topologyReadyFor = channel;
}

export async function publishListingEvent(event: ListingEvent): Promise<boolean> {
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    try {
      const { publishChannel } = await getRabbitConnection();
      await ensureTopology(publishChannel);

      const payload = Buffer.from(JSON.stringify(event));
      const buffered = publishChannel.publish(
        rabbitConfig.exchange,
        event.eventName,
        payload,
        {
          contentType: "application/json",
          contentEncoding: "utf-8",
          persistent: true,
          messageId: event.eventId,
          type: event.eventName,
          timestamp: Date.now(),
          appId: event.source,
          correlationId: event.correlationId,
        },
      );

      if (!buffered) {
        await new Promise<void>((resolve) => {
          publishChannel.once("drain", resolve);
        });
      }

      await publishChannel.waitForConfirms();

      logger.debug({
        eventId: event.eventId,
        eventName: event.eventName,
      }, "RabbitMQ event published");

      return true;
    }
    catch (error) {
      topologyReadyFor = null;

      if (attempt === retryDelaysMs.length) {
        logger.error({
          err: error,
          eventId: event.eventId,
          eventName: event.eventName,
          attempts: attempt + 1,
        }, "Failed to publish RabbitMQ event");
        return false;
      }

      await wait(retryDelaysMs[attempt]);
    }
  }

  return false;
}
