import type { Channel } from "amqplib";
import { rabbitConfig } from "./config";

export async function assertTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(
    rabbitConfig.listingSync.exchange,
    rabbitConfig.listingSync.exchangeType,
    { durable: true },
  );
  await channel.assertQueue(rabbitConfig.listingSync.queue, { durable: true });

  for (const routingKey of rabbitConfig.listingSync.routingKeys) {
    await channel.bindQueue(rabbitConfig.listingSync.queue, rabbitConfig.listingSync.exchange, routingKey);
  }

  await channel.assertExchange(
    rabbitConfig.cancelOrder.exchange,
    rabbitConfig.cancelOrder.exchangeType,
    { durable: true },
  );
  await channel.assertQueue(rabbitConfig.cancelOrder.queue, { durable: true });
  await channel.bindQueue(rabbitConfig.cancelOrder.queue, rabbitConfig.cancelOrder.exchange, "");
}
