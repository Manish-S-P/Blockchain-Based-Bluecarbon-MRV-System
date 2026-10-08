"""Trains and evaluates the ecosystem classifier on the dataset from build_dataset.py.

Evaluation is leave-one-region-out: the model is tested on each coastal region after
being trained only on the *other* regions. This measures how well it works on a place it
has never seen, which is the situation for every new farmer plot. (Random splits would
put neighbouring, near-identical pixels in both train and test and inflate the score.)

Usage (from ml-service/):
    .venv/bin/python -m training.train_classifier
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.classifier import CONFIDENCE_THRESHOLD, MODEL_PATH, METADATA_PATH  # noqa: E402
from app.earth_engine import FEATURE_NAMES  # noqa: E402

CLASSES = ["mangrove", "saltmarsh", "seagrass", "other"]

# Reported only: classes whose leave-one-region-out F1 reaches this are reliable in new regions.
TRUSTED_F1 = 0.8


def make_model() -> RandomForestClassifier:
    return RandomForestClassifier(
        n_estimators=300,
        min_samples_leaf=2,
        class_weight="balanced_subsample",
        n_jobs=-1,
        random_state=42,
    )


def leave_one_region_out(data: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, dict]:
    """Predicts every sample with a model that never saw its region."""
    predictions = np.empty(len(data), dtype=object)
    confidences = np.zeros(len(data))
    per_region = {}

    for region in sorted(data["region"].unique()):
        test = (data["region"] == region).to_numpy()
        model = make_model().fit(data.loc[~test, FEATURE_NAMES], data.loc[~test, "class_name"])
        proba = model.predict_proba(data.loc[test, FEATURE_NAMES])
        predictions[test] = model.classes_[proba.argmax(axis=1)]
        confidences[test] = proba.max(axis=1)
        per_region[region] = {
            "samples": int(test.sum()),
            "accuracy": round(float(accuracy_score(data.loc[test, "class_name"], predictions[test])), 4),
        }
    return predictions, confidences, per_region


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", default=str(Path(__file__).resolve().parent / "data" / "ecosystem_samples.csv"))
    args = parser.parse_args()

    data = pd.read_csv(args.data).dropna(subset=FEATURE_NAMES).reset_index(drop=True)
    print(f"Loaded {len(data)} samples from {data['region'].nunique()} regions")
    print(data.groupby(["region", "class_name"]).size().unstack(fill_value=0), "\n")

    truth = data["class_name"].to_numpy()
    predictions, confidences, per_region = leave_one_region_out(data)

    report_text = classification_report(truth, predictions, labels=CLASSES, digits=3, zero_division=0)
    report_dict = classification_report(truth, predictions, labels=CLASSES, output_dict=True, zero_division=0)
    matrix = confusion_matrix(truth, predictions, labels=CLASSES)

    trusted = [name for name in CLASSES if report_dict[name]["f1-score"] >= TRUSTED_F1]
    confident = confidences >= CONFIDENCE_THRESHOLD
    confident_accuracy = float(accuracy_score(truth[confident], predictions[confident])) if confident.any() else 0.0

    lines = [
        "ECOSYSTEM CLASSIFIER - LEAVE-ONE-REGION-OUT EVALUATION",
        "=" * 60,
        f"Trained at        : {datetime.now(timezone.utc).isoformat(timespec='seconds')}",
        f"Samples / regions : {len(data)} / {data['region'].nunique()}",
        f"Features          : {', '.join(FEATURE_NAMES)}",
        "",
        "Per-pixel results (each region predicted by a model that never saw it):",
        report_text,
        "Confusion matrix (rows = true, columns = predicted):",
        "            " + " ".join(f"{name:>10}" for name in CLASSES),
        *[f"{name:>10}  " + " ".join(f"{count:>10}" for count in row) for name, row in zip(CLASSES, matrix)],
        "",
        f"Confidence >= {CONFIDENCE_THRESHOLD}: {confident.mean():.1%} of pixels, "
        f"accuracy on those {confident_accuracy:.3f}",
        f"Below threshold (a matching claim is still rejected): {(~confident).mean():.1%}",
        "",
        f"Reliable in new regions (held-out F1 >= {TRUSTED_F1}): {', '.join(trusted) or 'none'}",
        "",
        "Accuracy per held-out region:",
        *[f"  {region:20} {stats['accuracy']:.3f}  ({stats['samples']} samples)" for region, stats in per_region.items()],
    ]
    report = "\n".join(lines)
    print(report)

    final_model = make_model().fit(data[FEATURE_NAMES], truth)
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(final_model, MODEL_PATH, compress=3)
    METADATA_PATH.write_text(json.dumps({
        "trainedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sklearnVersion": sklearn.__version__,
        "features": FEATURE_NAMES,
        "classes": list(final_model.classes_),
        "samples": int(len(data)),
        "samplesPerClass": data["class_name"].value_counts().to_dict(),
        "regions": sorted(data["region"].unique().tolist()),
        "trustedClasses": trusted,
        "evaluation": {
            "method": "leave-one-region-out",
            "accuracy": round(float(report_dict["accuracy"]), 4),
            "macroF1": round(float(report_dict["macro avg"]["f1-score"]), 4),
            "perClassF1": {name: round(float(report_dict[name]["f1-score"]), 4) for name in CLASSES},
            "perRegionAccuracy": {region: stats["accuracy"] for region, stats in per_region.items()},
            "confidenceThreshold": CONFIDENCE_THRESHOLD,
            "confidentShare": round(float(confident.mean()), 4),
            "confidentAccuracy": round(confident_accuracy, 4),
        },
    }, indent=2), encoding="utf-8")
    (MODEL_PATH.parent / "ecosystem_classifier_report.txt").write_text(report + "\n", encoding="utf-8")
    print(f"\nSaved model to {MODEL_PATH} and metadata to {METADATA_PATH}")


if __name__ == "__main__":
    main()
