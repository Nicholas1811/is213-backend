import asyncio
import logging
from app.messaging.consumer import Consumer
from app.handlers.listing_uploaded_handler import ListingUploadedHandlder
from app.handlers.points_verify_uploaded_handler import PointsVerifyUploadHandler
from app.messaging.publisher import Publisher
from app.services.listing_process_service import ListingProcessService
from app.services.points_verification_service import PointsVerificationService
from app.clients.openai_client import OpenAIClient
from app.clients.rabbitmq_client import RabbitMQClient
from app.vision import ImageLoader, ScreenReplayDetector, ScreenReplayModel

from app.config import (
    AI_EVENTS_EXCHANGE,
    AI_CONSUME_QUEUE,
    AI_RESULT_QUEUE,
    AI_RESULT_ROUTING_KEY,
    AI_TASK_QUEUE,
    AI_TASK_ROUTING_KEY,
    LISTING_EVENTS_EXCHANGE,
    LISTING_PROCESSED_ROUTING_KEY,
    LISTING_UPLOADED_ROUTING_KEY,
    POINTS_VERIFICATION_EXCHANGE,
    SCREEN_REPLAY_DETECTOR_ENABLED,
    SCREEN_REPLAY_FETCH_TIMEOUT_SECONDS,
    SCREEN_REPLAY_MODEL_ENABLED,
    SCREEN_REPLAY_MODEL_PATH,
    SCREEN_REPLAY_MODEL_REJECT_THRESHOLD,
    SCREEN_REPLAY_REJECT_THRESHOLD,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


logger = logging.getLogger("ai-service")


async def main() -> None:
    logger.info("Starting AI-Service...")

    rabbitmq_client = RabbitMQClient()
    await rabbitmq_client.connect()

    openai_client = OpenAIClient()

    publisher = Publisher(rabbitmq_client)

    listing_process_service = ListingProcessService(openai_client)
    image_loader = ImageLoader(timeout_seconds=SCREEN_REPLAY_FETCH_TIMEOUT_SECONDS)
    screen_replay_detector = ScreenReplayDetector(
        reject_threshold=SCREEN_REPLAY_REJECT_THRESHOLD
    )
    screen_replay_model = (
        ScreenReplayModel.maybe_load(
            SCREEN_REPLAY_MODEL_PATH,
            reject_threshold=SCREEN_REPLAY_MODEL_REJECT_THRESHOLD,
        )
        if SCREEN_REPLAY_MODEL_ENABLED
        else None
    )
    if SCREEN_REPLAY_MODEL_ENABLED and screen_replay_model is None:
        logger.warning(
            "Screen replay model was enabled but not found at path=%s",
            SCREEN_REPLAY_MODEL_PATH,
        )
    points_verification_service = PointsVerificationService(
        openai_client,
        image_loader=image_loader,
        screen_replay_detector=screen_replay_detector,
        screen_replay_model=screen_replay_model,
        precheck_enabled=SCREEN_REPLAY_DETECTOR_ENABLED,
    )

    listing_handler = ListingUploadedHandlder(
        publisher=publisher, listing_process_service=listing_process_service
    )
    points_handler = PointsVerifyUploadHandler(
        publisher=publisher, points_verification_service=points_verification_service
    )

    listing_consumer = Consumer(
        rabbitmq_client=rabbitmq_client,
        queue_name=AI_CONSUME_QUEUE,
        exchange_name=LISTING_EVENTS_EXCHANGE,
        routing_key=LISTING_UPLOADED_ROUTING_KEY,
        handler=listing_handler.handle,
    )

    points_consumer = Consumer(
        rabbitmq_client=rabbitmq_client,
        queue_name=AI_TASK_QUEUE,
        exchange_name=POINTS_VERIFICATION_EXCHANGE,
        routing_key=AI_TASK_ROUTING_KEY,
        handler=points_handler.handle,
    )

    await listing_consumer.start()
    await points_consumer.start()

    logger.info("Consumers started")
    logger.info(
        "RabbitMQ connection is done listing_events_exchange=%s ai_events_exchange=%s processed_routing_key=%s",
        LISTING_EVENTS_EXCHANGE,
        AI_EVENTS_EXCHANGE,
        LISTING_PROCESSED_ROUTING_KEY,
    )
    await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
