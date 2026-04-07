import argparse
import csv
import json
from pathlib import Path
import sys
from typing import Any

import cv2
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.vision.models import SCREEN_REPLAY_FEATURE_NAMES
from app.vision.screen_replay_detector import ScreenReplayDetector


LABEL_MAP = {
    "real": 0,
    "spoof": 1,
}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train a screen replay classifier from labeled image folders."
    )
    parser.add_argument(
        "--data-dir",
        default=str(SERVICE_ROOT / "training" / "data"),
        help="Dataset root containing train/val/test folders",
    )
    parser.add_argument(
        "--artifacts-dir",
        default=str(SERVICE_ROOT / "training" / "artifacts"),
        help="Directory where model artifacts will be written",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.58,
        help="Threshold used by the feature extractor during training",
    )
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    artifacts_dir = Path(args.artifacts_dir)
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    detector = ScreenReplayDetector(reject_threshold=args.threshold)

    datasets = {
        split: load_split(data_dir / split, detector)
        for split in ("train", "val", "test")
    }

    train_data = datasets["train"]
    if len(train_data["labels"]) == 0:
        raise ValueError(
            "No training images found. Populate services/ai-service/training/data first."
        )

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
    )
    model.fit(train_data["features"], train_data["labels"])

    metrics: dict[str, Any] = {
        "feature_names": feature_names(),
        "dataset_sizes": {
            split: int(len(values["labels"])) for split, values in datasets.items()
        },
        "threshold": args.threshold,
    }

    all_predictions: list[dict[str, Any]] = []
    for split, values in datasets.items():
        if len(values["labels"]) == 0:
            metrics[split] = {"warning": "split is empty"}
            continue

        probabilities = model.predict_proba(values["features"])[:, 1]
        predictions = (probabilities >= 0.5).astype(int)

        metrics[split] = build_metrics(values["labels"], predictions)

        for path, label, probability, prediction in zip(
            values["paths"],
            values["labels"],
            probabilities,
            predictions,
            strict=True,
        ):
            all_predictions.append(
                {
                    "split": split,
                    "path": path,
                    "label": int(label),
                    "prediction": int(prediction),
                    "spoof_probability": round(float(probability), 6),
                }
            )

    feature_importance = {
        name: round(float(score), 6)
        for name, score in zip(feature_names(), model.feature_importances_, strict=True)
    }

    joblib.dump(
        {
            "model": model,
            "feature_names": list(SCREEN_REPLAY_FEATURE_NAMES),
        },
        artifacts_dir / "model.joblib",
    )
    (artifacts_dir / "metrics.json").write_text(
        json.dumps(metrics, indent=2), encoding="utf-8"
    )
    (artifacts_dir / "feature_importance.json").write_text(
        json.dumps(feature_importance, indent=2), encoding="utf-8"
    )
    write_predictions_csv(artifacts_dir / "predictions.csv", all_predictions)

    print(json.dumps(metrics, indent=2))
    print(json.dumps({"feature_importance": feature_importance}, indent=2))


def load_split(split_dir: Path, detector: ScreenReplayDetector) -> dict[str, Any]:
    features: list[list[float]] = []
    labels: list[int] = []
    paths: list[str] = []

    for label_name, label_value in LABEL_MAP.items():
        class_dir = split_dir / label_name
        if not class_dir.exists():
            continue

        for path in sorted(class_dir.rglob("*")):
            if not path.is_file() or path.suffix.lower() not in {
                ".jpg",
                ".jpeg",
                ".png",
                ".webp",
            }:
                continue

            image = cv2.imread(str(path), cv2.IMREAD_COLOR)
            if image is None:
                continue

            result = detector.analyze(image)
            features.append(result.features.as_vector())
            labels.append(label_value)
            paths.append(str(path))

    return {
        "features": np.asarray(features, dtype=np.float32),
        "labels": np.asarray(labels, dtype=np.int32),
        "paths": paths,
    }


def feature_names() -> list[str]:
    return list(SCREEN_REPLAY_FEATURE_NAMES)


def build_metrics(labels: np.ndarray, predictions: np.ndarray) -> dict[str, Any]:
    report = classification_report(
        labels,
        predictions,
        labels=[0, 1],
        target_names=["real", "spoof"],
        output_dict=True,
        zero_division=0,
    )
    matrix = confusion_matrix(labels, predictions, labels=[0, 1]).tolist()
    return {
        "confusion_matrix": matrix,
        "report": report,
    }


def write_predictions_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=["split", "path", "label", "prediction", "spoof_probability"],
        )
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    main()
