from app.messaging.publisher import Publisher
from app.config import LISTING_PROCESSED_ROUTING_KEY
from app.schemas.listing_uploaded import ListingUploadRequest
from app.services.listing_process_service import ListingProcessService


class ListingUploadedHandlder:
    def __init__(
        self, publisher: Publisher, listing_process_service: ListingProcessService
    ) -> None:
        self.publisher = publisher
        self.listing_process_service = listing_process_service

    async def handle(self, payload: dict) -> None:

        incoming_message = ListingUploadRequest.model_validate(payload)

        response = await self.listing_process_service.process(incoming_message)

        await self.publisher.publish(
            LISTING_PROCESSED_ROUTING_KEY, response.model_dump(by_alias=True)
        )
