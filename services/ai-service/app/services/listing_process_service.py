from uuid import uuid4
from app.clients import openai_client
from app.clients.openai_client import OpenAIClient
from app.schemas.listing_processed import ListingProcessResponse, ListingProcessedData
from app.schemas.listing_uploaded import ListingUploadRequest
from datetime import datetime, timezone


class ListingProcessService:
    def __init__(self, openai_client: OpenAIClient) -> None:
        self.openai_client = openai_client

    async def process(self, request: ListingUploadRequest) -> ListingProcessResponse:
        image = request.data.s3ImageUrl

        system_prompt = """
        You are generating listing details for a food marketplace called Just Meal Savings.

        Look at the image and determine whether it shows edible food suitable for resale on a meal-saving marketplace.

        Return only valid JSON with exactly these keys:
        - name
        - description
        
        Rules:
        - The item must be described as food only if it appears edible.
        - If the image does not clearly show edible food, set both name and description to "Unknown".
        - name should be short and specific based on visible appearance.
        - description should be one short factual sentence describing the food in the image.
        - Do not include prices, branding, marketing language, or extra keys.


        """

        ai_result = await self.openai_client.generate_json(system_prompt, image)

        new_timestamp = (
            datetime.now(timezone.utc)
            .isoformat(timespec="milliseconds")
            .replace("+00:00", "Z")
        )
        created_at = request.data.createdAt or request.occurredAt or new_timestamp

        response = ListingProcessResponse(
            eventId=str(uuid4()),
            eventName="listing.processed",
            eventVersion=request.eventVersion,
            occurredAt=new_timestamp,
            source="ai-service",
            correlationId=request.correlationId or request.eventId,
            data=ListingProcessedData(
                id=request.data.id,
                s3ImageUrl=request.data.s3ImageUrl,
                name=ai_result["name"],
                description=ai_result["description"],
                qty=request.data.qty,
                unitPriceCents=request.data.unitPriceCents,
                status="processed",
                bestBefore=request.data.bestBefore,
                createdAt=created_at,
                updatedAt=new_timestamp,
            ),
        )
        return response
