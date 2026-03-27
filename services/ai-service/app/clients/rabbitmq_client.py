import aio_pika
from aio_pika.abc import AbstractChannel, AbstractQueue, AbstractRobustChannel
from config import RABBITMQ_URL, RABBITMQ_EXCHANGE


class RabiitMQClient:
    def __init__(self) -> None:
        self.url = RABBITMQ_URL
        self.exchange = RABBITMQ_URL
        self._connection: AbstractRobustChannel | None = None
        self._channel: AbstractChannel | None = None
        self._queue: AbstractQueue | None = None

    async def connect(self) -> None:
        if not self.url:
            raise RuntimeError("URL NOT FOUND")

        if self._connection is None:
            return
