# Screen Replay Training

This folder is the starter workspace for training a local `real scene` vs `screen replay` classifier.

## What We Are Training

We are starting with a classical machine learning model, not a deep CNN yet.

The training flow is:

1. Put labeled images into `train`, `val`, and `test` folders.
2. Extract the replay-related features we already compute in the service.
3. Train a small classifier on those features.
4. Review metrics before we think about deploying it.

This is the safest beginner path because it helps us understand whether our features are actually useful before we spend time on a larger neural network.

## Folder Layout

Create the dataset like this:

```text
services/ai-service/training/data/
  train/
    real/
    spoof/
  val/
    real/
    spoof/
  test/
    real/
    spoof/
```

Label meaning:

- `real`: a genuine food scene photo
- `spoof`: food shown on a phone, tablet, laptop, monitor, or printed photo

## Recommended Data Collection Rules

- Keep both easy and hard examples.
- Include close crops where the bezel is barely visible.
- Include different lighting, blur, glare, and camera types.
- Include both full-device shots and partial-device shots.
- Avoid putting near-duplicate shots in different splits.

Use this split rule:

- `train`: about 70%
- `val`: about 15%
- `test`: about 15%

Important:

- Split by capture session, not randomly by single file, when possible.
- Otherwise the model may memorize the same table, plate, or lighting setup.

## Training Command

Run this from the repo root:

```bash
services/ai-service/.venv/bin/python services/ai-service/scripts/train_screen_replay_model.py
```

Optional flags:

```bash
services/ai-service/.venv/bin/python services/ai-service/scripts/train_screen_replay_model.py \
  --data-dir services/ai-service/training/data \
  --artifacts-dir services/ai-service/training/artifacts \
  --threshold 0.58
```

## Outputs

The script writes:

- `model.joblib`: trained classifier
- `metrics.json`: train/val/test metrics
- `feature_importance.json`: which features mattered most
- `predictions.csv`: per-image scores for debugging errors

The training artifacts stay local by default. If you want to ship a ready-made runtime model for teammates, copy the current `model.joblib` into `services/ai-service/models/screen_replay_model.joblib` after retraining.

If the feature set changes, retrain before starting the service again so `model.joblib` stays compatible with the runtime loader.

## How To Read The Metrics

Focus on these first:

- `precision`: when the model says spoof, how often it is right
- `recall`: how many spoof images it catches
- `f1`: balance between precision and recall

For your use case, `spoof recall` matters a lot because missing a replay attack is costly.

## Suggested First Goal

Aim for:

- strong spoof recall on the validation split
- low enough false positives that real users are not constantly rejected

If the metrics are poor, that usually means one of these:

- not enough hard examples
- features are too weak
- labels are noisy

## After The First Model

If this baseline works reasonably well, the next step is to:

1. review false positives and false negatives
2. improve the feature extractor
3. only then consider a CNN or vision model
