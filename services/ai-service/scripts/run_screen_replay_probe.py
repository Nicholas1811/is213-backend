import argparse
import asyncio
import json
from pathlib import Path
import sys

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.vision import ImageLoader, ScreenReplayDetector, ScreenReplayModel


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Inspect screen replay detector scores for one or more images."
    )
    parser.add_argument("sources", nargs="+", help="Image file paths or URLs")
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.72,
        help="Reject threshold used by the detector",
    )
    parser.add_argument(
        "--model-path",
        default=None,
        help="Optional trained model.joblib path",
    )
    parser.add_argument(
        "--model-threshold",
        type=float,
        default=0.5,
        help="Reject threshold used by the trained classifier",
    )
    args = parser.parse_args()

    loader = ImageLoader()
    detector = ScreenReplayDetector(reject_threshold=args.threshold)
    model = (
        ScreenReplayModel.maybe_load(
            args.model_path, reject_threshold=args.model_threshold
        )
        if args.model_path
        else None
    )

    for source in args.sources:
        image = await loader.load(source)
        result = detector.analyze(image)
        model_result = model.predict(result) if model is not None else None
        print(
            json.dumps(
                {
                    "source": source,
                    "is_screen_replay": result.is_screen_replay,
                    "score": result.score,
                    "confidence": result.confidence,
                    "reason": result.reason,
                    "model_probability": (
                        model_result.probability if model_result is not None else None
                    ),
                    "model_detected": (
                        model_result.is_screen_replay
                        if model_result is not None
                        else None
                    ),
                    "features": result.features.as_dict(),
                }
            )
        )


if __name__ == "__main__":
    asyncio.run(main())
