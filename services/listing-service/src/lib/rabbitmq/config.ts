import env from "@/env";

export const rabbitConfig = {
  url: env.RABBITMQ_URL,
  listingPublish: {
    exchange: env.RABBITMQ_LISTING_EXCHANGE,
    exchangeType: "topic" as const,
  },
  listingSync: {
    exchange: env.RABBITMQ_LISTING_SYNC_EXCHANGE,
    exchangeType: "topic" as const,
    queue: env.RABBITMQ_QUEUE,
    routingKeys: [env.RABBITMQ_LISTING_SYNC_ROUTING_KEY] as const,
  },
  cancelOrder: {
    exchange: env.RABBITMQ_CANCEL_ORDER_EXCHANGE,
    exchangeType: "fanout" as const,
    queue: env.RABBITMQ_CANCEL_ORDER_QUEUE,
  },
  prefetch: env.RABBITMQ_PREFETCH,
} as const;
