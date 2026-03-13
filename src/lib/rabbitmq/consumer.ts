import type { Channel, ConsumeMessage } from "amqplib";
import { appLogger } from "@/middlewares/pino-logger";
import { syncListingFromEvent } from "@/services/listings.service";
import { rabbitConfig } from "./config";
import { getRabbitConnection } from "./connection";
import { listingEventSchema } from "./messages";
import { assertTopology } from "./topology";

const logger = appLogger.child({ module: "rabbitmq-consumer" });

let topologyReadyFor: Channel | null = null;
let consumerTag: string | null = null;

async function ensureTopology(channel: Channel): Promise<void> {
  if (topologyReadyFor === channel) {
    return;
  }

  await assertTopology(channel);
  topologyReadyFor = channel;
}

async function processMessage(channel: Channel, message: ConsumeMessage): Promise<void> {
  try {
    const raw = JSON.parse(message.content.toString("utf-8")) as unknown;
    const parsed = listingEventSchema.safeParse(raw);

    if (!parsed.success) {
      logger.warn({
        messageId: message.properties.messageId,
        details: parsed.error.flatten(),
      }, "Invalid RabbitMQ event payload; dropping message");
      channel.nack(message, false, false);
      return;
    }

    const syncedListing = await syncListingFromEvent(parsed.data.data);
    if (!syncedListing) {
      logger.warn({
        eventId: parsed.data.eventId,
        listingId: parsed.data.data.id,
      }, "RabbitMQ event consumed, but listing was not found");
      channel.ack(message);
      return;
    }

    logger.info({
      eventId: parsed.data.eventId,
      eventName: parsed.data.eventName,
      listingId: syncedListing.id,
      status: syncedListing.status,
    }, "RabbitMQ event consumed and listing synced");

    channel.ack(message);
  }
  catch (error) {
    logger.error({
      err: error,
      messageId: message.properties.messageId,
    }, "Failed to process RabbitMQ event; dropping message");
    channel.nack(message, false, false);
  }
}

export async function startListingConsumer(): Promise<void> {
  if (consumerTag) {
    return;
  }

  const { consumeChannel } = await getRabbitConnection();
  await ensureTopology(consumeChannel);
  await consumeChannel.prefetch(rabbitConfig.prefetch);

  const result = await consumeChannel.consume(
    rabbitConfig.queue,
    (message) => {
      if (!message) {
        return;
      }

      void processMessage(consumeChannel, message);
    },
    {
      noAck: false,
    },
  );

  consumerTag = result.consumerTag;
  logger.info({
    queue: rabbitConfig.queue,
    consumerTag,
  }, "RabbitMQ consumer started");
}

export async function stopListingConsumer(): Promise<void> {
  if (!consumerTag) {
    return;
  }

  try {
    const { consumeChannel } = await getRabbitConnection();
    await consumeChannel.cancel(consumerTag);
    logger.info({ consumerTag }, "RabbitMQ consumer stopped");
  }
  catch (error) {
    logger.warn({
      err: error,
      consumerTag,
    }, "Failed to stop RabbitMQ consumer cleanly");
  }
  finally {
    consumerTag = null;
    topologyReadyFor = null;
  }
}
