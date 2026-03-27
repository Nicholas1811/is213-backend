import asyncio
import logging

from app.clients.rabbitmq_client import RabbitMQClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


logger = logging.getLogger("ai-service")


async def main() -> None:
    logger.info("Starting main")
    rabbitmq_client = RabbitMQClient()
    await rabbitmq_client.connect()

    logger.info("RabbitMQ connection is done")
    await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
