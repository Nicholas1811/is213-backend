import logging
import aio_pika
from aio_pika.abc import (
    AbstractChannel,
    AbstractExchange,
    AbstractQueue,
    AbstractRobustConnection,
    ExchangeType,
)
from app.config import RABBITMQ_URL, RABBITMQ_EXCHANGE


class RabbitMQClient:
    """Manages the shared RabbitMQ connection, channel, and exchange."""

    def __init__(self) -> None:
        self.url = RABBITMQ_URL
        self.connection: AbstractRobustConnection | None = None
        self.channel: AbstractChannel | None = None
        self.exchange: AbstractExchange | None = None

    async def connect(self) -> None:
        """Open the RabbitMQ connection, create a channel, and declare the exchange."""
        if not self.url:
            raise RuntimeError("URL NOT FOUND")

        self.connection = await aio_pika.connect_robust(self.url)
        logging.info("Connected to RabbitMQ")
        self.channel = await self.connection.channel()
        self.exchange = await self.channel.declare_exchange(
            RABBITMQ_EXCHANGE, ExchangeType.TOPIC, durable=True
        )

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

    async def bind_queue(self, queue: AbstractQueue, routing_key: str) -> None:
        """Bind a queue to the exchange so messages with the given routing key are routed to it.

        Args:
            routing_key: The routing_key which you want your message to have

        Raises:
            RuntimeError: If the exchange is not initialized
        """

        if self.exchange is None:
            raise RuntimeError("RABBITMQ exchange is not initialized")

        await queue.bind(self.exchange, routing_key=routing_key)
