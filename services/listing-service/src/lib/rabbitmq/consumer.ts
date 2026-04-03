import type { Channel, ConsumeMessage } from "amqplib";
import { appLogger } from "@/middlewares/pino-logger";
import {
  ListingConflictError,
  ListingNotFoundError,
  restockListing,
  syncListingFromEvent,
} from "@/services/listings.service";
import { rabbitConfig } from "./config";
import { getRabbitConnection } from "./connection";
import { cancelledOrderEventSchema, listingProcessedEventSchema } from "./messages";
import { assertTopology } from "./topology";

const logger = appLogger.child({ module: "rabbitmq-consumer" });

let topologyReadyFor: Channel | null = null;
let listingSyncConsumerTag: string | null = null;
let cancelOrderConsumerTag: string | null = null;

async function ensureTopology(channel: Channel): Promise<void> {
  if (topologyReadyFor === channel) {
    return;
  }

  await assertTopology(channel);
  topologyReadyFor = channel;
}

async function processListingSyncMessage(channel: Channel, message: ConsumeMessage): Promise<void> {
  try {
    const raw = JSON.parse(message.content.toString("utf-8")) as unknown;
    const parsed = listingProcessedEventSchema.safeParse(raw);

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

async function processCancelledOrderMessage(channel: Channel, message: ConsumeMessage): Promise<void> {
  try {
    const raw = JSON.parse(message.content.toString("utf-8")) as unknown;
    const parsed = cancelledOrderEventSchema.safeParse(raw);

    if (!parsed.success) {
      logger.warn({
        messageId: message.properties.messageId,
        details: parsed.error.flatten(),
      }, "Invalid cancel-order payload; dropping message");
      channel.nack(message, false, false);
      return;
    }

    try {
      const restockedListing = await restockListing(
        parsed.data.listing_id,
        parsed.data.qty,
      );

      logger.info({
        eventId: parsed.data.event_id,
        orderId: parsed.data.order_id,
        listingId: restockedListing.id,
        qty: parsed.data.qty,
        status: restockedListing.status,
      }, "Cancel-order event consumed and listing restocked");
    }
    catch (error) {
      if (error instanceof ListingNotFoundError || error instanceof ListingConflictError) {
        logger.warn({
          err: error,
          eventId: parsed.data.event_id,
          orderId: parsed.data.order_id,
          listingId: parsed.data.listing_id,
          qty: parsed.data.qty,
        }, "Cancel-order event could not restock listing");
        channel.ack(message);
        return;
      }

      throw error;
    }

    channel.ack(message);
  }
  catch (error) {
    logger.error({
      err: error,
      messageId: message.properties.messageId,
    }, "Failed to process cancel-order event; dropping message");
    channel.nack(message, false, false);
  }
}

export async function startListingConsumer(): Promise<void> {
  if (listingSyncConsumerTag && cancelOrderConsumerTag) {
    return;
  }

  const { consumeChannel } = await getRabbitConnection();
  await ensureTopology(consumeChannel);
  await consumeChannel.prefetch(rabbitConfig.prefetch);

  if (!listingSyncConsumerTag) {
    const listingSyncResult = await consumeChannel.consume(
      rabbitConfig.listingSync.queue,
      (message) => {
        if (!message) {
          return;
        }

        void processListingSyncMessage(consumeChannel, message);
      },
      {
        noAck: false,
      },
    );

    listingSyncConsumerTag = listingSyncResult.consumerTag;
    logger.info({
      queue: rabbitConfig.listingSync.queue,
      consumerTag: listingSyncConsumerTag,
    }, "RabbitMQ listing sync consumer started");
  }

  if (!cancelOrderConsumerTag) {
    const cancelOrderResult = await consumeChannel.consume(
      rabbitConfig.cancelOrder.queue,
      (message) => {
        if (!message) {
          return;
        }

        void processCancelledOrderMessage(consumeChannel, message);
      },
      {
        noAck: false,
      },
    );

    cancelOrderConsumerTag = cancelOrderResult.consumerTag;
    logger.info({
      exchange: rabbitConfig.cancelOrder.exchange,
      queue: rabbitConfig.cancelOrder.queue,
      consumerTag: cancelOrderConsumerTag,
    }, "RabbitMQ cancel-order consumer started");
  }
}

export async function stopListingConsumer(): Promise<void> {
  if (!listingSyncConsumerTag && !cancelOrderConsumerTag) {
    return;
  }

  try {
    const { consumeChannel } = await getRabbitConnection();

    if (listingSyncConsumerTag) {
      await consumeChannel.cancel(listingSyncConsumerTag);
      logger.info({ consumerTag: listingSyncConsumerTag }, "RabbitMQ listing sync consumer stopped");
    }

    if (cancelOrderConsumerTag) {
      await consumeChannel.cancel(cancelOrderConsumerTag);
      logger.info({ consumerTag: cancelOrderConsumerTag }, "RabbitMQ cancel-order consumer stopped");
    }
  }
  catch (error) {
    logger.warn({
      err: error,
      listingSyncConsumerTag,
      cancelOrderConsumerTag,
    }, "Failed to stop RabbitMQ consumer cleanly");
  }
  finally {
    listingSyncConsumerTag = null;
    cancelOrderConsumerTag = null;
    topologyReadyFor = null;
  }
}
