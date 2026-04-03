from math import hypot
from typing import cast

import cv2
import numpy as np
from numpy.typing import NDArray

from app.vision.models import ScreenReplayDetectionResult, ScreenReplayFeatures

UInt8Image = NDArray[np.uint8]
Float32Image = NDArray[np.float32]
Int32Lines = NDArray[np.int32]


class ScreenReplayDetector:
    def __init__(
        self,
        reject_threshold: float = 0.72,
        max_dimension: int = 768,
    ) -> None:
        self.reject_threshold = reject_threshold
        self.max_dimension = max_dimension

    def analyze(self, image: UInt8Image) -> ScreenReplayDetectionResult:
        prepared = self._resize(image)
        gray = self._as_float32_image(
            cv2.cvtColor(prepared, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
        )

        fft_periodicity_ratio, fft_axis_energy_ratio, high_frequency_energy_ratio = (
            self._fft_metrics(gray)
        )
        border_line_density = self._border_line_density(gray)
        ratio_gradient_shape_ratio = self._ratio_gradient_shape_ratio(gray)

        features = ScreenReplayFeatures(
            fft_periodicity_ratio=fft_periodicity_ratio,
            fft_axis_energy_ratio=fft_axis_energy_ratio,
            border_line_density=border_line_density,
            high_frequency_energy_ratio=high_frequency_energy_ratio,
            ratio_gradient_shape_ratio=ratio_gradient_shape_ratio,
        )

        signal_scores = {
            "periodic_frequency_pattern": self._scale(fft_periodicity_ratio, 6.0, 11.5),
            "axis_aligned_frequency_energy": self._scale(
                fft_axis_energy_ratio, 1.08, 1.65
            ),
            "screen_border_lines": self._scale(border_line_density, 0.08, 0.4),
            "microtexture_energy": self._scale(
                high_frequency_energy_ratio, 0.18, 0.34
            ),
            "ratio_gradient_shape": self._scale(
                ratio_gradient_shape_ratio, 0.75, 1.55
            ),
        }

        score = (
            0.46 * signal_scores["screen_border_lines"]
            + 0.28 * signal_scores["microtexture_energy"]
            + 0.26 * signal_scores["ratio_gradient_shape"]
        )

        if (
            signal_scores["microtexture_energy"] > 0.55
            and signal_scores["ratio_gradient_shape"] > 0.5
        ):
            score += 0.08

        if (
            signal_scores["screen_border_lines"] > 0.4
            and signal_scores["microtexture_energy"] > 0.55
        ):
            score += 0.06

        if (
            signal_scores["periodic_frequency_pattern"] > 0.55
            and signal_scores["ratio_gradient_shape"] > 0.55
        ):
            score += 0.05

        score = float(np.clip(score, 0.0, 1.0))
        is_screen_replay = score >= self.reject_threshold or (
            signal_scores["microtexture_energy"] > 0.72
            and signal_scores["ratio_gradient_shape"] > 0.52
        ) or (
            signal_scores["screen_border_lines"] > 0.82
            and signal_scores["microtexture_energy"] > 0.55
        )
        confidence = score if is_screen_replay else 1.0 - score

        return ScreenReplayDetectionResult(
            is_screen_replay=is_screen_replay,
            score=round(score, 4),
            confidence=round(confidence, 4),
            reason=self._build_reason(is_screen_replay, signal_scores),
            features=features,
        )

    def _resize(self, image: UInt8Image) -> UInt8Image:
        height, width = image.shape[:2]
        largest_dimension = max(height, width)
        if largest_dimension <= self.max_dimension:
            return image

        scale = self.max_dimension / float(largest_dimension)
        return self._as_uint8_image(
            cv2.resize(
                image,
                (int(width * scale), int(height * scale)),
                interpolation=cv2.INTER_AREA,
            )
        )

    def _fft_metrics(self, gray: Float32Image) -> tuple[float, float, float]:
        height, width = gray.shape
        min_dimension = min(height, width)

        window = np.outer(np.hanning(height), np.hanning(width))
        centered = (gray - float(gray.mean())) * window
        magnitude = np.log1p(np.abs(np.fft.fftshift(np.fft.fft2(centered))))

        yy, xx = np.ogrid[:height, :width]
        cy, cx = height // 2, width // 2
        radius = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2)

        annulus = (radius >= min_dimension * 0.08) & (radius <= min_dimension * 0.45)
        values = magnitude[annulus]
        median_energy = float(np.median(values)) + 1e-6
        periodicity_ratio = float(np.percentile(values, 99.5) / median_energy)

        axis_band = max(2, int(min_dimension * 0.015))
        axis_mask = annulus & (
            (np.abs(yy - cy) <= axis_band) | (np.abs(xx - cx) <= axis_band)
        )
        axis_energy = float(magnitude[axis_mask].mean()) if np.any(axis_mask) else 0.0
        annulus_energy = float(values.mean()) + 1e-6
        axis_energy_ratio = axis_energy / annulus_energy

        high_band = (radius >= min_dimension * 0.24) & (radius <= min_dimension * 0.45)
        mid_band = (radius >= min_dimension * 0.08) & (radius < min_dimension * 0.24)
        high_energy = float(magnitude[high_band].mean())
        mid_energy = float(magnitude[mid_band].mean()) + 1e-6
        high_frequency_ratio = high_energy / mid_energy

        return periodicity_ratio, axis_energy_ratio, high_frequency_ratio

    def _border_line_density(self, gray: Float32Image) -> float:
        height, width = gray.shape
        min_dimension = min(height, width)
        gray_u8 = self._as_uint8_image(np.clip(gray * 255.0, 0, 255).astype(np.uint8))
        edges = self._as_uint8_image(cv2.Canny(gray_u8, 80, 160, L2gradient=True))
        lines = cast(
            Int32Lines | None,
            cv2.HoughLinesP(
                edges,
                rho=1,
                theta=np.pi / 180.0,
                threshold=max(45, int(min_dimension * 0.16)),
                minLineLength=max(40, int(min_dimension * 0.28)),
                maxLineGap=max(6, int(min_dimension * 0.02)),
            ),
        )
        if lines is None:
            return 0.0

        total_length = 0.0
        edge_margin_x = width * 0.15
        edge_margin_y = height * 0.15

        for line in lines[:, 0]:
            x1, y1, x2, y2 = map(int, line)
            angle = abs(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
            horizontal = angle < 10 or angle > 170
            vertical = 80 < angle < 100
            if not (horizontal or vertical):
                continue

            near_border = (
                min(x1, x2) <= edge_margin_x
                or max(x1, x2) >= width - edge_margin_x
                or min(y1, y2) <= edge_margin_y
                or max(y1, y2) >= height - edge_margin_y
            )
            if not near_border:
                continue

            total_length += hypot(x2 - x1, y2 - y1)

        perimeter = (2 * width) + (2 * height) + 1e-6
        return total_length / perimeter

    def _ratio_gradient_shape_ratio(self, gray: Float32Image) -> float:
        base = self._as_float32_image(cv2.GaussianBlur(gray, (0, 0), sigmaX=5.0))
        ratio = gray / (base + 1e-4)
        ratio_min = float(np.min(ratio))
        ratio_max = float(np.max(ratio))
        if ratio_max > ratio_min:
            ratio = (ratio - ratio_min) / (ratio_max - ratio_min)
        else:
            ratio = np.zeros_like(ratio, dtype=np.float32)
        ratio = self._as_float32_image(ratio.astype(np.float32, copy=False))

        grad_x = self._as_float32_image(cv2.Scharr(ratio, cv2.CV_32F, 1, 0))
        grad_y = self._as_float32_image(cv2.Scharr(ratio, cv2.CV_32F, 0, 1))
        magnitude = self._as_float32_image(cv2.magnitude(grad_x, grad_y))
        values = magnitude.reshape(-1)

        floor = np.percentile(values, 10)
        values = values[values > floor]
        if values.size == 0:
            return 0.0

        values = values / (np.percentile(values, 95) + 1e-6)
        return float(values.mean() / (values.std() + 1e-6))

    def _scale(self, value: float, low: float, high: float) -> float:
        if high <= low:
            return 0.0
        return float(np.clip((value - low) / (high - low), 0.0, 1.0))

    def _as_uint8_image(self, value: object) -> UInt8Image:
        return cast(UInt8Image, value)

    def _as_float32_image(self, value: object) -> Float32Image:
        return cast(Float32Image, value)

    def _build_reason(
        self,
        is_screen_replay: bool,
        signal_scores: dict[str, float],
    ) -> str:
        strongest = [
            name.replace("_", " ")
            for name, score in sorted(
                signal_scores.items(),
                key=lambda item: item[1],
                reverse=True,
            )
            if score >= 0.45
        ][:3]

        if is_screen_replay and strongest:
            joined = ", ".join(strongest)
            return f"suspected screen replay due to {joined}"

        return "no strong screen replay artifacts detected"
