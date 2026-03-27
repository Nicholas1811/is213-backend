import asyncio
import aio_pika
from config import RABBITMQ_URL, RABBITMQ_EXCHANGE


class RabbitMQConsumer:
    def __init__(self) -> None:
