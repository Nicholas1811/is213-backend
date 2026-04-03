from dataclasses import dataclass


@dataclass(slots=True)
class ScreenReplayFeatures:
    fft_periodicity_ratio: float
    fft_axis_energy_ratio: float
    border_line_density: float
    high_frequency_energy_ratio: float
    ratio_gradient_shape_ratio: float

    def as_dict(self) -> dict[str, float]:
        return {
            "fft_periodicity_ratio": round(self.fft_periodicity_ratio, 4),
            "fft_axis_energy_ratio": round(self.fft_axis_energy_ratio, 4),
            "border_line_density": round(self.border_line_density, 4),
            "high_frequency_energy_ratio": round(self.high_frequency_energy_ratio, 4),
            "ratio_gradient_shape_ratio": round(
                self.ratio_gradient_shape_ratio, 4
            ),
        }


@dataclass(slots=True)
class ScreenReplayDetectionResult:
    is_screen_replay: bool
    score: float
    confidence: float
    reason: str
    features: ScreenReplayFeatures
