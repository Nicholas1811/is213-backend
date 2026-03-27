from os import environ
from openai import OpenAI


class OpenAIClient:
    def __init__(self) -> None:
        self.client = OpenAI(api_key=environ.get("OPENAI_API_KEY"))
        self.model = "gpt-4.1-mini"
