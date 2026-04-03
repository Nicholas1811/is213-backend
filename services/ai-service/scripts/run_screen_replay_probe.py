import argparse
import asyncio
import json

from app.vision import ImageLoader, ScreenReplayDetector


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
    args = parser.parse_args()

    loader = ImageLoader()
    detector = ScreenReplayDetector(reject_threshold=args.threshold)

    for source in args.sources:
        image = await loader.load(source)
        result = detector.analyze(image)
        print(
            json.dumps(
                {
                    "source": source,
                    "is_screen_replay": result.is_screen_replay,
                    "score": result.score,
                    "confidence": result.confidence,
                    "reason": result.reason,
                    "features": result.features.as_dict(),
                }
            )
        )


if __name__ == "__main__":
    asyncio.run(main())
