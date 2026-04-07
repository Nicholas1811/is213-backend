import asyncio

import numpy as np

from app.schemas.points_verification_upload import PointsVerificationUploadRequest
from app.services.points_verification_service import PointsVerificationService
from app.vision.models import (
    ScreenReplayDetectionResult,
    ScreenReplayFeatures,
    ScreenReplayModelResult,
)


class FakeOpenAIClient:
    def __init__(self, response: dict[str, object]) -> None:
        self.response = response
        self.calls = 0

    async def generate_json_points(
        self,
        prompt: str,
        before_image_url: str | None = None,
        after_image_url: str | None = None,
    ) -> dict[str, object]:
        self.calls += 1
        return self.response


class FakeImageLoader:
    def __init__(self, images: list[np.ndarray]) -> None:
        self.images = images
        self.index = 0

    async def load(self, source: str) -> np.ndarray:
        image = self.images[self.index]
        self.index += 1
        return image


class FakeScreenReplayDetector:
    def __init__(self, results: list[ScreenReplayDetectionResult]) -> None:
        self.results = results
        self.index = 0

    def analyze(self, image: np.ndarray) -> ScreenReplayDetectionResult:
        result = self.results[self.index]
        self.index += 1
        return result


class FakeScreenReplayModel:
    def __init__(self, results: list[ScreenReplayModelResult]) -> None:
        self.results = results
        self.index = 0

    def predict(
        self, result: ScreenReplayDetectionResult
    ) -> ScreenReplayModelResult:
        model_result = self.results[self.index]
        self.index += 1
        return model_result


def _result(is_screen_replay: bool, score: float, reason: str) -> ScreenReplayDetectionResult:
    return ScreenReplayDetectionResult(
        is_screen_replay=is_screen_replay,
        score=score,
        confidence=score if is_screen_replay else 1.0 - score,
        reason=reason,
        features=ScreenReplayFeatures(
            fft_periodicity_ratio=9.0 if is_screen_replay else 2.5,
            fft_axis_energy_ratio=1.4 if is_screen_replay else 0.9,
            border_line_density=0.3 if is_screen_replay else 0.02,
            internal_display_region_score=0.6 if is_screen_replay else 0.05,
            high_frequency_energy_ratio=1.2 if is_screen_replay else 0.7,
            ratio_gradient_shape_ratio=1.45 if is_screen_replay else 0.95,
        ),
    )


def _model_result(
    is_screen_replay: bool,
    probability: float,
) -> ScreenReplayModelResult:
    return ScreenReplayModelResult(
        is_screen_replay=is_screen_replay,
        probability=probability,
        threshold=0.5,
    )


def test_service_short_circuits_when_screen_replay_is_detected() -> None:
    request = PointsVerificationUploadRequest(
        user_id="user-1",
        trans_id="txn-1",
        before_url="before.jpg",
        after_url="after.jpg",
    )
    service = PointsVerificationService(
        openai_client=FakeOpenAIClient(
            {"status": "approved", "confidence": 0.98, "reason": "same meal"}
        ),
        image_loader=FakeImageLoader(
            [np.zeros((16, 16, 3), dtype=np.uint8), np.zeros((16, 16, 3), dtype=np.uint8)]
        ),
        screen_replay_detector=FakeScreenReplayDetector(
            [
                _result(True, 0.91, "suspected screen replay"),
                _result(False, 0.18, "clean"),
            ]
        ),
        precheck_enabled=True,
    )

    response = asyncio.run(service.process(request))

    assert response.status == "rejected"
    assert service.openai_client.calls == 0


def test_service_uses_openai_when_local_precheck_is_clean() -> None:
    request = PointsVerificationUploadRequest(
        user_id="user-2",
        trans_id="txn-2",
        before_url="before.jpg",
        after_url="after.jpg",
    )
    openai_client = FakeOpenAIClient(
        {
            "is_real_scene": True,
            "same_meal_setting": True,
            "before_food_percent": 82,
            "after_food_percent": 4,
            "confidence": 0.88,
            "reason": "meal completed",
        }
    )
    service = PointsVerificationService(
        openai_client=openai_client,
        image_loader=FakeImageLoader(
            [np.zeros((16, 16, 3), dtype=np.uint8), np.zeros((16, 16, 3), dtype=np.uint8)]
        ),
        screen_replay_detector=FakeScreenReplayDetector(
            [
                _result(False, 0.14, "clean"),
                _result(False, 0.21, "clean"),
            ]
        ),
        precheck_enabled=True,
    )

    response = asyncio.run(service.process(request))

    assert response.status == "approved"
    assert openai_client.calls == 1


def test_service_short_circuits_when_model_predicts_spoof() -> None:
    request = PointsVerificationUploadRequest(
        user_id="user-3",
        trans_id="txn-3",
        before_url="before.jpg",
        after_url="after.jpg",
    )
    openai_client = FakeOpenAIClient(
        {"status": "approved", "confidence": 0.92, "reason": "same meal"}
    )
    service = PointsVerificationService(
        openai_client=openai_client,
        image_loader=FakeImageLoader(
            [np.zeros((16, 16, 3), dtype=np.uint8), np.zeros((16, 16, 3), dtype=np.uint8)]
        ),
        screen_replay_detector=FakeScreenReplayDetector(
            [
                _result(False, 0.33, "clean"),
                _result(False, 0.29, "clean"),
            ]
        ),
        screen_replay_model=FakeScreenReplayModel(
            [
                _model_result(True, 0.84),
                _model_result(False, 0.21),
            ]
        ),
        precheck_enabled=True,
    )

    response = asyncio.run(service.process(request))

    assert response.status == "rejected"
    assert openai_client.calls == 0


def test_service_ignores_heuristic_reject_when_model_is_clean() -> None:
    request = PointsVerificationUploadRequest(
        user_id="user-4",
        trans_id="txn-4",
        before_url="before.jpg",
        after_url="after.jpg",
    )
    openai_client = FakeOpenAIClient(
        {
            "is_real_scene": True,
            "same_meal_setting": True,
            "before_food_percent": 79,
            "after_food_percent": 5,
            "confidence": 0.87,
            "reason": "meal completed",
        }
    )
    service = PointsVerificationService(
        openai_client=openai_client,
        image_loader=FakeImageLoader(
            [np.zeros((16, 16, 3), dtype=np.uint8), np.zeros((16, 16, 3), dtype=np.uint8)]
        ),
        screen_replay_detector=FakeScreenReplayDetector(
            [
                _result(True, 0.91, "suspected screen replay"),
                _result(False, 0.18, "clean"),
            ]
        ),
        screen_replay_model=FakeScreenReplayModel(
            [
                _model_result(False, 0.19),
                _model_result(False, 0.17),
            ]
        ),
        precheck_enabled=True,
    )

    response = asyncio.run(service.process(request))

    assert response.status == "approved"
    assert openai_client.calls == 1
