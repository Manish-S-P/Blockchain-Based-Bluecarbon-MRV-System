"""Baseline: how much would the plot's tree carbon have changed without the project?

Method: synthetic control (Abadie et al.), kept simple for this prototype.

1. Donors: up to N_CANDIDATES mangrove pixels 1-30 km from the plot that are not in the
   registry (GMW 2020 + WorldCover mangrove mask, other registered plots excluded).
2. For each of the 4 quarters before day 0 ("pre-period"), the same carbon model gives
   tree carbon for the plot and for every donor, now and in the same season a year earlier.
3. Weights: non-negative, summing to 1, chosen so the weighted donors match the plot's
   carbon level AND its year-on-year change in each pre-period quarter as closely as
   possible (matching changes too limits overfitting with only 4 quarters).
4. Forecast: for each season, the baseline change over the coming year is the weighted
   donors' change over the past year in that season ("they keep doing what they did").
5. At month 12, `actual_change` measures what the same donors really did, so the crediting
   step can use whichever is larger (never credit growth that would have happened anyway).
"""

from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import date, timedelta

import numpy as np
from scipy.optimize import minimize

from .carbon import CarbonModel, estimate_points
from .earth_engine import HEIGHT_IMAGE_FEATURES, build_height_feature_image, mangrove_mask
from .gee_service import NO_DATA, _one_year_earlier, _plot_polygon, window_quarter

N_CANDIDATES = 80
N_DONORS = 25          # closest candidates kept for weighting
RING_KM = (1.0, 30.0)  # donors are at least 1 km and at most 30 km away
SCALE_M = 30


@dataclass
class Donor:
    longitude: float
    latitude: float
    levels: list = field(default_factory=list)       # tree CO2 mid per pre quarter (t/ha)
    changes: list = field(default_factory=list)      # change vs same season a year earlier
    half_widths: list = field(default_factory=list)  # 90% half-width of that change
    weight: float = 0.0


def candidate_donors(coordinates: list[list[float]], exclude_polygons: list[list[list[float]]],
                     n: int = N_CANDIDATES, seed: int = 7) -> list[tuple[float, float]]:
    import ee

    plot = _plot_polygon(coordinates)
    centre = plot.centroid(1)
    ring = centre.buffer(RING_KM[1] * 1000).difference(centre.buffer(RING_KM[0] * 1000), 10)
    for polygon in exclude_polygons:
        if len(polygon) >= 3:
            ring = ring.difference(_plot_polygon(polygon).buffer(100), 10)
    points = (
        ee.Image(1).rename("cls").toInt().updateMask(mangrove_mask())
        .stratifiedSample(numPoints=n, classBand="cls", region=ring, scale=SCALE_M, seed=seed,
                          geometries=True, tileScale=16)
        .getInfo()["features"]
    )
    return [tuple(p["geometry"]["coordinates"]) for p in points]


def _point_rows(points: list[tuple[float, float]], start: date, end: date) -> tuple[list[dict], list[dict]]:
    """Height features at each point for [start, end) and the same window a year earlier."""
    import ee

    collection = ee.FeatureCollection([ee.Feature(ee.Geometry.Point(list(p)), {"idx": i}) for i, p in enumerate(points)])
    region = collection.geometry().bounds()
    prev_start, prev_end = _one_year_earlier(start), _one_year_earlier(end)
    stack = ee.Image.cat([
        build_height_feature_image(start.isoformat(), end.isoformat(), region).rename([f"c_{n}" for n in HEIGHT_IMAGE_FEATURES]),
        build_height_feature_image(prev_start.isoformat(), prev_end.isoformat(), region).rename([f"p_{n}" for n in HEIGHT_IMAGE_FEATURES]),
    ]).unmask(NO_DATA)
    sampled = stack.sampleRegions(collection=collection, scale=SCALE_M, tileScale=16).getInfo()["features"]

    quarter = window_quarter(start, end)
    current, previous = [{} for _ in points], [{} for _ in points]
    for feature in sampled:
        props = feature["properties"]
        i = int(props["idx"])
        for prefix, target in (("c_", current), ("p_", previous)):
            target[i] = {n: (None if props.get(f"{prefix}{n}") in (None, NO_DATA) else props[f"{prefix}{n}"])
                         for n in HEIGHT_IMAGE_FEATURES}
            target[i]["quarter"] = quarter
    return current, previous


def donor_quarter(model: CarbonModel, points: list[tuple[float, float]], start: date, end: date) -> list[dict | None]:
    """Per donor: tree carbon now and a year earlier for one window, or None if not usable."""
    current, previous = _point_rows(points, start, end)
    now = estimate_points(model, current, points)
    before = estimate_points(model, previous, points)
    out = []
    for a, b in zip(now, before):
        if a is None or b is None or not (a["applicable"] and b["applicable"]):
            out.append(None)
            continue
        half = np.hypot((a["high"] - a["low"]) / 2, (b["high"] - b["low"]) / 2)
        out.append({"level": a["mid"], "change": a["mid"] - b["mid"], "half_width": float(half)})
    return out


def fit_weights(plot_levels: np.ndarray, donor_levels: np.ndarray) -> np.ndarray:
    """Synthetic-control weights: w >= 0, sum(w) = 1, minimising ||plot - donors @ w||^2."""
    n = donor_levels.shape[1]
    objective = lambda w: float(np.sum((plot_levels - donor_levels @ w) ** 2))
    result = minimize(objective, np.full(n, 1.0 / n), method="SLSQP", bounds=[(0.0, 1.0)] * n,
                      constraints=[{"type": "eq", "fun": lambda w: np.sum(w) - 1.0}])
    weights = np.clip(result.x, 0, None)
    return weights / weights.sum()


