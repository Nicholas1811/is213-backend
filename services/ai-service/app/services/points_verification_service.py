from uuid import uuid4
from app.clients import openai_client
from app.clients.openai_client import OpenAIClient
from datetime import datetime, timezone

from app.schemas.points_verification_processed import (
    PointsVerificationProcessedResponse,
)
from app.schemas.points_verification_upload import PointsVerificationUploadRequest


class PointsVerificationService:
    def __init__(self, openai_client: OpenAIClient) -> None:
        self.openai_client = openai_client

    async def process(
        self, request: PointsVerificationUploadRequest
    ) -> PointsVerificationProcessedResponse:
        before_image_url = request.before_url
        after_image_url = request.after_url

        system_prompt = """
             You are verifying whether a user finished a meal for a rewards system.

             You will receive two images:
             1. a before-eating photo
             2. an after-eating photo
             
             Your task is to compare them and decide whether the meal completion should be approved.
             
             Approval rules:
             - The two images should appear to show the same meal setting, such as a similar plate, tray, table, or surrounding context.
             - The after photo should show that the plate or food container is at least 90% empty.
             - Approve only if it is likely the same meal before and after eating.
             - Reject if the images do not appear related, if the after photo still contains substantial food, or if the result is unclear.
             
             Return only valid JSON with exactly this key:
             - status
             
             Valid values:
             - approved
             - rejected

        """

        ai_result = await self.openai_client.generate_json_points(
            system_prompt, before_image_url, after_image_url
        )

        response = PointsVerificationProcessedResponse(
            trans_id=request.trans_id,
            user_id=request.user_id,
            status=ai_result["status"],
        )
        return response
