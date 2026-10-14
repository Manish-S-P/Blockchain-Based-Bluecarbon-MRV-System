"""Trains and evaluates the mangrove canopy-height model behind the carbon estimate.

Target: GEDI L2A RH98 laser height (m). Features: same-quarter Sentinel-1/2 and elevation
(see app/earth_engine.py HEIGHT_FEATURES). Model: quantile random forest (app/carbon.py).

Evaluation is spatial, so it reflects new plots in new places:
  - 5-fold cross-validation grouped by ~5 km blocks (no block in both train and test);
  - leave-one-region-out (each region predicted by a model that never saw it);
  - random 5-fold CV, reported only to show how much random splits inflate scores.
Intervals: conformalised quantile regression (Romano et al. 2019) on the out-of-block
predictions, so the stated 90% interval really covers ~90% of unseen GEDI heights.

Usage (from ml-service/):
    .venv/bin/python -m training.train_height
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
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupKFold, KFold, LeaveOneGroupOut

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.carbon import (  # noqa: E402
    INTERVAL, METADATA_PATH, MODEL_PATH, ApplicabilityArea, QuantileForest, agb_to_co2, climate_zone, height_to_agb,
)
from app.earth_engine import HEIGHT_FEATURES  # noqa: E402

TARGET = "rh98"
BLOCK_DEG = 0.05  # ~5 km
ALPHA = 0.10      # 90% intervals
FOREST_PARAMS = dict(n_estimators=200, min_samples_leaf=5, max_features=0.4, n_jobs=-1, random_state=42)


def make_model() -> QuantileForest:
    return QuantileForest(**FOREST_PARAMS)


def metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    return {
        "r2": round(float(r2_score(y_true, y_pred)), 3),
        "rmse": round(rmse, 2),
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 2),
        "bias": round(float(np.mean(y_pred - y_true)), 2),
        "relative_rmse": round(rmse / float(np.mean(y_true)), 3),
    }


def out_of_fold(X: np.ndarray, y: np.ndarray, splits) -> np.ndarray:
    """Quantile predictions for every sample from a model that did not train on it."""
    preds = np.empty((len(y), len(INTERVAL)))
    for train_idx, test_idx in splits:
        model = make_model().fit(X[train_idx], y[train_idx])
        preds[test_idx] = model.predict_quantiles(X[test_idx])
    return preds


def conformal_margin(y: np.ndarray, q_low: np.ndarray, q_high: np.ndarray, alpha: float = ALPHA) -> float:
    """CQR: widen [q_low, q_high] by this many metres to reach 1 - alpha coverage."""
    scores = np.maximum(q_low - y, y - q_high)
    n = len(scores)
    level = min(1.0, np.ceil((n + 1) * (1 - alpha)) / n)
    return float(np.quantile(scores, level))


def build_aoa(X: np.ndarray, importances: np.ndarray, groups: np.ndarray, rng: np.random.Generator) -> ApplicabilityArea:
    """Area of applicability (Meyer & Pebesma 2021) with importance-weighted, standardised features."""
    mean, std = X.mean(axis=0), X.std(axis=0) + 1e-9
    scaled = (X - mean) / std * importances
    sample = scaled[rng.choice(len(scaled), size=min(2000, len(scaled)), replace=False)]
    diffs = np.linalg.norm(sample[:, None, :] - sample[None, :, :], axis=-1)
    mean_distance = float(diffs[np.triu_indices(len(sample), 1)].mean())

    # Training dissimilarity: distance to the nearest point in *other* spatial blocks.
    from sklearn.neighbors import NearestNeighbors
    train_di = np.empty(len(X))
    for train_idx, test_idx in GroupKFold(5).split(X, groups=groups):
        nn = NearestNeighbors(n_neighbors=1).fit(scaled[train_idx])
        train_di[test_idx] = nn.kneighbors(scaled[test_idx])[0][:, 0] / mean_distance
    q1, q3 = np.percentile(train_di, [25, 75])
    threshold = float(min(train_di.max(), q3 + 1.5 * (q3 - q1)))
    return ApplicabilityArea(mean=mean, std=std, weights=importances, train_points=scaled,
                             mean_distance=mean_distance, threshold=threshold)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", default=str(Path(__file__).resolve().parent / "data" / "height_samples.csv"))
    args = parser.parse_args()
    rng = np.random.default_rng(42)

    data = pd.read_csv(args.data).dropna(subset=[f for f in HEIGHT_FEATURES if f != "quarter"] + [TARGET])
    data = data.reset_index(drop=True)
    X = data[HEIGHT_FEATURES].to_numpy(np.float32)
    y = data[TARGET].to_numpy(float)
    blocks = (np.floor(data["longitude"] / BLOCK_DEG).astype(int).astype(str) + "_"
              + np.floor(data["latitude"] / BLOCK_DEG).astype(int).astype(str)).to_numpy()
    regions = data["region"].to_numpy()
    print(f"{len(data)} GEDI shots, {data['region'].nunique()} regions, {len(set(blocks))} spatial blocks")

    print("Spatial-block CV...", flush=True)
    oof_block = out_of_fold(X, y, GroupKFold(5).split(X, groups=blocks))
    print("Leave-one-region-out...", flush=True)
    oof_region = out_of_fold(X, y, LeaveOneGroupOut().split(X, groups=regions))
    print("Random CV (for comparison only)...", flush=True)
    oof_random = out_of_fold(X, y, KFold(5, shuffle=True, random_state=0).split(X))

    margin = conformal_margin(y, oof_block[:, 0], oof_block[:, 2])
    covered = lambda q, m: float(np.mean((y >= q[:, 0] - m) & (y <= q[:, 2] + m)))

    # Biomass and CO2 implied by observed vs predicted heights (same allometry both sides).
    zones = [climate_zone(lon, lat) for lon, lat in zip(data["longitude"], data["latitude"])]
    co2 = lambda h: np.array([agb_to_co2(height_to_agb(v), z)["total"] for v, z in zip(h, zones)], dtype=float)
    co2_obs, co2_pred = co2(y), co2(oof_block[:, 1])

    per_region = {}
    for region in sorted(set(regions)):
        mask = regions == region
        per_region[region] = {
            "shots": int(mask.sum()),
            "gedi_median_height_m": round(float(np.median(y[mask])), 2),
            "predicted_median_height_m": round(float(np.median(oof_region[mask, 1])), 2),
            "leave_region_out": metrics(y[mask], oof_region[mask, 1]),
            "interval_coverage": round(float(np.mean((y[mask] >= oof_block[mask, 0] - margin)
                                                       & (y[mask] <= oof_block[mask, 2] + margin))), 3),
        }

    print("Final model + SHAP + area of applicability...", flush=True)
    final = make_model().fit(X, y)
    importances = final.forest.feature_importances_
    aoa = build_aoa(X, importances, blocks, rng)

    import shap
    sample_idx = rng.choice(len(X), size=min(1500, len(X)), replace=False)
    shap_values = shap.TreeExplainer(final.forest).shap_values(
        pd.DataFrame(X[sample_idx], columns=HEIGHT_FEATURES), check_additivity=False)
    shap_importance = dict(sorted(zip(HEIGHT_FEATURES, np.abs(shap_values).mean(axis=0).round(3).tolist()),
                                  key=lambda kv: -kv[1]))

    evaluation = {
        "spatial_block_cv": metrics(y, oof_block[:, 1]),
        "leave_one_region_out": metrics(y, oof_region[:, 1]),
        "random_cv_inflated": metrics(y, oof_random[:, 1]),
        "co2_t_ha_spatial_block_cv": metrics(co2_obs, co2_pred),
        "interval_90_coverage_raw": round(covered(oof_block, 0.0), 3),
        "interval_90_coverage_conformal": round(covered(oof_block, margin), 3),
        "interval_90_coverage_leave_region_out": round(covered(oof_region, margin), 3),
        "conformal_margin_m": round(margin, 3),
        "mean_interval_width_m": round(float(np.mean(oof_block[:, 2] - oof_block[:, 0] + 2 * margin)), 2),
    }

    lines = [
        "MANGROVE CANOPY HEIGHT MODEL (carbon model step 1) - EVALUATION",
        "=" * 64,
        f"Trained at: {datetime.now(timezone.utc).isoformat(timespec='seconds')}",
        f"Data: {len(data)} GEDI L2A RH98 shots, {data['region'].nunique()} regions, quarters 2019-2025",
        f"Target height: mean {y.mean():.2f} m, median {np.median(y):.2f} m",
        "",
        "Accuracy of predicted height against GEDI laser height (m):",
        f"  {'':28} {'R2':>6} {'RMSE':>6} {'MAE':>6} {'bias':>6} {'rel.RMSE':>9}",
    ]
    for label, key in [("Spatial blocks (~5 km)", "spatial_block_cv"), ("Leave one region out", "leave_one_region_out"),
                       ("Random CV (inflated)", "random_cv_inflated")]:
        m = evaluation[key]
        lines.append(f"  {label:28} {m['r2']:>6} {m['rmse']:>6} {m['mae']:>6} {m['bias']:>6} {m['relative_rmse']:>9}")
    c = evaluation["co2_t_ha_spatial_block_cv"]
    lines += [
        "",
        f"Same error expressed as tree carbon (t CO2/ha, via the allometry): RMSE {c['rmse']}, bias {c['bias']}, R2 {c['r2']}",
        "",
        f"90% intervals: raw quantile forest covers {evaluation['interval_90_coverage_raw']:.1%}; after conformal "
        f"calibration (+{margin:.2f} m) {evaluation['interval_90_coverage_conformal']:.1%} (spatial blocks), "
        f"{evaluation['interval_90_coverage_leave_region_out']:.1%} on left-out regions. "
        f"Mean interval width {evaluation['mean_interval_width_m']} m.",
        "",
        "Per region (leave-one-region-out):",
        f"  {'region':22} {'shots':>6} {'GEDI med':>9} {'pred med':>9} {'RMSE':>6} {'bias':>6} {'90% cov':>8}",
    ]
    for region, r in per_region.items():
        lines.append(f"  {region:22} {r['shots']:>6} {r['gedi_median_height_m']:>9} {r['predicted_median_height_m']:>9} "
                     f"{r['leave_region_out']['rmse']:>6} {r['leave_region_out']['bias']:>6} {r['interval_coverage']:>8.1%}")
    lines += ["", "Most influential features (mean |SHAP|, metres of height):"]
    lines += [f"  {name:12} {value}" for name, value in list(shap_importance.items())[:10]]
    lines += ["", f"Area of applicability threshold (dissimilarity index): {aoa.threshold:.3f}"]
    report = "\n".join(lines)
    print("\n" + report)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": final, "X_train": X, "features": HEIGHT_FEATURES, "conformal_margin_m": margin, "aoa": aoa},
                MODEL_PATH, compress=3)
    METADATA_PATH.write_text(json.dumps({
        "trainedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sklearnVersion": sklearn.__version__,
        "target": "GEDI L2A RH98 canopy height (m)",
        "features": HEIGHT_FEATURES,
        "samples": int(len(data)),
        "regions": sorted(set(regions)),
        "forestParams": FOREST_PARAMS,
        "evaluation": evaluation,
        "perRegion": per_region,
        "shapImportance": shap_importance,
        "aoaThreshold": aoa.threshold,
    }, indent=2), encoding="utf-8")
    (MODEL_PATH.parent / "canopy_height_report.txt").write_text(report + "\n", encoding="utf-8")
    print(f"\nSaved {MODEL_PATH}")


if __name__ == "__main__":
    main()
