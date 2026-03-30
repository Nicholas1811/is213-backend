import logging

import aio_pika
from aio_pika import ExchangeType
from aio_pika.abc import (
    AbstractChannel,
    AbstractExchange,
    AbstractQueue,
    AbstractRobustConnection,
)

from app.config import RABBITMQ_PREFETCH, RABBITMQ_URL


class RabbitMQClient:
    """Manages the shared RabbitMQ connection, channel, and exchanges."""

    def __init__(self) -> None:
        self.url = RABBITMQ_URL
        self.connection: AbstractRobustConnection | None = None
        self.channel: AbstractChannel | None = None
        self.exchanges: dict[str, AbstractExchange] = {}

    async def connect(self) -> None:
        """Open the RabbitMQ connection and create a shared channel."""
        if not self.url:
            raise RuntimeError("URL NOT FOUND")

        if self.connection is not None:
            return

        self.connection = await aio_pika.connect_robust(self.url)
        logging.info("Connected to RabbitMQ")
        self.channel = await self.connection.channel()
        await self.channel.set_qos(prefetch_count=RABBITMQ_PREFETCH)

    async def get_exchange(
        self,
        exchange_name: str,
        exchange_type: ExchangeType = ExchangeType.TOPIC,
    ) -> AbstractExchange:
        """Return a declared exchange, creating it on first use."""
        if not exchange_name:
            return self.channel.default_exchange

        if self.channel is None:
            raise RuntimeError("RABBITMQ channel is not initialized")

        exchange = self.exchanges.get(exchange_name)
        if exchange is not None:
            return exchange

        exchange = await self.channel.declare_exchange(
            exchange_name,
            exchange_type,
            durable=True,
        )
        self.exchanges[exchange_name] = exchange
        return exchange

    async def declare_queue(self, queue_name: str) -> AbstractQueue:
        """Declare a durable queue.

        Args:
             queue_name: The RabbitMQ queue name.

        Returns:
             The declared queue instance.

        Raises:
             RuntimeError: If the channel has not been initialized.
        """

        if self.channel is None:
            raise RuntimeError("RABBITMQ channel is not initialized")

        return await self.channel.declare_queue(queue_name, durable=True)

    async def bind_queue(
        self,
        queue: AbstractQueue,
        exchange_name: str,
        routing_key: str,
        exchange_type: ExchangeType = ExchangeType.TOPIC,
    ) -> None:
        """Bind a queue to the exchange so messages with the given routing key are routed to it.

        Args:
            exchange_name: The exchange the queue should be bound to.
            routing_key: The routing_key which you want your message to have

        Raises:
            RuntimeError: If the exchange is not initialized
        """
        if not exchange_name:
            return
        exchange = await self.get_exchange(exchange_name, exchange_type)
        await queue.bind(exchange, routing_key=routing_key)

    async def close(self) -> None:
        """Close the RabbitMQ connection."""
        if self.connection is not None:
            await self.connection.close()
