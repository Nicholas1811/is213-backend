import json

import aio_pika

from app.clients.rabbitmq_client import RabbitMQClient
from aio_pika import ExchangeType


class Publisher:
    def __init__(
        self,
        rabbitmq_client: RabbitMQClient,
    ) -> None:
        self.rabbitmq_client = rabbitmq_client

    async def publish(
        self,
        exchange_name: str,
        routing_key: str,
        payload: dict,
        exchange_type: ExchangeType = ExchangeType.TOPIC,
    ) -> None:
        """Publish a JSON payload to the given exchange."""
        exchange = await self.rabbitmq_client.get_exchange(
            exchange_name,
            exchange_type,
        )

        message = aio_pika.Message(
            body=json.dumps(payload).encode("utf-8"),
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )
        await exchange.publish(
            message,
            routing_key=routing_key,
        )
