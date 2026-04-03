from pathlib import Path
from typing import cast
from urllib.parse import urlparse

import cv2
import httpx
import numpy as np
from numpy.typing import NDArray

UInt8Image = NDArray[np.uint8]


class ImageLoader:
    def __init__(self, timeout_seconds: float = 10.0) -> None:
        self.timeout_seconds = timeout_seconds

    async def load(self, source: str) -> UInt8Image:
        image_bytes = await self._read_bytes(source)
        image = cv2.imdecode(
            np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR
        )
        if image is None:
            raise ValueError(f"Unable to decode image from source: {source}")
        return cast(UInt8Image, image)

    async def _read_bytes(self, source: str) -> bytes:
        parsed = urlparse(source)
        if parsed.scheme in {"http", "https"}:
            async with httpx.AsyncClient(
                timeout=self.timeout_seconds,
                follow_redirects=True,
            ) as client:
                response = await client.get(source)
                response.raise_for_status()
                return response.content

        path = Path(parsed.path if parsed.scheme == "file" else source)
        return path.read_bytes()
