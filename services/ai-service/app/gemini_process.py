import json
import mimetypes
from dataclasses import dataclass
from os import environ
from urllib.parse import urlparse

from google import genai
from google.genai import types

DEFAULT_GEMINI_MODEL = environ.get("GEMINI_MODEL", "gemini-3-flash-preview")
LISTING_IMAGE_PROMPT = (
    "Return only valid JSON with exactly these keys: name, description. "
    "name = best guess of the main subject. "
    "description = short factual description."
)

client = genai.Client(api_key=environ.get("GEMINI_API_KEY") or environ.get("GOOGLE_API_KEY"))

@dataclass
class ListingImageDetails:
    name: str
    description: str


def infer_image_mime_type(image_url: str, mime_type: str | None = None) -> str:
    if mime_type:
        return mime_type

    guessed_type, _ = mimetypes.guess_type(urlparse(image_url).path)
    return guessed_type or "image/jpeg"


async def generate_listing_details_from_image_url(
    image_url: str,
    mime_type: str | None = None,
    prompt: str = LISTING_IMAGE_PROMPT,
) -> ListingImageDetails:
    resolved_mime_type = infer_image_mime_type(image_url, mime_type)

    response = client.models.generate_content(
        model=DEFAULT_GEMINI_MODEL,
        contents=[
            prompt,
            types.Part.from_uri(
                file_uri=image_url,
                mime_type=resolved_mime_type,
            ),
        ],
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )

    data = json.loads(response.text or "{}")
    return ListingImageDetails(
        name=data.get("name", ""),
        description=data.get("description", ""),
    )
