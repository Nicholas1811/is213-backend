import logging

from app.config import AI_EVENTS_EXCHANGE, LISTING_PROCESSED_ROUTING_KEY
from app.messaging.publisher import Publisher
from app.schemas.listing_uploaded import ListingUploadRequest
from app.services.listing_process_service import ListingProcessService

logger = logging.getLogger(__name__)


class ListingUploadedHandlder:
    def __init__(
        self, publisher: Publisher, listing_process_service: ListingProcessService
    ) -> None:
        self.publisher = publisher
        self.listing_process_service = listing_process_service

    async def handle(self, payload: dict) -> None:

        incoming_message = ListingUploadRequest.model_validate(payload)
        logger.info(
            "Received listing.uploaded event for listing_id=%s",
            incoming_message.data.id,
        )

        response = await self.listing_process_service.process(incoming_message)

        await self.publisher.publish(
            exchange_name=AI_EVENTS_EXCHANGE,
            routing_key=LISTING_PROCESSED_ROUTING_KEY,
            payload=response.model_dump(by_alias=True),
        )
        logger.info(
            "Published listing.processed event for listing_id=%s",
            response.data.id,
        )
