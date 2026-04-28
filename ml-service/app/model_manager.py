import math
import csv
from pathlib import Path
from dataclasses import dataclass

import numpy as np


VEG_TO_ID = {
    "mangrove": 0,
    "seagrass": 1,
    "saltmarsh": 2,
}

ID_TO_VEG = {v: k for k, v in VEG_TO_ID.items()}
KNOWN_CLASSES = ("mangrove", "seagrass", "saltmarsh", "other")


def _distance(a: list[float], b: list[float]) -> float:
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)


def _polygon_area_estimate(coords: list[list[float]]) -> float:
    if len(coords) < 3:
        return 0.0
    area = 0.0
    for i in range(len(coords)):
        x1, y1 = coords[i]
        x2, y2 = coords[(i + 1) % len(coords)]
        area += x1 * y2 - x2 * y1
    return abs(area) * 0.5


def derive_features(
    vegetation_type: str,
    area_hectares: float,
    coords: list[list[float]],
    previous_ndvis: list[float],
) -> np.ndarray:
    veg_id = VEG_TO_ID.get(vegetation_type, 0)
    coord_count = float(len(coords))
    perimeter = 0.0
    for i in range(len(coords)):
        perimeter += _distance(coords[i], coords[(i + 1) % len(coords)])
    polygon_area = _polygon_area_estimate(coords)
    historical_mean = float(np.mean(previous_ndvis)) if previous_ndvis else 0.55
    historical_std = float(np.std(previous_ndvis)) if previous_ndvis else 0.08
    cycle_count = float(len(previous_ndvis))
    return np.array(
        [
            veg_id,
            area_hectares,
            coord_count,
            perimeter,
            polygon_area,
            historical_mean,
            historical_std,
            cycle_count,
        ],
        dtype=float,
    )


@dataclass
class MlvOutput:
    ndvi: float
    ecosystem_matches_claim: bool
    identified_ecosystem: str
    ecosystem_confidence: float
    anomaly_detected: bool
    estimated_co2_tonnes: float
    source: str


