import env from "@/env";

export const rabbitConfig = {
  url: env.RABBITMQ_URL,
  exchange: env.RABBITMQ_EXCHANGE,
  exchangeType: "topic" as const,
  queue: env.RABBITMQ_QUEUE,
  routingKeys: ["listing.processed"] as const,
  listingSync: {
    exchange: env.RABBITMQ_EXCHANGE,
    exchangeType: "topic" as const,
    queue: env.RABBITMQ_QUEUE,
    routingKeys: ["listing.processed"] as const,
  },
  cancelOrder: {
    exchange: env.RABBITMQ_CANCEL_ORDER_EXCHANGE,
    exchangeType: "fanout" as const,
    queue: env.RABBITMQ_CANCEL_ORDER_QUEUE,
  },
  prefetch: env.RABBITMQ_PREFETCH,
} as const;
