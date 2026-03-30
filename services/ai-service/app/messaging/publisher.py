import json
import logging

import aio_pika

from aio_pika import ExchangeType
from app.clients.rabbitmq_client import RabbitMQClient

logger = logging.getLogger(__name__)


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
        logger.info(
            "Published message exchange_name=%s routing_key=%s payload=%s",
            exchange_name or "<default>",
            routing_key,
            payload,
        )
