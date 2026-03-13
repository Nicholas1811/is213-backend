import type { Channel } from "amqplib";
import { rabbitConfig } from "./config";

export async function assertTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(rabbitConfig.exchange, rabbitConfig.exchangeType, { durable: true });
  await channel.assertQueue(rabbitConfig.queue, { durable: true });

  for (const routingKey of rabbitConfig.routingKeys) {
    await channel.bindQueue(rabbitConfig.queue, rabbitConfig.exchange, routingKey);
  }
}
