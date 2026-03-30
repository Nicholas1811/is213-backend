from os import environ
from aio_pika import logger
from openai import OpenAI
from openai.types.responses import ResponseInputParam
import json


class OpenAIClient:
    def __init__(self) -> None:
        self.client = OpenAI(api_key=environ.get("OPENAI_API_KEY"))
        self.model = "gpt-5.4-mini"

    async def generate_json(self, prompt: str, image_url: str | None = None) -> dict:
        user_input: ResponseInputParam = [
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "image_url": image_url, "detail": "auto"},
                ],
            }
        ]
        response = self.client.responses.create(model=self.model, input=user_input)
        return json.loads(response.output_text)

    async def generate_json_points(
        self,
        prompt: str,
        before_image_url: str | None = None,
        after_image_url: str | None = None,
    ) -> dict:

        user_input: ResponseInputParam = [
            {
                "type": "message",
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {
                        "type": "input_image",
                        "image_url": before_image_url,
                        "detail": "auto",
                    },
                    {
                        "type": "input_image",
                        "image_url": after_image_url,
                        "detail": "auto",
                    },
                ],
            }
        ]
        response = self.client.responses.create(model=self.model, input=user_input)
        logger.info(response)
        return json.loads(response.output_text)
