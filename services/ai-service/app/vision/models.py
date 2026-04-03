from dataclasses import dataclass

SCREEN_REPLAY_FEATURE_NAMES = (
    "fft_periodicity_ratio",
    "fft_axis_energy_ratio",
    "border_line_density",
    "internal_display_region_score",
    "high_frequency_energy_ratio",
    "ratio_gradient_shape_ratio",
)


@dataclass(slots=True)
class ScreenReplayFeatures:
    fft_periodicity_ratio: float
    fft_axis_energy_ratio: float
    border_line_density: float
    internal_display_region_score: float
    high_frequency_energy_ratio: float
    ratio_gradient_shape_ratio: float

    def as_dict(self) -> dict[str, float]:
        return {
            "fft_periodicity_ratio": round(self.fft_periodicity_ratio, 4),
            "fft_axis_energy_ratio": round(self.fft_axis_energy_ratio, 4),
            "border_line_density": round(self.border_line_density, 4),
            "internal_display_region_score": round(
                self.internal_display_region_score, 4
            ),
            "high_frequency_energy_ratio": round(self.high_frequency_energy_ratio, 4),
            "ratio_gradient_shape_ratio": round(
                self.ratio_gradient_shape_ratio, 4
            ),
        }

    def as_vector(self) -> list[float]:
        return [
            self.fft_periodicity_ratio,
            self.fft_axis_energy_ratio,
            self.border_line_density,
            self.internal_display_region_score,
            self.high_frequency_energy_ratio,
            self.ratio_gradient_shape_ratio,
        ]


@dataclass(slots=True)
class ScreenReplayDetectionResult:
    is_screen_replay: bool
    score: float
    confidence: float
    reason: str
    features: ScreenReplayFeatures


@dataclass(slots=True)
class ScreenReplayModelResult:
    is_screen_replay: bool
    probability: float
    threshold: float