def build_baseline(model: CarbonModel, plot_quarters: list[dict | None], coordinates: list[list[float]],
                   pre_windows: list[tuple[date, date]], exclude_polygons: list[list[list[float]]]) -> dict:
    """`plot_quarters`: per pre window, the plot's carbon estimate dict (treeCo2 mid etc.) or None."""
    points = candidate_donors(coordinates, exclude_polygons)
    if len(points) < 5:
        return {"status": "insufficient_donors", "reason": f"Only {len(points)} unenrolled mangrove pixels found within {RING_KM[1]:.0f} km."}

    with ThreadPoolExecutor(4) as pool:
        per_window = list(pool.map(lambda w: donor_quarter(model, points, *w), pre_windows))

    # Use pre-period quarters where the plot has an estimate; keep donors complete in all of them.
    quarters = [k for k, q in enumerate(plot_quarters) if q is not None]
    if len(quarters) < 2:
        return {"status": "insufficient_data", "reason": "The plot had fewer than 2 clear quarters in the year before day 0."}
    complete = [j for j in range(len(points)) if all(per_window[k][j] is not None for k in quarters)]
    if len(complete) < 5:
        return {"status": "insufficient_donors", "reason": f"Only {len(complete)} donors had clear data in every pre-period quarter."}

    plot_levels = np.array([plot_quarters[k]["mid"] for k in quarters])
    plot_changes = np.array([plot_quarters[k]["change"] for k in quarters])
    levels = np.array([[per_window[k][j]["level"] for j in complete] for k in quarters])    # (quarters, donors)
    changes = np.array([[per_window[k][j]["change"] for j in complete] for k in quarters])
    target = np.concatenate([plot_levels, plot_changes])
    donor_matrix = np.vstack([levels, changes])
    # Keep the donors closest to the plot on levels and changes, then weight them.
    closest = np.argsort(np.linalg.norm(donor_matrix - target[:, None], axis=0))[:N_DONORS]
    chosen = [complete[i] for i in closest]
    weights = fit_weights(target, donor_matrix[:, closest])
    synthetic = levels[:, closest] @ weights
    synthetic_changes = changes[:, closest] @ weights

    donors = []
    for w, j in zip(weights, chosen):
        donors.append(Donor(
            longitude=round(points[j][0], 6), latitude=round(points[j][1], 6), weight=round(float(w), 4),
            levels=[round(per_window[k][j]["level"], 2) for k in quarters],
            changes=[round(per_window[k][j]["change"], 2) for k in quarters],
            half_widths=[round(per_window[k][j]["half_width"], 2) for k in quarters],
        ))

    forecast = []
    for pos, k in enumerate(quarters):
        change = sum(d.weight * d.changes[pos] for d in donors)
        half = sum(d.weight * d.half_widths[pos] for d in donors)  # fully correlated: conservative
        forecast.append({"window": k, "season": window_quarter(*pre_windows[k]),
                         "change": round(change, 2), "halfWidth": round(half, 2)})

    return {
        "status": "ok",
        "method": "Synthetic control: weighted unenrolled mangrove donors matched on pre-period tree carbon; "
                  "forecast = donors' same-season change over the pre-period year.",
        "preWindows": [[s.isoformat(), (e - timedelta(days=1)).isoformat()] for s, e in pre_windows],
        "quartersUsed": [window_quarter(*pre_windows[k]) for k in quarters],
        "plotLevels": [round(float(v), 2) for v in plot_levels],
        "syntheticLevels": [round(float(v), 2) for v in synthetic],
        "plotChanges": [round(float(v), 2) for v in plot_changes],
        "syntheticChanges": [round(float(v), 2) for v in synthetic_changes],
        "fitRmse": round(float(np.sqrt(np.mean((target - np.concatenate([synthetic, synthetic_changes])) ** 2))), 2),
        "candidates": len(points),
        "donors": [d.__dict__ for d in donors if d.weight > 0.001],
        "forecast": forecast,
    }


def actual_change(model: CarbonModel, donors: list[dict], windows: list[tuple[date, date]]) -> list[dict]:
    """What the weighted donors really did in each monitoring window (for the month-12 check)."""
    points = [(d["longitude"], d["latitude"]) for d in donors]
    weights = np.array([d["weight"] for d in donors])
    with ThreadPoolExecutor(4) as pool:
        per_window = list(pool.map(lambda w: donor_quarter(model, points, *w), windows))
    out = []
    for (start, end), results in zip(windows, per_window):
        usable = [i for i, r in enumerate(results) if r is not None]
        if not usable or weights[usable].sum() < 0.5:
            out.append({"season": window_quarter(start, end), "status": "insufficient_data"})
            continue
        w = weights[usable] / weights[usable].sum()
        out.append({
            "season": window_quarter(start, end),
            "status": "ok",
            "change": round(float(sum(wi * results[i]["change"] for wi, i in zip(w, usable))), 2),
            "halfWidth": round(float(sum(wi * results[i]["half_width"] for wi, i in zip(w, usable))), 2),
            "donorWeightUsed": round(float(weights[usable].sum()), 3),
        })
    return out