class ModelManager:
    def __init__(self) -> None:
        self.rng = np.random.default_rng(42)
        self._centroids: dict[str, np.ndarray] = {}
        self._class_counts: dict[str, int] = {}
        self._class_radius: dict[str, float] = {}
        self._load_label_dataset()

    def _load_label_dataset(self) -> None:
        dataset_path = Path(__file__).resolve().parents[1] / "training_labels.csv"
        if not dataset_path.exists():
            return

        class_points: dict[str, list[list[float]]] = {name: [] for name in KNOWN_CLASSES}
        with dataset_path.open("r", encoding="utf-8") as fp:
            reader = csv.DictReader(fp)
            for row in reader:
                class_name = (row.get("class_name") or "").strip().lower()
                if class_name not in class_points:
                    continue
                try:
                    lat = float(row["latitude"])
                    lon = float(row["longitude"])
                except (TypeError, ValueError, KeyError):
                    continue
                class_points[class_name].append([lat, lon])

        for class_name, points in class_points.items():
            if not points:
                continue
            points_np = np.array(points, dtype=float)
            centroid = points_np.mean(axis=0)
            self._centroids[class_name] = centroid
            self._class_counts[class_name] = points_np.shape[0]
            distances = np.linalg.norm(points_np - centroid, axis=1)
            # Typical in-class spread; used to detect out-of-distribution locations.
            self._class_radius[class_name] = float(np.median(distances) + (2.0 * np.std(distances)))

    def _predict_ecosystem_from_location(self, coordinates: list[list[float]]) -> tuple[str, float] | None:
        if len(coordinates) == 0 or not self._centroids:
            return None

        # Coordinates come as [lat, lon]. Use polygon centroid estimate.
        lats = [point[0] for point in coordinates if len(point) >= 2]
        lons = [point[1] for point in coordinates if len(point) >= 2]
        if not lats or not lons:
            return None
        query = np.array([float(np.mean(lats)), float(np.mean(lons))], dtype=float)

        class_distances: dict[str, float] = {}
        for class_name, centroid in self._centroids.items():
            dist = float(np.linalg.norm(query - centroid))
            class_distances[class_name] = dist

        ordered = sorted(class_distances.items(), key=lambda item: item[1])
        best_name, best_dist = ordered[0]
        second_dist = ordered[1][1] if len(ordered) > 1 else best_dist + 1.0
        radius = self._class_radius.get(best_name, 0.25)
        if best_name != "other" and best_dist > max(0.2, radius * 1.75):
            best_name = "other"
            best_dist = class_distances.get("other", best_dist)
        margin = max(0.0, second_dist - best_dist)
        confidence = float(np.clip(0.5 + min(margin, 1.0) * 0.5, 0.5, 0.99))
        return best_name, confidence

    def infer(
        self,
        vegetation_type: str,
        area: float,
        coordinates: list[list[float]],
        previous_ndvis: list[float],
        ndvi_override: float | None = None,
    ) -> MlvOutput:
        features = derive_features(vegetation_type, area, coordinates, previous_ndvis).reshape(1, -1)
        historical_mean = features[0, 5]
        historical_std = features[0, 6]
        coord_count = features[0, 2]
        perimeter = features[0, 3]
        area_shape = max(features[0, 4], 1e-6)

        # ── NDVI resolution ───────────────────────────────────────────────
        if ndvi_override is None:
            base_ndvi = features[0, 5] if len(previous_ndvis) > 0 else 0.55
            noise = float(self.rng.normal(0.0, 0.05))
            ndvi = float(np.clip(base_ndvi + noise, -1.0, 1.0))
            source = "fastapi-ml-service-synthetic-ndvi"
        else:
            ndvi = float(np.clip(ndvi_override, -1.0, 1.0))
            source = "fastapi-ml-service-gee-ndvi"

        # ── Ecosystem classifier ──────────────────────────────────────────
        # NDVI thresholds for vegetation vs non-vegetation.
        # Healthy mangrove/seagrass/saltmarsh typically > 0.25 NDVI.
        # Buildings, roads, bare soil, water bodies are usually < 0.2.
        MIN_VEGETATION_NDVI = 0.20
        WEAK_VEGETATION_NDVI = 0.30

        predicted = self._predict_ecosystem_from_location(coordinates)
        if predicted is not None:
            predicted_veg, confidence = predicted
            ecosystem_matches = predicted_veg == vegetation_type
        else:
            predicted_veg_id = int(np.clip(round((historical_mean - 0.2) * 3), 0, 2))
            predicted_veg = ID_TO_VEG[predicted_veg_id]
            confidence = 0.55
            ecosystem_matches = predicted_veg == vegetation_type or self.rng.random() > 0.18

        # Cross-check with NDVI: if NDVI too low, it's not a vegetated ecosystem
        # regardless of what the location classifier says. This catches buildings,
        # urban areas, bare soil, etc. near known coastal ecosystems.
        if ndvi < MIN_VEGETATION_NDVI and predicted_veg != "other":
            predicted_veg = "other"
            ecosystem_matches = False
            confidence = max(confidence, 0.85)  # high confidence it's NOT an ecosystem
        elif ndvi < WEAK_VEGETATION_NDVI and predicted_veg != "other":
            # Low-vegetation zone — reduce confidence and flag potential mismatch
            confidence = min(confidence, 0.55)
            if vegetation_type not in ("mangrove", "seagrass", "saltmarsh"):
                ecosystem_matches = False
                predicted_veg = "other"

        # ── Anomaly detection ─────────────────────────────────────────────
        compactness = (perimeter ** 2) / area_shape if area_shape > 0 else 0
        anomaly_score = (historical_std * 4.5) + (0.03 * max(compactness - 30, 0)) + (0.06 * max(3 - coord_count, 0))
        # Also flag as anomaly if someone claims a coastal ecosystem but NDVI
        # indicates non-vegetated land (buildings, roads, etc.)
        if ndvi < MIN_VEGETATION_NDVI and vegetation_type in ("mangrove", "seagrass", "saltmarsh"):
            anomaly_score += 0.5
        anomaly_detected = anomaly_score > 0.85

        # ── CO₂ estimate ──────────────────────────────────────────────────
        density_map = {0: 1.35, 1: 1.10, 2: 0.95}
        density = density_map[VEG_TO_ID.get(vegetation_type, 0)]
        # Non-ecosystem plots should get near-zero credits
        if predicted_veg == "other" or not ecosystem_matches:
            estimated_co2 = 0.0
        else:
            estimated_co2 = float(max(0.0, area * 0.8 * density * max(ndvi, 0.1)))

        return MlvOutput(
            ndvi=round(ndvi, 4),
            ecosystem_matches_claim=ecosystem_matches,
            identified_ecosystem=predicted_veg,
            ecosystem_confidence=round(float(confidence), 4),
            anomaly_detected=anomaly_detected,
            estimated_co2_tonnes=round(estimated_co2, 4),
            source=source,
        )
