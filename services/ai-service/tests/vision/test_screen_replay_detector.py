import cv2
import numpy as np

from app.vision.screen_replay_detector import ScreenReplayDetector


def _make_natural_food_scene(seed: int = 7) -> np.ndarray:
    rng = np.random.default_rng(seed)
    canvas = np.zeros((512, 512, 3), dtype=np.uint8)

    x_gradient = np.tile(np.linspace(85, 120, 512, dtype=np.uint8), (512, 1))
    y_gradient = np.tile(np.linspace(95, 145, 512, dtype=np.uint8)[:, None], (1, 512))
    canvas[..., 1] = x_gradient
    canvas[..., 2] = y_gradient
    canvas[..., 0] = 70

    cv2.circle(canvas, (256, 256), 140, (225, 228, 230), thickness=-1)
    cv2.circle(canvas, (256, 256), 115, (240, 243, 245), thickness=-1)

    food_colors = [
        (60, 85, 185),
        (75, 135, 215),
        (55, 150, 110),
        (40, 90, 235),
    ]
    for index, color in enumerate(food_colors):
        center = (190 + (index * 45), 205 + (index % 2) * 55)
        axes = (55 - (index * 6), 38 + (index * 4))
        angle = 18 + (index * 22)
        cv2.ellipse(canvas, center, axes, angle, 0, 360, color, thickness=-1)

    noise = rng.normal(0, 5, canvas.shape).astype(np.int16)
    canvas = np.clip(canvas.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    return cv2.GaussianBlur(canvas, (0, 0), sigmaX=1.3)


def _make_screen_replay(seed: int = 7, cropped: bool = False) -> np.ndarray:
    image = _make_natural_food_scene(seed).astype(np.float32)
    height, width = image.shape[:2]
    yy, xx = np.mgrid[:height, :width]

    stripes = (
        16.0 * np.sin((2.0 * np.pi * xx) / 9.0)
        + 14.0 * np.sin((2.0 * np.pi * yy) / 11.0)
    )
    image += stripes[..., None]

    if not cropped:
        cv2.rectangle(
            image,
            (22, 18),
            (width - 22, height - 18),
            (20, 20, 20),
            thickness=12,
        )

    glare = np.zeros_like(image)
    points = np.array(
        [
            (int(width * 0.08), int(height * 0.25)),
            (int(width * 0.25), int(height * 0.16)),
            (int(width * 0.92), int(height * 0.62)),
            (int(width * 0.75), int(height * 0.71)),
        ]
    )
    cv2.fillConvexPoly(glare, points, color=(60, 60, 60))
    image = cv2.addWeighted(image, 1.0, glare, 0.75, 0)

    return np.clip(image, 0, 255).astype(np.uint8)


def _make_internal_phone_replay(seed: int = 19) -> np.ndarray:
    base = np.full((512, 512, 3), (108, 118, 126), dtype=np.uint8)
    base = cv2.GaussianBlur(base, (0, 0), sigmaX=2.0)
    cv2.rectangle(base, (40, 60), (472, 452), (122, 132, 140), thickness=-1)

    phone_shell = np.full((360, 220, 3), 24, dtype=np.uint8)
    screen = cv2.resize(_make_natural_food_scene(seed), (180, 320)).astype(np.float32)
    yy, xx = np.mgrid[:320, :180]
    screen += (
        14.0 * np.sin((2.0 * np.pi * xx) / 8.0)
        + 12.0 * np.sin((2.0 * np.pi * yy) / 10.0)
    )[..., None]
    screen = np.clip(screen, 0, 255).astype(np.uint8)
    phone_shell[20:340, 20:200] = screen
    cv2.circle(phone_shell, (110, 347), 7, (55, 55, 55), thickness=-1)

    glare = np.zeros_like(phone_shell)
    cv2.fillConvexPoly(
        glare,
        np.array([(20, 70), (75, 35), (205, 230), (150, 260)]),
        color=(70, 70, 70),
    )
    phone_shell = cv2.addWeighted(phone_shell, 1.0, glare, 0.45, 0)

    transform = cv2.getRotationMatrix2D((110, 180), -8.0, 1.0)
    rotated = cv2.warpAffine(
        phone_shell,
        transform,
        (260, 400),
        flags=cv2.INTER_LINEAR,
        borderValue=(0, 0, 0),
    )

    mask = cv2.cvtColor(rotated, cv2.COLOR_BGR2GRAY) > 0
    roi = base[58:458, 126:386]
    roi[mask] = rotated[mask]
    base[58:458, 126:386] = roi
    return cv2.GaussianBlur(base, (0, 0), sigmaX=0.8)


def test_detector_scores_screen_replay_above_natural_scene() -> None:
    detector = ScreenReplayDetector(reject_threshold=0.62)

    natural = detector.analyze(_make_natural_food_scene())
    screen = detector.analyze(_make_screen_replay())

    assert not natural.is_screen_replay
    assert screen.is_screen_replay
    assert screen.score > natural.score + 0.2
    assert "screen" in screen.reason


def test_detector_handles_cropped_screen_replay() -> None:
    detector = ScreenReplayDetector(reject_threshold=0.58)

    natural = detector.analyze(_make_natural_food_scene(seed=11))
    cropped_screen = detector.analyze(_make_screen_replay(seed=11, cropped=True))

    assert cropped_screen.is_screen_replay
    assert cropped_screen.score > natural.score + 0.12
    assert cropped_screen.features.high_frequency_energy_ratio > (
        natural.features.high_frequency_energy_ratio
    )
    assert cropped_screen.features.ratio_gradient_shape_ratio > (
        natural.features.ratio_gradient_shape_ratio
    )


def test_detector_flags_internal_phone_screen_replay() -> None:
    detector = ScreenReplayDetector(reject_threshold=0.58)

    natural = detector.analyze(_make_natural_food_scene(seed=29))
    internal_phone = detector.analyze(_make_internal_phone_replay(seed=29))

    assert internal_phone.is_screen_replay
    assert internal_phone.score > natural.score + 0.2
    assert internal_phone.features.internal_display_region_score > 0.2
