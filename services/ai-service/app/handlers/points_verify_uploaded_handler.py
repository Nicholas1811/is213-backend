from app.messaging.publisher import Publisher
from app.config import AI_RESULT_ROUTING_KEY
from app.schemas.points_verification_upload import PointsVerificationUploadRequest
from app.services.points_verification_service import PointsVerificationService


class PointsVerifyUploadHandler:
    def __init__(
        self,
        publisher: Publisher,
        points_verification_service: PointsVerificationService,
    ) -> None:
        self.publisher = publisher
        self.points_verification_service = points_verification_service

    async def handle(self, payload: dict) -> None:

        incoming_message = PointsVerificationUploadRequest.model_validate(payload)

        response = await self.points_verification_service.process(incoming_message)

        await self.publisher.publish("",
            AI_RESULT_ROUTING_KEY, response.model_dump(by_alias=True)
        )
