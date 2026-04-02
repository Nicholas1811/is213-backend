from collections.abc import Awaitable, Callable
import json
import logging

from aio_pika import ExchangeType
from aio_pika.abc import AbstractIncomingMessage

from app.clients.rabbitmq_client import RabbitMQClient

MessageHandler = Callable[[dict], Awaitable[None]]
logger = logging.getLogger(__name__)


class Consumer:
    def __init__(
        self,
        rabbitmq_client: RabbitMQClient,
        queue_name: str,
        exchange_name: str,
        routing_key: str,
        handler: MessageHandler,
        exchange_type: ExchangeType = ExchangeType.TOPIC,
    ) -> None:

        self.rabbitmq_client = rabbitmq_client
        self.queue_name = queue_name
        self.exchange_name = exchange_name
        self.routing_key = routing_key
        self.handler = handler
        self.exchange_type = exchange_type

    async def start(self) -> None:
        """Declare and bind the queue, then register the consumer into main"""

        queue = await self.rabbitmq_client.declare_queue(self.queue_name)

        await self.rabbitmq_client.bind_queue(
            queue=queue,
            exchange_name=self.exchange_name,
            routing_key=self.routing_key,
            exchange_type=self.exchange_type,
        )

        await queue.consume(self._handle_message)
        logger.info(
            "Consumer started queue_name=%s exchange_name=%s routing_key=%s",
            self.queue_name,
            self.exchange_name,
            self.routing_key,
        )

    async def _handle_message(self, message: AbstractIncomingMessage) -> None:
        try:
            payload = json.loads(message.body.decode("utf-8"))
            logger.info(
                "Received message queue_name=%s routing_key=%s",
                self.queue_name,
                message.routing_key,
            )
            await self.handler(payload)
            await message.ack()
        except json.JSONDecodeError:
            logger.exception(
                "Invalid JSON payload queue_name=%s routing_key=%s",
                self.queue_name,
                message.routing_key,
            )
            await message.reject(requeue=False)
        except Exception:
            should_requeue = not message.redelivered
            logger.exception(
                "Failed to process message queue_name=%s routing_key=%s requeue=%s",
                self.queue_name,
                message.routing_key,
                should_requeue,
            )
            await message.reject(requeue=should_requeue)
