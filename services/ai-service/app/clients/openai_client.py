import asyncio
import json
import logging
from os import environ
from typing import Any, cast

from openai import AsyncOpenAI
from openai.types.responses import ResponseInputParam

from app.config import OPENAI_POINTS_IMAGE_DETAIL

logger = logging.getLogger(__name__)


class OpenAIClient:
    def __init__(self) -> None:
        self.client = AsyncOpenAI(api_key=environ.get("OPENAI_API_KEY"))
        self.model = "gpt-5.4-mini"
        self.points_image_detail = OPENAI_POINTS_IMAGE_DETAIL
        self.semaphore = asyncio.Semaphore(
            int(environ.get("OPENAI_MAX_CONCURRENCY", "3"))
        )

    async def generate_json(self, prompt: str, image_url: str | None = None) -> dict:
        content: list[dict[str, Any]] = [
            {"type": "input_text", "text": prompt},
        ]
        if image_url:
            content.append(
                {"type": "input_image", "image_url": image_url, "detail": "auto"}
            )

        user_input = cast(
            ResponseInputParam,
            [
                {
                    "role": "user",
                    "content": content,
                }
            ],
        )

        async with self.semaphore:
            response = await self.client.responses.create(
                model=self.model, input=user_input
            )

        try:
            return json.loads(response.output_text)
        except json.JSONDecodeError:
            logger.exception("OpenAI did not return valid JSON: %s", response.output_text)
            raise

    async def generate_json_points(
        self,
        prompt: str,
        before_image_url: str | None = None,
        after_image_url: str | None = None,
    ) -> dict:
        user_input = cast(
            ResponseInputParam,
            [
                {
                    "type": "message",
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {
                            "type": "input_image",
                            "image_url": before_image_url,
                            "detail": self.points_image_detail,
                        },
                        {
                            "type": "input_image",
                            "image_url": after_image_url,
                            "detail": self.points_image_detail,
                        },
                    ],
                }
            ],
        )
        async with self.semaphore:
            response = await self.client.responses.create(
                model=self.model, input=user_input
            )
        logger.info("OpenAI points verification response=%s", response.output_text)
        return json.loads(response.output_text)
