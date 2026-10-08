"""End-to-end check of the live classification path on regions NOT used for training.

For each held-out region it takes labelled points (same label maps as build_dataset.py),
draws a small square plot around each one, and classifies the plot exactly like the API
does: fetch_plot_pixel_features -> EcosystemClassifier.classify. The farmer's claim is set
to the true label, so `accept` = correct and `reject` = a genuine plot wrongly turned away.

Usage (from ml-service/, after train_classifier.py):
    GEE_PROJECT=<project> .venv/bin/python -m training.validate_plots
"""

import argparse
import math
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import ee

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.classifier import EcosystemClassifier  # noqa: E402
from app.earth_engine import init_earth_engine  # noqa: E402
from app.gee_service import fetch_plot_pixel_features  # noqa: E402
from training.build_dataset import SAMPLE_CLASSES, build_label_image  # noqa: E402

HELD_OUT_REGIONS = {
    "mumbai_thane_creek": [72.85, 18.95, 73.05, 19.25],
    "goa_mandovi": [73.75, 15.4, 73.95, 15.6],
    "kochi_backwaters": [76.2, 9.9, 76.35, 10.1],
    "puttalam_sri_lanka": [79.7, 7.9, 79.9, 8.4],
    "krishna_delta": [80.85, 15.6, 81.2, 15.95],
}

# 2020 labels, classified with the 12 months ending on this date (same year as the labels).
AS_OF = date(2020, 12, 31)


def square_plot(lon: float, lat: float, half_side_m: float) -> list[list[float]]:
    """Square polygon around a point, as [lat, lon] pairs like the frontend sends."""
    dlat = half_side_m / 111_320
    dlon = half_side_m / (111_320 * math.cos(math.radians(lat)))
    return [[lat - dlat, lon - dlon], [lat - dlat, lon + dlon], [lat + dlat, lon + dlon], [lat + dlat, lon - dlon]]


def labelled_points(bbox: list[float], per_class: int, seed: int) -> list[tuple[str, float, float]]:
    region = ee.Geometry.Rectangle(bbox)
    codes = list(SAMPLE_CLASSES)
    samples = build_label_image().stratifiedSample(
        numPoints=per_class, classBand="label", region=region, scale=30,
        classValues=codes, classPoints=[per_class] * len(codes), seed=seed, geometries=True, tileScale=16,
    ).getInfo()["features"]
    return [
        (SAMPLE_CLASSES[int(f["properties"]["label"])], *f["geometry"]["coordinates"])
        for f in samples
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--per-class", type=int, default=4, help="Plots per sampling class per region")
    parser.add_argument("--plot-half-side-m", type=float, default=60.0)
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()

    if not init_earth_engine():
        sys.exit("Earth Engine credentials not found.")
    classifier = EcosystemClassifier()
    if not classifier.available:
        sys.exit("No trained classifier; run training.train_classifier first.")

    outcomes: dict[str, Counter] = defaultdict(Counter)
    for region, bbox in HELD_OUT_REGIONS.items():
        points = labelled_points(bbox, args.per_class, args.seed)
        print(f"\n{region}: {len(points)} plots")
        for true_class, lon, lat in points:
            pixels = fetch_plot_pixel_features(square_plot(lon, lat, args.plot_half_side_m), AS_OF)
            result = classifier.classify(pixels or [], true_class)
            outcomes[true_class][result.decision] += 1
            print(f"  {true_class:9} -> {result.identified_ecosystem:9} conf={result.confidence:.2f} "
                  f"{result.decision:6} ({result.pixel_count} px)  [{lat:.4f}, {lon:.4f}]", flush=True)

    print("\nSummary (claim = true label): accept = correct, reject = wrongly rejected")
    for true_class, counts in sorted(outcomes.items()):
        total = sum(counts.values())
        print(f"  {true_class:9} n={total:3}  accept={counts['accept']:3}  reject={counts['reject']:3}")


if __name__ == "__main__":
    main()
