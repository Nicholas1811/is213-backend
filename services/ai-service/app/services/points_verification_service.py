import logging

from app.clients.openai_client import OpenAIClient

from app.schemas.points_verification_processed import (
    PointsVerificationProcessedResponse,
)
from app.schemas.points_verification_upload import PointsVerificationUploadRequest

logger = logging.getLogger(__name__)


class PointsVerificationService:
    def __init__(self, openai_client: OpenAIClient) -> None:
        self.openai_client = openai_client

    async def process(
        self, request: PointsVerificationUploadRequest
    ) -> PointsVerificationProcessedResponse:
        before_image_url = request.before_url
        after_image_url = request.after_url

        system_prompt = """
             You are verifying whether a user truly finished a real meal for a rewards system.

             You will receive two images in order:
             1. the before-eating photo
             2. the after-eating photo

             First, decide whether both images show a real physical meal scene.
             Immediately reject if either image shows:
             - food displayed on a phone, tablet, laptop, monitor, television, or any other screen
             - a screenshot, printed photo, poster, menu, advertisement, or digital display of food
             - visible UI, bezels, screen borders, reflections, app layouts, or status bars
             - a person holding a device that displays food instead of a real meal
             - a scene that does not appear physically real

             After confirming both images show a real meal, decide meal completion:
             - the two images should appear to show the same meal setting, such as a similar plate, tray, table, or surrounding context
             - the after photo should show that the plate or food container is at least 90 percent empty
             - approve only if it is likely the same real meal before and after eating
             - reject if the images do not appear related, if the after photo still contains substantial food, or if the result is unclear
             - if you are uncertain at any step, return rejected

             Return only valid JSON with exactly these keys:
             - status
             - confidence
             - reason

             Valid values:
             - status must be either approved or rejected
             - confidence must be a number from 0 to 1
             - reason must be a short phrase explaining the decision

             Confidence rules:
             - use higher confidence only when the same real meal setting is clear and the after image is clearly at least 90 percent empty
             - use high confidence rejection when a screen, screenshot, or displayed food image is visible

        """

        ai_result = await self.openai_client.generate_json_points(
            system_prompt, before_image_url, after_image_url
        )
        logger.info(
            "Points verification AI decision trans_id=%s user_id=%s status=%s confidence=%s reason=%s",
            request.trans_id,
            request.user_id,
            ai_result.get("status"),
            ai_result.get("confidence"),
            ai_result.get("reason"),
        )

        response = PointsVerificationProcessedResponse(
            trans_id=request.trans_id,
            user_id=request.user_id,
            status=ai_result["status"],
        )
        return response
