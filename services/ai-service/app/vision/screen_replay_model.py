from pathlib import Path
from typing import Any

import joblib
import numpy as np

from app.vision.models import (
    SCREEN_REPLAY_FEATURE_NAMES,
    ScreenReplayDetectionResult,
    ScreenReplayModelResult,
)


class ScreenReplayModel:
    def __init__(self, model_path: str, reject_threshold: float = 0.5) -> None:
        self.model_path = Path(model_path)
        self.reject_threshold = reject_threshold
        payload = joblib.load(self.model_path)
        if isinstance(payload, dict):
            self.model = payload["model"]
            self.feature_names = list(payload.get("feature_names", []))
        else:
            self.model = payload
            self.feature_names = []
        self._validate_model_signature()

    def predict(
        self, detection_result: ScreenReplayDetectionResult
    ) -> ScreenReplayModelResult:
        features = np.asarray([detection_result.features.as_vector()], dtype=np.float32)
        probabilities = self.model.predict_proba(features)
        probability = float(probabilities[0][1])
        return ScreenReplayModelResult(
            is_screen_replay=probability >= self.reject_threshold,
            probability=round(probability, 4),
            threshold=self.reject_threshold,
        )

    def _validate_model_signature(self) -> None:
        expected_feature_count = len(SCREEN_REPLAY_FEATURE_NAMES)
        actual_feature_count = getattr(self.model, "n_features_in_", None)
        if actual_feature_count is not None and actual_feature_count != expected_feature_count:
            raise ValueError(
                "Screen replay model expects "
                f"{actual_feature_count} features, but runtime provides "
                f"{expected_feature_count}. Retrain the model artifact."
            )
        if self.feature_names and self.feature_names != list(SCREEN_REPLAY_FEATURE_NAMES):
            raise ValueError(
                "Screen replay model feature names do not match the runtime feature set. "
                "Retrain the model artifact."
            )

    @classmethod
    def maybe_load(
        cls,
        model_path: str,
        reject_threshold: float = 0.5,
    ) -> "ScreenReplayModel | None":
        path = Path(model_path)
        if not path.exists():
            return None
        return cls(str(path), reject_threshold=reject_threshold)
