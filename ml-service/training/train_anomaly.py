"""Learns the anomaly detector's "normal change" from real data, then tests it on real damage.

1. Calibration: healthy pixels of each ecosystem from the classifier dataset
   (training/data/ecosystem_samples.csv). For every quarter of 2021 the signals are compared
   with the same quarter of 2020. From these year-on-year changes we learn, per ecosystem and
   signal, the typical change (median) and spread (scaled MAD, robust to the few plots that
   really were damaged). The threshold is set so that only TARGET_FALSE_BLOCK of healthy
   plots would be flagged in at least one quarter of a year (and so blocked from minting).

2. Evaluation, on places NOT used for calibration:
   - real damage: mangrove pixels that Global Forest Watch (Hansen) records as lost in 2021,
     in Myanmar and Indonesia (India has almost no recorded mangrove loss that year);
   - healthy plots: mangroves in the same countries with no recorded loss, and mangrove /
     saltmarsh / seagrass pixels in held-out Indian and Sri Lankan regions.
   A plot-year counts as flagged if any 2021 quarter is an anomaly.

Usage (from ml-service/):
    GEE_PROJECT=<project> .venv/bin/python -m training.train_anomaly
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import ee
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.anomaly import COMBINE_METHODS, PARAMS_PATH, combine_scores, signal_scores  # noqa: E402
from app.earth_engine import MONITOR_SIGNALS, build_monitoring_image, init_earth_engine  # noqa: E402
from training.build_dataset import REGIONS, build_label_image  # noqa: E402
from training.validate_plots import HELD_OUT_REGIONS  # noqa: E402

TARGET_FALSE_BLOCK = 0.05
# How per-signal scores become one quarter score, per ecosystem. Chosen by comparing both
# options in this script's evaluation (note: on the same data the report shows):
# mangrove "max" catches more real loss; for saltmarsh "mean" cuts false blocks from ~40% to ~14%.
COMBINE = {"mangrove": "max", "saltmarsh": "mean", "seagrass": "mean"}
ECOSYSTEMS = list(MONITOR_SIGNALS)
QUARTERS = [("01-01", "04-01"), ("04-01", "07-01"), ("07-01", "10-01"), ("10-01", "01-01")]
MONITOR_BANDS = ["NDVI", "NDMI", "B2", "B3", "VH", "S2_CLEAR", "S1_COUNT"]
# Masked (no-data) values are sent as this so a cloudy quarter doesn't drop the whole point.
NO_DATA = -9999

FOREST_CHANGE = "UMD/hansen/global_forest_change_2025_v1_13"
GWL_2020 = "projects/sat-io/open-datasets/GWL_FCS30/GWL_FCS30_2020"
LOSS_REGIONS = {
    "myanmar_ayeyarwady": [94.2, 15.6, 95.4, 16.4],
    "myanmar_rakhine": [92.8, 19.6, 93.8, 20.6],
    "indonesia_sumatra_east": [103.4, -1.2, 104.4, -0.2],
    "kalimantan_mahakam": [117.2, -1.0, 117.7, -0.4],
}
LOSS_YEAR = 21  # Hansen lossyear code for 2021
SAMPLES_PATH = Path(__file__).resolve().parent / "data" / "anomaly_samples.json"


def quarter_window(year: int, index: int) -> tuple[str, str]:
    start, end = QUARTERS[index]
    end_year = year + 1 if index == 3 else year
    return f"{year}-{start}", f"{end_year}-{end}"


def change_stack(region: ee.Geometry, year: int = 2021) -> ee.Image:
    """For each quarter of `year`: monitoring bands now (q{i}_cur_*) and a year earlier (q{i}_prev_*)."""
    images = []
    for index in range(4):
        for tag, y in (("cur", year), ("prev", year - 1)):
            start, end = quarter_window(y, index)
            image = build_monitoring_image(start, end, region)
            images.append(image.unmask(NO_DATA).rename([f"q{index}_{tag}_{band}" for band in MONITOR_BANDS]))
    return ee.Image.cat(images)


def sample_changes(points: list[dict], region_bbox: list[float]) -> list[dict]:
    """Samples the quarterly change stack at the given points (dicts with lon, lat + metadata)."""
    region = ee.Geometry.Rectangle(region_bbox)
    collection = ee.FeatureCollection([
        ee.Feature(ee.Geometry.Point([p["longitude"], p["latitude"]]), {"idx": i})
        for i, p in enumerate(points)
    ])
    sampled = change_stack(region).sampleRegions(collection=collection, scale=30, tileScale=16)
    rows = []
    for feature in sampled.getInfo()["features"]:
        props = feature["properties"]
        row = dict(points[int(props["idx"])])
        for index in range(4):
            for tag in ("cur", "prev"):
                values = {band: props.get(f"q{index}_{tag}_{band}") for band in MONITOR_BANDS}
                row[f"q{index}_{tag}"] = {band: None if v is None or v == NO_DATA else v for band, v in values.items()}
        rows.append(row)
    return rows


def quarter_scores(row: dict, ecosystem: str, stats: dict, combine: str) -> list[float]:
    """Combined damage score for each quarter that had usable data."""
    scores = []
    for index in range(4):
        per_signal = signal_scores(ecosystem, row[f"q{index}_cur"], row[f"q{index}_prev"], stats)
        if per_signal:
            scores.append(combine_scores(per_signal, combine))
    return scores


def raw_changes(rows: list[dict], ecosystem: str) -> dict[str, list[float]]:
    """Year-on-year change of each signal, using the same data-quality rule as the detector."""
    unit_stats = {signal: {"median": 0.0, "scale": 1.0} for signal in MONITOR_SIGNALS[ecosystem]}
    changes = {signal: [] for signal in MONITOR_SIGNALS[ecosystem]}
    for row in rows:
        for index in range(4):
            scores = signal_scores(ecosystem, row[f"q{index}_cur"], row[f"q{index}_prev"], unit_stats)
            for signal, value in scores.items():
                # With median 0 and scale 1, the score is direction * change.
                changes[signal].append(value * MONITOR_SIGNALS[ecosystem][signal])
    return changes


def flag_rate(rows: list[dict], ecosystem: str, stats: dict, threshold: float, combine: str) -> tuple[float, int]:
    yearly = [max(scores) for row in rows if (scores := quarter_scores(row, ecosystem, stats, combine))]
    if not yearly:
        return float("nan"), 0
    return float(np.mean(np.array(yearly) > threshold)), len(yearly)


def calibration_points(per_class_per_region: int, seed: int) -> dict[str, list[dict]]:
    data = pd.read_csv(Path(__file__).resolve().parent / "data" / "ecosystem_samples.csv")
    data = data[data["class_name"].isin(ECOSYSTEMS)]
    grouped: dict[str, list[dict]] = {}
    for (region, _cls), group in data.groupby(["region", "class_name"]):
        picked = group.sample(min(len(group), per_class_per_region), random_state=seed)
        grouped.setdefault(region, []).extend(picked[["longitude", "latitude", "class_name"]].to_dict("records"))
    return grouped


def eval_points(bbox: list[float], label_image: ee.Image, codes: dict[int, str], per_class: int, seed: int) -> list[dict]:
    codes_list = list(codes)
    # stratifiedSample also samples unlisted classes, so mask everything else out first.
    wanted = label_image.remap(codes_list, [1] * len(codes_list), 0)
    samples = label_image.updateMask(wanted).stratifiedSample(
        numPoints=per_class, classBand="label", region=ee.Geometry.Rectangle(bbox), scale=30,
        classValues=codes_list, classPoints=[per_class] * len(codes_list), seed=seed, geometries=True, tileScale=16,
    ).getInfo()["features"]
    return [
        {"longitude": f["geometry"]["coordinates"][0], "latitude": f["geometry"]["coordinates"][1],
         "class_name": codes[int(f["properties"]["label"])]}
        for f in samples
    ]


def loss_label_image() -> ee.Image:
    """1 = mangrove in 2020 lost in 2021, 2 = mangrove never recorded as lost (majority 3x3)."""
    mangrove = ee.Image(GWL_2020).select("b1").eq(185)
    # No-loss pixels are stored as no-data rather than 0.
    loss_year = ee.Image(FOREST_CHANGE).select("lossyear").unmask(0)
    lost = mangrove.And(loss_year.eq(LOSS_YEAR))
    intact = mangrove.And(loss_year.eq(0))
    majority = lambda m: m.reduceNeighborhood(ee.Reducer.mean(), ee.Kernel.square(1)).gte(0.6)
    label = ee.Image(0).where(majority(intact), 2).where(majority(lost), 1)
    return label.updateMask(label.gt(0)).rename("label").toInt()


def collect_samples(args) -> dict[str, list[dict]]:
    """Samples quarterly changes at all calibration and evaluation points (slow: Earth Engine)."""
    calibration_rows: list[dict] = []
    for region, points in calibration_points(args.calibration_per_class, args.seed).items():
        rows = sample_changes(points, REGIONS[region])
        calibration_rows.extend(rows)
        print(f"calibration {region:20} {len(rows)} points", flush=True)

    loss_rows, intact_rows = [], []
    for region, bbox in LOSS_REGIONS.items():
        points = eval_points(bbox, loss_label_image(), {1: "lost", 2: "intact"}, args.eval_per_class, args.seed)
        rows = sample_changes(points, bbox)
        lost = [row for row in rows if row["class_name"] == "lost"]
        loss_rows += lost
        intact_rows += [row for row in rows if row["class_name"] == "intact"]
        print(f"evaluation  {region:20} {len(lost)} lost, {len(rows) - len(lost)} intact", flush=True)

    held_out_rows = []
    codes = {1: "mangrove", 2: "saltmarsh", 3: "seagrass"}
    for region, bbox in HELD_OUT_REGIONS.items():
        rows = sample_changes(eval_points(bbox, build_label_image(), codes, args.eval_per_class // 2, args.seed), bbox)
        held_out_rows.extend(rows)
        print(f"evaluation  {region:20} {len(rows)} points", flush=True)

    return {"calibration": calibration_rows, "lost": loss_rows, "intact": intact_rows, "heldOut": held_out_rows}


def learn_signal_stats(rows: list[dict], ecosystem: str) -> dict:
    stats = {}
    for signal, values in raw_changes(rows, ecosystem).items():
        values = np.array(values)
        median = float(np.median(values))
        scale = float(1.4826 * np.median(np.abs(values - median))) or 1e-6
        stats[signal] = {"median": round(median, 5), "scale": round(scale, 5), "observations": int(len(values))}
    return stats


def evaluate(samples: dict, params: dict) -> dict:
    def rate(rows, ecosystem):
        p = params[ecosystem]
        value, n = flag_rate(rows, ecosystem, p["signals"], p["threshold"], p["combine"])
        return {"rate": None if n == 0 else round(value, 3), "plots": n}

    result = {
        "mangrove_loss_2021_detected": rate(samples["lost"], "mangrove"),
        "mangrove_intact_false_block_sea": rate(samples["intact"], "mangrove"),
    }
    for ecosystem in ECOSYSTEMS:
        rows = [row for row in samples["heldOut"] if row["class_name"] == ecosystem]
        result[f"{ecosystem}_healthy_false_block_heldout"] = rate(rows, ecosystem)
    return result


def calibrate(samples: dict, combine: dict[str, str]) -> dict:
    params = {}
    for ecosystem in ECOSYSTEMS:
        rows = [row for row in samples["calibration"] if row["class_name"] == ecosystem]
        stats = learn_signal_stats(rows, ecosystem)
        method = combine[ecosystem]
        yearly = [max(scores) for row in rows if (scores := quarter_scores(row, ecosystem, stats, method))]
        params[ecosystem] = {
            "signals": stats,
            "combine": method,
            "threshold": round(float(np.quantile(yearly, 1 - TARGET_FALSE_BLOCK)), 3),
            "calibrationPlots": len(yearly),
        }
    return params


def fmt(result: dict) -> str:
    return "n/a" if result["rate"] is None else f"{result['rate']:.1%} of {result['plots']}"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--calibration-per-class", type=int, default=120, help="Points per class per region")
    parser.add_argument("--eval-per-class", type=int, default=100)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--reuse-samples", action="store_true",
                        help=f"Reuse training/data/{SAMPLES_PATH.name} instead of sampling Earth Engine again")
    args = parser.parse_args()

    if args.reuse_samples:
        samples = json.loads(SAMPLES_PATH.read_text(encoding="utf-8"))
    else:
        if not init_earth_engine():
            sys.exit("Earth Engine credentials not found.")
        samples = collect_samples(args)
        SAMPLES_PATH.write_text(json.dumps(samples), encoding="utf-8")

    results = {}
    for combine in COMBINE_METHODS:
        params = calibrate(samples, {ecosystem: combine for ecosystem in ECOSYSTEMS})
        results[combine] = (params, evaluate(samples, params))
    params = calibrate(samples, COMBINE)
    evaluation = evaluate(samples, params)
    results["used"] = (params, evaluation)
    columns = [*COMBINE_METHODS, "used"]

    lines = [
        "ANOMALY DETECTOR - CALIBRATION AND EVALUATION",
        "=" * 60,
        f"Trained at: {datetime.now(timezone.utc).isoformat(timespec='seconds')}",
        "Method: same-quarter year-on-year change, robust z-score per signal, combined per ecosystem "
        f"({', '.join(f'{e}: {m}' for e, m in COMBINE.items())});",
        f"threshold = {1 - TARGET_FALSE_BLOCK:.0%} quantile of healthy calibration plots' worst quarter",
        "",
        "Learned parameters (typical change / spread per signal, threshold):",
    ]
    for ecosystem, p in params.items():
        signals = ", ".join(f"{s}: {v['median']:+.4f} / {v['scale']:.4f}" for s, v in p["signals"].items())
        lines.append(f"  {ecosystem:9} {signals}  | threshold {p['threshold']:.2f}  ({p['calibrationPlots']} plots)")
    lines += ["", "Evaluation (plot-year flagged if any 2021 quarter is an anomaly):",
              f"  {'':42} " + "  ".join(f"{column:>18}" for column in columns)]
    rows = [
        ("Real mangrove loss detected (MM, ID)", "mangrove_loss_2021_detected"),
        ("Intact mangroves wrongly blocked (MM, ID)", "mangrove_intact_false_block_sea"),
        *[(f"Healthy {e} wrongly blocked (held-out)", f"{e}_healthy_false_block_heldout") for e in ECOSYSTEMS],
    ]
    for label, key in rows:
        lines.append(f"  {label:42} " + "  ".join(f"{fmt(results[c][1][key]):>18}" for c in columns))
    lines += ["", "max  = any one signal can raise the alarm; mean = the signals must agree on damage;",
              "used = the per-ecosystem choice saved for the API.",
              "No public loss map exists for saltmarsh or seagrass, so their detection rate is not measured."]
    report = "\n".join(lines)
    print("\n" + report)

    PARAMS_PATH.parent.mkdir(parents=True, exist_ok=True)
    PARAMS_PATH.write_text(json.dumps({
        "trainedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "targetFalseBlockRate": TARGET_FALSE_BLOCK,
        "ecosystems": params,
        "evaluation": evaluation,
    }, indent=2), encoding="utf-8")
    (PARAMS_PATH.parent / "anomaly_detector_report.txt").write_text(report + "\n", encoding="utf-8")
    print(f"\nSaved parameters to {PARAMS_PATH}")


if __name__ == "__main__":
    main()
